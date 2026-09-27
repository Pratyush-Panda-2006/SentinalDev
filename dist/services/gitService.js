"use strict";
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
exports.inspectRepoChanges = inspectRepoChanges;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const simple_git_1 = require("simple-git");
const JS_TS_RE = /\.(ts|tsx|js)$/;
/**
 * Inspects an external git repository (or any local directory) for changed files.
 *
 * Strategy:
 *  1. Check working-tree status (staged + unstaged).
 *  2. If the working tree is clean, fall back to `git diff <baseBranch>...HEAD`.
 *  3. Return only `.ts`, `.tsx`, `.js` files, and the unified diff string.
 *  4. If the directory is not a git repo, return empty results without crashing.
 *
 * @param targetRepoPath  Absolute (or CWD-relative) path to the repository root.
 * @param baseBranch      Branch to diff against when the working tree is clean (default: 'main').
 */
async function inspectRepoChanges(targetRepoPath, baseBranch = 'main') {
    const repoPath = path.resolve(targetRepoPath);
    // Bail out gracefully if the path does not exist
    if (!fs.existsSync(repoPath)) {
        console.warn(`[GitService] Path not found: ${repoPath}`);
        return { changedFiles: [], diff: '' };
    }
    const git = (0, simple_git_1.simpleGit)(repoPath);
    // Check whether this is actually a git repository
    const isRepo = await git.checkIsRepo().catch(() => false);
    if (!isRepo) {
        console.warn(`[GitService] Not a git repository: ${repoPath}`);
        return { changedFiles: [], diff: '' };
    }
    try {
        // ── 1. Working-tree status (staged + unstaged) ────────────────────────
        const status = await git.status();
        const workingTreeFiles = [
            ...status.not_added,
            ...status.modified,
            ...status.created,
            ...status.deleted,
            ...status.renamed.map((r) => r.to),
            ...status.staged,
        ].filter((f, i, arr) => arr.indexOf(f) === i); // deduplicate
        // ── 2. If working tree is clean, diff against base branch ─────────────
        let rawDiff = '';
        let diffFiles = [];
        if (workingTreeFiles.length === 0) {
            console.log(`[GitService] Working tree clean — diffing against ${baseBranch}`);
            try {
                rawDiff = await git.diff([`${baseBranch}...HEAD`]);
                const diffSummary = await git.diffSummary([`${baseBranch}...HEAD`]);
                diffFiles = diffSummary.files.map((f) => f.file);
            }
            catch {
                // Branch may not exist (e.g. shallow clone / first commit) — return empty
                console.warn(`[GitService] Could not diff against branch "${baseBranch}"`);
                return { changedFiles: [], diff: '' };
            }
        }
        else {
            // Capture diff for working-tree changes (unstaged + staged)
            rawDiff = await git.diff(['HEAD']).catch(() => '');
            if (!rawDiff) {
                rawDiff = await git.diff(['--cached']).catch(() => '');
            }
            diffFiles = workingTreeFiles;
        }
        // ── 3. Filter to TS / JS only ─────────────────────────────────────────
        const changedFiles = diffFiles
            .filter((f) => JS_TS_RE.test(f))
            .map((f) => path.resolve(repoPath, f));
        console.log(`[GitService] Found ${changedFiles.length} TS/JS changed file(s) in ${repoPath}`);
        return { changedFiles, diff: rawDiff };
    }
    catch (err) {
        console.error('[GitService] Unexpected error:', err.message);
        return { changedFiles: [], diff: '' };
    }
}
//# sourceMappingURL=gitService.js.map