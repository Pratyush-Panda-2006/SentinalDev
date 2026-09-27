"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRequest = handleRequest;
const http = __importStar(require("http"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const orchestrator_1 = require("./orchestrator");
const seed_1 = require("./seed");
const gitService_1 = require("./services/gitService");
const repoIngestionService_1 = require("./services/repoIngestionService");
const geminiService_1 = require("./services/geminiService");
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const PUBLIC_DIR = path.resolve(__dirname, 'public');
const REPORTS_DIR = process.env.VERCEL ? os.tmpdir() : path.resolve(__dirname, '..');
// ─── MIME types ──────────────────────────────────────────────────────────────
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};
// ─── Static file helper ───────────────────────────────────────────────────────
function serveStatic(filePath, res) {
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
function sendJson(res, status, body) {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Content-Length': Buffer.byteLength(payload),
    });
    res.end(payload);
}
// ─── Trigger builders ─────────────────────────────────────────────────────────
function buildCveTrigger(projectRoot) {
    const root = projectRoot ?? (0, seed_1.getMockTargetRoot)();
    return {
        kind: 'CVE_ADVISORY',
        cveId: 'CVE-2024-DEMO01',
        packageName: 'crypto-utils',
        affectedVersionRange: '<2.0.0',
        deprecatedMethods: { encryptMD5: 'encryptSHA256' },
        projectRoot: root,
    };
}
function buildBlastTrigger(projectRoot, changedFiles) {
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
function collectSourceFiles(dir) {
    const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', 'out']);
    const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
    const results = [];
    function walk(current) {
        let entries;
        try {
            entries = fs.readdirSync(current, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            if (SKIP_DIRS.has(entry.name))
                continue;
            const full = path.join(current, entry.name);
            if (entry.isDirectory()) {
                walk(full);
            }
            else if (entry.isFile() && SOURCE_EXTS.has(path.extname(entry.name).toLowerCase())) {
                results.push(full);
            }
        }
    }
    walk(dir);
    return results;
}
/** Read the entire POST body as a string, then parse as JSON (best-effort). */
async function readJsonBody(req) {
    if (req.body) {
        if (typeof req.body === 'object' && req.body !== null) {
            return req.body;
        }
        if (typeof req.body === 'string') {
            try {
                return JSON.parse(req.body);
            }
            catch {
                return {};
            }
        }
    }
    return new Promise((resolve) => {
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            }
            catch {
                resolve({});
            }
        });
        req.on('error', () => resolve({}));
    });
}
/** Resolve a user-supplied repo path to an absolute path, falling back to mock-target. */
function resolveProjectRoot(repoPath) {
    if (typeof repoPath === 'string' && repoPath.trim()) {
        const candidate = path.resolve(repoPath.trim());
        if (fs.existsSync(candidate))
            return candidate;
        console.warn(`[API] repoPath not found on disk: ${candidate} — falling back to mock-target`);
    }
    return (0, seed_1.getMockTargetRoot)();
}
// ─── Request handler ──────────────────────────────────────────────────────────
// ─── Request handler ──────────────────────────────────────────────────────────
async function handleRequest(req, res) {
    const method = req.method ?? 'GET';
    const rawUrl = req.url?.split('?')[0] ?? '/';
    const urlPath = rawUrl;
    // ── CORS preflight ─────────────────────────────────────────────────────────
    if (method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        });
        res.end();
        return;
    }
    // ── Health check ───────────────────────────────────────────────────────────
    if (method === 'GET' && (urlPath === '/api/health' || urlPath === '/health')) {
        sendJson(res, 200, { ok: true, status: 'healthy', timestamp: new Date().toISOString() });
        return;
    }
    // ── GET / or /demo or /app → serve dashboard ───────────────────────────────
    if (method === 'GET' && (urlPath === '/' || urlPath === '/demo' || urlPath === '/app')) {
        serveStatic(path.join(PUBLIC_DIR, 'index.html'), res);
        return;
    }
    // ── GET static assets ──────────────────────────────────────────────────────
    if (method === 'GET') {
        // 1. Try public/ directory first
        const publicCandidate = path.join(PUBLIC_DIR, urlPath.replace(/^\/api/, ''));
        if (publicCandidate.startsWith(PUBLIC_DIR) && fs.existsSync(publicCandidate)) {
            serveStatic(publicCandidate, res);
            return;
        }
        // 2. Serve generated report files from reports directory
        const rootFile = path.basename(urlPath);
        if ((rootFile === 'sentinel-report.html' || rootFile === 'sentinel-pr-comment.md') &&
            (urlPath === '/' + rootFile || urlPath === '/api/' + rootFile)) {
            const rootCandidate = path.join(REPORTS_DIR, rootFile);
            if (fs.existsSync(rootCandidate)) {
                serveStatic(rootCandidate, res);
                return;
            }
        }
    }
    // ── POST /api/run-pipeline → CVE remediation OR Git-diff audit ────────────
    if (method === 'POST' && (urlPath === '/api/run-pipeline' || urlPath === '/run-pipeline')) {
        try {
            const body = await readJsonBody(req);
            const triggerKind = body.triggerKind;
            const projectRoot = resolveProjectRoot(body.repoPath);
            console.log(`[API] POST /api/run-pipeline | kind=${triggerKind ?? 'CVE_ADVISORY'} | root=${projectRoot}`);
            if (triggerKind === 'GIT_DIFF') {
                // ── Git-diff live audit ────────────────────────────────────────────
                console.log('[API] Inspecting git working tree...');
                const { changedFiles, diff } = await (0, gitService_1.inspectRepoChanges)(projectRoot);
                if (changedFiles.length === 0) {
                    console.warn('[API] No TS/JS changes detected — falling back to mock changed files');
                }
                const files = changedFiles.length > 0
                    ? changedFiles
                    : ['src/lib/crypto-utils.ts', 'src/userService.ts', 'src/reportService.ts'];
                const trigger = buildBlastTrigger(projectRoot, files);
                console.log('[API] Running GIT_DIFF blast-radius audit...');
                const { report } = await (0, orchestrator_1.runPipeline)(trigger, REPORTS_DIR, diff);
                sendJson(res, 200, { ok: true, report });
            }
            else {
                // ── CVE advisory pipeline (default) ──────────────────────────────
                (0, seed_1.seedMockTarget)();
                const trigger = buildCveTrigger(projectRoot);
                console.log('[API] Running CVE pipeline...');
                const { report } = await (0, orchestrator_1.runPipeline)(trigger, REPORTS_DIR);
                sendJson(res, 200, { ok: true, report });
            }
        }
        catch (err) {
            console.error('[API] Pipeline error:', err.message);
            sendJson(res, 500, { ok: false, error: err.message });
        }
        return;
    }
    // ── POST /api/ai-summary → Generate Gemini PR Executive Briefing ───────────
    if (method === 'POST' && (urlPath === '/api/ai-summary' || urlPath === '/ai-summary')) {
        try {
            const body = await readJsonBody(req);
            const summary = await (0, geminiService_1.generateExecutiveSummary)({
                blastRadiusScore: body.blastRadiusScore,
                filesImpacted: body.filesImpacted,
                breakingSignatures: body.breakingSignatures,
                callSitesPatched: body.callSitesPatched,
                exposedEndpoints: body.exposedEndpoints,
                diffSnippet: body.diffSnippet,
                repoName: body.repoName,
            });
            sendJson(res, 200, { ok: true, summary });
        }
        catch (err) {
            console.error('[API] Gemini summary error:', err.message);
            sendJson(res, 500, { ok: false, error: err.message });
        }
        return;
    }
    // ── POST /api/clone-repo → clone a GitHub / HTTPS repo then run pipeline ──
    if (method === 'POST' && (urlPath === '/api/clone-repo' || urlPath === '/clone-repo')) {
        let sandboxPath = null;
        try {
            const body = await readJsonBody(req);
            let repoUrl = body.repoUrl?.trim();
            const branch = body.branch;
            const triggerKind = body.triggerKind ?? 'GIT_DIFF';
            if (repoUrl && !/^https?:\/\//i.test(repoUrl) && !/^git:\/\//i.test(repoUrl)) {
                repoUrl = 'https://' + repoUrl;
            }
            if (!repoUrl || !(0, repoIngestionService_1.isValidGitUrl)(repoUrl)) {
                sendJson(res, 400, { ok: false, error: 'repoUrl must be a valid https:// git URL' });
                return;
            }
            console.log(`[API] POST /api/clone-repo | url=${repoUrl} | branch=${branch ?? 'default'} | trigger=${triggerKind}`);
            const { sandboxPath: sp, repoName } = await (0, repoIngestionService_1.cloneRepository)(repoUrl, branch);
            sandboxPath = sp;
            console.log(`[API] Cloned "${repoName}" into sandbox: ${sandboxPath}`);
            // Collect all source files recursively — no src/ assumption
            const allFiles = collectSourceFiles(sandboxPath);
            console.log(`[API] Found ${allFiles.length} source file(s) in cloned repo`);
            let report;
            if (triggerKind === 'CVE_ADVISORY') {
                // For external repos, pass all discovered source files so every agent
                // can scan the full codebase rather than relying on glob patterns alone.
                const trigger = { ...buildCveTrigger(sandboxPath), allSourceFiles: allFiles };
                const result = await (0, orchestrator_1.runPipeline)(trigger, REPORTS_DIR);
                report = result.report;
            }
            else {
                const { changedFiles, diff } = await (0, gitService_1.inspectRepoChanges)(sandboxPath);
                // Fall back to all source files if git reports nothing (fresh clone = no dirty state)
                const files = changedFiles.length > 0 ? changedFiles : allFiles;
                const trigger = buildBlastTrigger(sandboxPath, files);
                const result = await (0, orchestrator_1.runPipeline)(trigger, REPORTS_DIR, diff);
                report = result.report;
            }
            sendJson(res, 200, { ok: true, report, repoName, sandboxPath });
        }
        catch (err) {
            console.error('[API] clone-repo error:', err.message);
            sendJson(res, 500, { ok: false, error: err.message });
        }
        finally {
            if (sandboxPath)
                (0, repoIngestionService_1.cleanupSandbox)(sandboxPath);
        }
        return;
    }
    // ── POST /api/upload-zip → extract a ZIP upload then run pipeline ─────────
    if (method === 'POST' && (urlPath === '/api/upload-zip' || urlPath === '/upload-zip')) {
        let sandboxPath = null;
        try {
            console.log('[API] POST /api/upload-zip — parsing multipart upload');
            const { file, fields } = await (0, repoIngestionService_1.parseMultipartUpload)(req);
            const triggerKind = fields.triggerKind ?? 'GIT_DIFF';
            if (!file.fileName.endsWith('.zip') && file.mimeType !== 'application/zip') {
                sendJson(res, 400, { ok: false, error: 'Only .zip archives are accepted' });
                return;
            }
            const { sandboxPath: sp, repoName } = (0, repoIngestionService_1.extractZip)(file.buffer, file.fileName);
            sandboxPath = sp;
            console.log(`[API] Extracted "${repoName}" into sandbox: ${sandboxPath}`);
            const allFiles = collectSourceFiles(sandboxPath);
            console.log(`[API] Found ${allFiles.length} source file(s) in extracted ZIP`);
            let report;
            if (triggerKind === 'CVE_ADVISORY') {
                const trigger = { ...buildCveTrigger(sandboxPath), allSourceFiles: allFiles };
                const result = await (0, orchestrator_1.runPipeline)(trigger, REPORTS_DIR);
                report = result.report;
            }
            else {
                const { changedFiles, diff } = await (0, gitService_1.inspectRepoChanges)(sandboxPath);
                const files = changedFiles.length > 0 ? changedFiles : allFiles;
                const trigger = buildBlastTrigger(sandboxPath, files);
                const result = await (0, orchestrator_1.runPipeline)(trigger, REPORTS_DIR, diff);
                report = result.report;
            }
            sendJson(res, 200, { ok: true, report, repoName, sandboxPath: '[cleaned]' });
        }
        catch (err) {
            console.error('[API] upload-zip error:', err.message);
            sendJson(res, 500, { ok: false, error: err.message });
        }
        finally {
            if (sandboxPath)
                (0, repoIngestionService_1.cleanupSandbox)(sandboxPath);
        }
        return;
    }
    // ── POST /api/run-blast-audit → legacy blast-radius-only audit ────────────
    if (method === 'POST' && (urlPath === '/api/run-blast-audit' || urlPath === '/run-blast-audit')) {
        try {
            const body = await readJsonBody(req);
            const projectRoot = resolveProjectRoot(body.repoPath);
            console.log(`[API] POST /api/run-blast-audit | root=${projectRoot}`);
            console.log('[API] Inspecting git working tree...');
            const { changedFiles, diff } = await (0, gitService_1.inspectRepoChanges)(projectRoot);
            const files = changedFiles.length > 0
                ? changedFiles
                : ['src/lib/crypto-utils.ts', 'src/userService.ts', 'src/reportService.ts'].map((f) => path.resolve(projectRoot, f));
            const trigger = buildBlastTrigger(projectRoot, files);
            console.log('[API] Running GIT_DIFF blast-radius audit...');
            const { report } = await (0, orchestrator_1.runPipeline)(trigger, REPORTS_DIR, diff);
            sendJson(res, 200, { ok: true, report });
        }
        catch (err) {
            console.error('[API] Blast audit error:', err.message);
            sendJson(res, 500, { ok: false, error: err.message });
        }
        return;
    }
    // ── 404 ────────────────────────────────────────────────────────────────────
    sendJson(res, 404, { ok: false, error: `No route: ${method} ${urlPath}` });
}
// ─── Resilience: keep the server alive on unhandled errors ───────────────────
process.on('uncaughtException', (err) => {
    console.error('[SentinelDev] Uncaught exception (server kept alive):', err.message);
});
process.on('unhandledRejection', (reason) => {
    console.error('[SentinelDev] Unhandled rejection (server kept alive):', reason);
});
// ─── Start ───────────────────────────────────────────────────────────────────
const server = http.createServer(handleRequest);
// Allow up to 10 minutes for long clone + analysis runs.
// The browser will still show a spinner; the server won't drop the connection.
server.timeout = 10 * 60 * 1000; // 10 min
server.requestTimeout = 10 * 60 * 1000;
server.headersTimeout = 10 * 60 * 1000 + 1000;
if (!process.env.VERCEL) {
    server.listen(PORT, () => {
        console.log(`SentinelDev Dashboard running at http://localhost:${PORT}`);
    });
}
exports.default = server;
//# sourceMappingURL=app.js.map