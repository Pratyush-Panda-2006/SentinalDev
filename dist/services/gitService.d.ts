/** Files changed in the working tree (or against a base branch), filtered to TS/JS only. */
export interface RepoInspection {
    changedFiles: string[];
    diff: string;
}
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
export declare function inspectRepoChanges(targetRepoPath: string, baseBranch?: string): Promise<RepoInspection>;
//# sourceMappingURL=gitService.d.ts.map