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
import {
  cloneRepository,
  extractZip,
  cleanupSandbox,
  parseMultipartUpload,
  isValidGitUrl,
} from './services/repoIngestionService';

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

/**
 * Recursively collects all TypeScript / JavaScript source files under a
 * project root, skipping node_modules, .git, dist, build, and coverage dirs.
 */
function collectSourceFiles(dir: string): string[] {
  const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', 'out']);
  const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
  const results: string[] = [];

  function walk(current: string): void {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(current, { withFileTypes: true }); }
    catch { return; }

    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && SOURCE_EXTS.has(path.extname(entry.name).toLowerCase())) {
        results.push(full);
      }
    }
  }

  walk(dir);
  return results;
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

  // ── POST /api/clone-repo → clone a GitHub / HTTPS repo then run pipeline ──
  if (method === 'POST' && urlPath === '/api/clone-repo') {
    let sandboxPath: string | null = null;
    try {
      const body        = await readJsonBody(req);
      const repoUrl     = body.repoUrl     as string | undefined;
      const branch      = body.branch      as string | undefined;
      const triggerKind = (body.triggerKind as string | undefined) ?? 'GIT_DIFF';

      if (!repoUrl || !isValidGitUrl(repoUrl)) {
        sendJson(res, 400, { ok: false, error: 'repoUrl must be a valid https:// git URL' });
        return;
      }

      console.log(`[API] POST /api/clone-repo | url=${repoUrl} | branch=${branch ?? 'default'} | trigger=${triggerKind}`);
      const { sandboxPath: sp, repoName } = await cloneRepository(repoUrl, branch);
      sandboxPath = sp;

      console.log(`[API] Cloned "${repoName}" into sandbox: ${sandboxPath}`);

      // Collect all source files recursively — no src/ assumption
      const allFiles = collectSourceFiles(sandboxPath);
      console.log(`[API] Found ${allFiles.length} source file(s) in cloned repo`);

      let report;
      if (triggerKind === 'CVE_ADVISORY') {
        // For external repos, pass all discovered source files so every agent
        // can scan the full codebase rather than relying on glob patterns alone.
        const trigger: CVEAdvisoryTrigger = { ...buildCveTrigger(sandboxPath), allSourceFiles: allFiles };
        const result = await runPipeline(trigger, process.cwd());
        report = result.report;
      } else {
        const { changedFiles, diff } = await inspectRepoChanges(sandboxPath);
        // Fall back to all source files if git reports nothing (fresh clone = no dirty state)
        const files = changedFiles.length > 0 ? changedFiles : allFiles;
        const trigger = buildBlastTrigger(sandboxPath, files);
        const result  = await runPipeline(trigger, process.cwd(), diff);
        report = result.report;
      }

      sendJson(res, 200, { ok: true, report, repoName, sandboxPath });
    } catch (err) {
      console.error('[API] clone-repo error:', (err as Error).message);
      sendJson(res, 500, { ok: false, error: (err as Error).message });
    } finally {
      if (sandboxPath) cleanupSandbox(sandboxPath);
    }
    return;
  }

  // ── POST /api/upload-zip → extract a ZIP upload then run pipeline ─────────
  if (method === 'POST' && urlPath === '/api/upload-zip') {
    let sandboxPath: string | null = null;
    try {
      console.log('[API] POST /api/upload-zip — parsing multipart upload');
      const { file, fields } = await parseMultipartUpload(req);
      const triggerKind = fields.triggerKind ?? 'GIT_DIFF';

      if (!file.fileName.endsWith('.zip') && file.mimeType !== 'application/zip') {
        sendJson(res, 400, { ok: false, error: 'Only .zip archives are accepted' });
        return;
      }

      const { sandboxPath: sp, repoName } = extractZip(file.buffer, file.fileName);
      sandboxPath = sp;

      console.log(`[API] Extracted "${repoName}" into sandbox: ${sandboxPath}`);

      const allFiles = collectSourceFiles(sandboxPath);
      console.log(`[API] Found ${allFiles.length} source file(s) in extracted ZIP`);

      let report;
      if (triggerKind === 'CVE_ADVISORY') {
        const trigger: CVEAdvisoryTrigger = { ...buildCveTrigger(sandboxPath), allSourceFiles: allFiles };
        const result = await runPipeline(trigger, process.cwd());
        report = result.report;
      } else {
        const { changedFiles, diff } = await inspectRepoChanges(sandboxPath);
        const files = changedFiles.length > 0 ? changedFiles : allFiles;
        const trigger = buildBlastTrigger(sandboxPath, files);
        const result  = await runPipeline(trigger, process.cwd(), diff);
        report = result.report;
      }

      sendJson(res, 200, { ok: true, report, repoName, sandboxPath: '[cleaned]' });
    } catch (err) {
      console.error('[API] upload-zip error:', (err as Error).message);
      sendJson(res, 500, { ok: false, error: (err as Error).message });
    } finally {
      if (sandboxPath) cleanupSandbox(sandboxPath);
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

// ─── Resilience: keep the server alive on unhandled errors ───────────────────

process.on('uncaughtException', (err) => {
  console.error('[SentinelDev] Uncaught exception (server kept alive):', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[SentinelDev] Unhandled rejection (server kept alive):', reason);
});

// ─── Start ───────────────────────────────────────────────────────────────────

// Allow up to 10 minutes for long clone + analysis runs.
// The browser will still show a spinner; the server won't drop the connection.
server.timeout = 10 * 60 * 1000; // 10 min
server.requestTimeout = 10 * 60 * 1000;
server.headersTimeout = 10 * 60 * 1000 + 1000;

server.listen(PORT, () => {
  console.log(`SentinelDev Dashboard running at http://localhost:${PORT}`);
});

export default server;
