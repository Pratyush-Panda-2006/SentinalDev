/**
 * repoIngestionService.ts
 *
 * Handles pulling external repositories into a local temp sandbox so the
 * SentinelDev pipeline can analyse them without touching the host workspace.
 *
 * Supported ingestion modes:
 *   1. GitHub / HTTPS git clone  — clones the default branch into a tmp dir
 *   2. ZIP archive upload        — extracts the archive into a tmp dir
 *
 * The caller receives the absolute path of the sandbox root, which can be
 * passed directly to runPipeline() as projectRoot.
 *
 * Cleanup: every sandbox is placed under OS tmpdir / sentineldev-sandbox/.
 * Call cleanupSandbox(sandboxPath) when the pipeline run is complete.
 */

import * as fs   from 'fs';
import * as path from 'path';
import * as os   from 'os';
import AdmZip    from 'adm-zip';
import { simpleGit } from 'simple-git';

// ─── Sandbox helpers ──────────────────────────────────────────────────────────

const SANDBOX_ROOT = path.join(os.tmpdir(), 'sentineldev-sandbox');

/** Creates a fresh, uniquely-named sandbox directory and returns its path. */
function createSandbox(label: string): string {
  const safe  = label.replace(/[^a-z0-9_-]/gi, '_').slice(0, 40);
  const stamp = Date.now();
  const dir   = path.join(SANDBOX_ROOT, `${safe}_${stamp}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Removes a sandbox directory tree created by this service.
 * Safe: only deletes paths that are inside SANDBOX_ROOT.
 */
export function cleanupSandbox(sandboxPath: string): void {
  const resolved = path.resolve(sandboxPath);
  if (!resolved.startsWith(path.resolve(SANDBOX_ROOT))) {
    console.warn(`[RepoIngestion] Refusing to delete path outside sandbox root: ${resolved}`);
    return;
  }
  if (fs.existsSync(resolved)) {
    fs.rmSync(resolved, { recursive: true, force: true });
    console.log(`[RepoIngestion] Cleaned up sandbox: ${resolved}`);
  }
}

// ─── GitHub clone ─────────────────────────────────────────────────────────────

/**
 * Validates that the supplied URL looks like a clonable git URL.
 * Accepts https:// and git:// schemes; GitHub, GitLab, Bitbucket, etc.
 */
export function isValidGitUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (u.protocol === 'https:' || u.protocol === 'git:') && u.hostname.length > 0;
  } catch {
    return false;
  }
}

export interface CloneResult {
  sandboxPath: string;
  repoName: string;
}

/**
 * Clones a remote git repository (shallow, depth 1) into a new sandbox dir.
 *
 * @param repoUrl   HTTPS git URL, e.g. "https://github.com/owner/repo"
 * @param branch    Branch / tag to clone (default: repository default branch)
 */
export async function cloneRepository(
  repoUrl: string,
  branch?: string
): Promise<CloneResult> {
  if (!isValidGitUrl(repoUrl)) {
    throw new Error(`Invalid git URL: "${repoUrl}"`);
  }

  // Derive a human-readable name from the URL (last path segment, no .git)
  const repoName = path.basename(repoUrl.replace(/\.git$/, ''));
  const sandboxPath = createSandbox(repoName);

  console.log(`[RepoIngestion] Cloning ${repoUrl} → ${sandboxPath}`);

  const git = simpleGit();
  const cloneArgs: string[] = ['--depth', '1'];
  if (branch) {
    cloneArgs.push('--branch', branch);
  }

  await git.clone(repoUrl, sandboxPath, cloneArgs);

  console.log(`[RepoIngestion] Clone complete: ${sandboxPath}`);
  return { sandboxPath, repoName };
}

// ─── ZIP extraction ───────────────────────────────────────────────────────────

export interface ExtractResult {
  sandboxPath: string;
  repoName: string;
}

/**
 * Extracts a ZIP archive buffer into a new sandbox directory.
 *
 * Many ZIP archives (e.g. GitHub "Download ZIP") wrap all files in a single
 * top-level folder.  This function detects that pattern and sets sandboxPath
 * to the inner folder so callers get the actual project root directly.
 *
 * @param buffer    Raw ZIP file bytes
 * @param fileName  Original filename (used to derive the sandbox name)
 */
export function extractZip(buffer: Buffer, fileName: string): ExtractResult {
  const baseName    = path.basename(fileName, path.extname(fileName));
  const sandboxPath = createSandbox(baseName);

  console.log(`[RepoIngestion] Extracting ZIP "${fileName}" → ${sandboxPath}`);

  const zip = new AdmZip(buffer);
  zip.extractAllTo(sandboxPath, /* overwrite */ true);

  // ── Detect single-root-folder wrapping (e.g. "repo-main/") ──────────────
  const entries = fs.readdirSync(sandboxPath);
  let resolvedRoot = sandboxPath;

  if (entries.length === 1) {
    const single = path.join(sandboxPath, entries[0]);
    if (fs.statSync(single).isDirectory()) {
      resolvedRoot = single;
      console.log(`[RepoIngestion] Detected wrapper folder — using inner root: ${resolvedRoot}`);
    }
  }

  console.log(`[RepoIngestion] Extraction complete: ${resolvedRoot}`);
  return { sandboxPath: resolvedRoot, repoName: baseName };
}

// ─── Multipart body reader ────────────────────────────────────────────────────

import Busboy from 'busboy';
import * as http from 'http';

export interface UploadedFile {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}

/**
 * Parses a multipart/form-data request and resolves with the first file field
 * named "zipfile" along with any text fields.
 *
 * Enforces a 50 MB size cap.
 */
export function parseMultipartUpload(
  req: http.IncomingMessage
): Promise<{ file: UploadedFile; fields: Record<string, string> }> {
  const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] ?? '';
    if (!contentType.includes('multipart/form-data')) {
      reject(new Error('Expected multipart/form-data content type'));
      return;
    }

    const bb = Busboy({ headers: req.headers, limits: { fileSize: MAX_BYTES } });
    const fields: Record<string, string> = {};
    let resolved = false;

    bb.on('field', (name, value) => {
      fields[name] = value;
    });

    bb.on('file', (fieldname, fileStream, info) => {
      if (fieldname !== 'zipfile') {
        fileStream.resume(); // drain ignored fields
        return;
      }

      const chunks: Buffer[] = [];

      fileStream.on('data', (chunk: Buffer) => chunks.push(chunk));
      fileStream.on('limit', () => {
        reject(new Error(`ZIP file exceeds the 50 MB limit`));
      });
      fileStream.on('end', () => {
        if (resolved) return;
        resolved = true;
        resolve({
          file: {
            buffer: Buffer.concat(chunks),
            fileName: info.filename || 'upload.zip',
            mimeType: info.mimeType,
          },
          fields,
        });
      });
      fileStream.on('error', reject);
    });

    bb.on('error', reject);
    bb.on('finish', () => {
      if (!resolved) {
        reject(new Error('No "zipfile" field found in the multipart upload'));
      }
    });

    req.pipe(bb);
  });
}
