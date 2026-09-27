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
/**
 * Removes a sandbox directory tree created by this service.
 * Safe: only deletes paths that are inside SANDBOX_ROOT.
 */
export declare function cleanupSandbox(sandboxPath: string): void;
/**
 * Validates that the supplied URL looks like a clonable git URL.
 * Accepts https:// and git:// schemes; GitHub, GitLab, Bitbucket, etc.
 */
export declare function isValidGitUrl(url: string): boolean;
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
export declare function cloneRepository(repoUrl: string, branch?: string): Promise<CloneResult>;
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
export declare function extractZip(buffer: Buffer, fileName: string): ExtractResult;
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
export declare function parseMultipartUpload(req: http.IncomingMessage): Promise<{
    file: UploadedFile;
    fields: Record<string, string>;
}>;
//# sourceMappingURL=repoIngestionService.d.ts.map