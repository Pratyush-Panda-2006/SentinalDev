import * as path from 'path';
import * as fs from 'fs';
import { simpleGit, SimpleGit, StatusResult } from 'simple-git';

/** Files changed in the working tree (or against a base branch), filtered to TS/JS only. */
export interface RepoInspection {
  changedFiles: string[];
  diff: string;
}

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
export async function inspectRepoChanges(
  targetRepoPath: string,
  baseBranch: string = 'main'
): Promise<RepoInspection> {
  const repoPath = path.resolve(targetRepoPath);

  // Bail out gracefully if the path does not exist
  if (!fs.existsSync(repoPath)) {
    console.warn(`[GitService] Path not found: ${repoPath}`);
    return { changedFiles: [], diff: '' };
  }

  const git: SimpleGit = simpleGit(repoPath);

  // Check whether this is actually a git repository
  const isRepo = await git.checkIsRepo().catch(() => false);
  if (!isRepo) {
    console.warn(`[GitService] Not a git repository: ${repoPath}`);
    return { changedFiles: [], diff: '' };
  }

  try {
    // ── 1. Working-tree status (staged + unstaged) ────────────────────────
    const status: StatusResult = await git.status();

    const workingTreeFiles: string[] = [
      ...status.not_added,
      ...status.modified,
      ...status.created,
      ...status.deleted,
      ...status.renamed.map((r) => r.to),
      ...status.staged,
    ].filter((f, i, arr) => arr.indexOf(f) === i); // deduplicate

    // ── 2. If working tree is clean, diff against base branch ─────────────
    let rawDiff = '';
    let diffFiles: string[] = [];

    if (workingTreeFiles.length === 0) {
      console.log(`[GitService] Working tree clean — diffing against ${baseBranch}`);
      try {
        rawDiff = await git.diff([`${baseBranch}...HEAD`]);
        const diffSummary = await git.diffSummary([`${baseBranch}...HEAD`]);
        diffFiles = diffSummary.files.map((f) => f.file);
      } catch {
        // Branch may not exist (e.g. shallow clone / first commit) — return empty
        console.warn(`[GitService] Could not diff against branch "${baseBranch}"`);
        return { changedFiles: [], diff: '' };
      }
    } else {
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

    console.log(
      `[GitService] Found ${changedFiles.length} TS/JS changed file(s) in ${repoPath}`
    );

    return { changedFiles, diff: rawDiff };
  } catch (err) {
    console.error('[GitService] Unexpected error:', (err as Error).message);
    return { changedFiles: [], diff: '' };
  }
}
