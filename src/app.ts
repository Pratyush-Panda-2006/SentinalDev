/**
 * SentinelDev Dashboard Server
 *
 * Serves the static dashboard UI and exposes API endpoints for running the
 * pipeline in-memory, returning JSON reports to the browser.
 *
 * Uses only Node built-ins (http, fs, path) — no Express dependency needed.
 *
 * Start:
 *   npm run ui    → tsx src/app.ts           (production-like, single run)
 *   npm run dev   → tsx watch src/app.ts     (hot-reload on file changes)
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

import { runPipeline } from './orchestrator';
import { seedMockTarget } from './seed';
import { CVEAdvisoryTrigger, GitDiffTrigger } from './types/index';
import { inspectRepoChanges } from './services/gitService';

const PORT = 3000;
const PUBLIC_DIR = path.resolve(__dirname, 'public');

// ─── MIME types ──────────────────────────────────────────────────────────────

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

// ─── Static file helper ───────────────────────────────────────────────────────

function serveStatic(
  filePath: string,
  res: http.ServerResponse
): void {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] ?? 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

// ─── JSON response helper ─────────────────────────────────────────────────────

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

// ─── Trigger builders ─────────────────────────────────────────────────────────

function buildCveTrigger(projectRoot?: string): CVEAdvisoryTrigger {
  const root = projectRoot ?? path.resolve(__dirname, '..', 'mock-target');
  return {
    kind: 'CVE_ADVISORY',
    cveId: 'CVE-2024-DEMO01',
    packageName: 'crypto-utils',
    affectedVersionRange: '<2.0.0',
    deprecatedMethods: { encryptMD5: 'encryptSHA256' },
    projectRoot: root,
  };
}

function buildBlastTrigger(projectRoot: string, changedFiles: string[]): GitDiffTrigger {
  return {
    kind: 'GIT_DIFF',
    changedFiles,
    projectRoot,
  };
}

/** Read the entire POST body as a string, then parse as JSON (best-effort). */
async function readJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

/** Resolve a user-supplied repo path to an absolute path, falling back to mock-target. */
function resolveProjectRoot(repoPath: unknown): string {
  if (typeof repoPath === 'string' && repoPath.trim()) {
    const candidate = path.resolve(repoPath.trim());
    if (fs.existsSync(candidate)) return candidate;
    console.warn(`[API] repoPath not found on disk: ${candidate} — falling back to mock-target`);
  }
  return path.resolve(__dirname, '..', 'mock-target');
}

// ─── Request handler ──────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const method = req.method ?? 'GET';
  const urlPath = req.url?.split('?')[0] ?? '/';

  // ── CORS preflight ─────────────────────────────────────────────────────────
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // ── GET / → serve dashboard ────────────────────────────────────────────────
  if (method === 'GET' && urlPath === '/') {
    serveStatic(path.join(PUBLIC_DIR, 'index.html'), res);
    return;
  }

  // ── GET static assets ──────────────────────────────────────────────────────
  if (method === 'GET') {
    // 1. Try public/ directory first
    const publicCandidate = path.join(PUBLIC_DIR, urlPath);
    if (publicCandidate.startsWith(PUBLIC_DIR) && fs.existsSync(publicCandidate)) {
      serveStatic(publicCandidate, res);
      return;
    }
    // 2. Serve generated report files from the project root
    const ROOT_DIR = path.resolve(__dirname, '..');
    const rootFile = path.basename(urlPath);
    if (
      (rootFile === 'sentinel-report.html' || rootFile === 'sentinel-pr-comment.md') &&
      urlPath === '/' + rootFile
    ) {
      const rootCandidate = path.join(ROOT_DIR, rootFile);
      if (fs.existsSync(rootCandidate)) {
        serveStatic(rootCandidate, res);
        return;
      }
    }
  }

  // ── POST /api/run-pipeline → CVE remediation OR Git-diff audit ────────────
  if (method === 'POST' && urlPath === '/api/run-pipeline') {
    try {
      const body = await readJsonBody(req);
      const triggerKind = body.triggerKind as string | undefined;
      const projectRoot  = resolveProjectRoot(body.repoPath);

      console.log(`[API] POST /api/run-pipeline | kind=${triggerKind ?? 'CVE_ADVISORY'} | root=${projectRoot}`);

      if (triggerKind === 'GIT_DIFF') {
        // ── Git-diff live audit ────────────────────────────────────────────
        console.log('[API] Inspecting git working tree...');
        const { changedFiles, diff } = await inspectRepoChanges(projectRoot);

        if (changedFiles.length === 0) {
          console.warn('[API] No TS/JS changes detected — falling back to mock changed files');
        }

        const files = changedFiles.length > 0
          ? changedFiles
          : ['src/lib/crypto-utils.ts', 'src/userService.ts', 'src/reportService.ts'];

        const trigger = buildBlastTrigger(projectRoot, files);
        console.log('[API] Running GIT_DIFF blast-radius audit...');
        const { report } = await runPipeline(trigger, path.resolve(__dirname, '..'), diff);
        sendJson(res, 200, { ok: true, report });
      } else {
        // ── CVE advisory pipeline (default) ──────────────────────────────
        seedMockTarget();
        const trigger = buildCveTrigger(projectRoot);
        console.log('[API] Running CVE pipeline...');
        const { report } = await runPipeline(trigger, path.resolve(__dirname, '..'));
        sendJson(res, 200, { ok: true, report });
      }
    } catch (err) {
      console.error('[API] Pipeline error:', (err as Error).message);
      sendJson(res, 500, { ok: false, error: (err as Error).message });
    }
    return;
  }

  // ── POST /api/run-blast-audit → legacy blast-radius-only audit ────────────
  if (method === 'POST' && urlPath === '/api/run-blast-audit') {
    try {
      const body = await readJsonBody(req);
      const projectRoot = resolveProjectRoot(body.repoPath);

      console.log(`[API] POST /api/run-blast-audit | root=${projectRoot}`);
      console.log('[API] Inspecting git working tree...');
      const { changedFiles, diff } = await inspectRepoChanges(projectRoot);

      const files = changedFiles.length > 0
        ? changedFiles
        : ['src/lib/crypto-utils.ts', 'src/userService.ts', 'src/reportService.ts'].map(
            (f) => path.resolve(projectRoot, f)
          );

      const trigger = buildBlastTrigger(projectRoot, files);
      console.log('[API] Running GIT_DIFF blast-radius audit...');
      const { report } = await runPipeline(trigger, path.resolve(__dirname, '..'), diff);
      sendJson(res, 200, { ok: true, report });
    } catch (err) {
      console.error('[API] Blast audit error:', (err as Error).message);
      sendJson(res, 500, { ok: false, error: (err as Error).message });
    }
    return;
  }

  // ── 404 ────────────────────────────────────────────────────────────────────
  sendJson(res, 404, { ok: false, error: `No route: ${method} ${urlPath}` });
});

// ─── Start ───────────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log(`SentinelDev Dashboard running at http://localhost:${PORT}`);
});

export default server;
