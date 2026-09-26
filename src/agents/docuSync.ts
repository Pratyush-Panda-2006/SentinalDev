import * as path from 'path';
import { syncDocs } from '../services/docuSyncService';
import { Trigger, SpecSyncResult } from '../types/index';

/**
 * DocuSync subagent.
 *
 * Scans the route files identified by the trigger, reconciles openapi.yaml,
 * and patches the README's API Endpoints section.
 *
 * @param trigger              The original pipeline trigger.
 * @param changedFilesOverride Specific files to scan (e.g. from prior remediation).
 *                             If empty, scans all .ts files under projectRoot/src.
 */
export async function runDocuSync(
  trigger: Trigger,
  changedFilesOverride?: string[],
  allSourceFiles?: string[]
): Promise<SpecSyncResult> {
  const projectRoot = trigger.projectRoot;

  // Priority: explicit override > allSourceFiles (external repo full scan) >
  //           GIT_DIFF changedFiles > empty (docuSyncService will glob internally)
  let changedFiles: string[];
  if (changedFilesOverride && changedFilesOverride.length > 0) {
    changedFiles = changedFilesOverride;
  } else if (allSourceFiles && allSourceFiles.length > 0) {
    changedFiles = allSourceFiles;
  } else if (trigger.kind === 'GIT_DIFF') {
    changedFiles = trigger.changedFiles.map((f) =>
      path.isAbsolute(f) ? f : path.resolve(projectRoot, f)
    );
  } else {
    changedFiles = [];
  }

  console.log(
    `[DocuSync] Scanning ${changedFiles.length > 0 ? changedFiles.length + ' file(s)' : 'all source files'} ` +
      `in ${projectRoot}`
  );

  const result = await syncDocs(changedFiles, projectRoot);

  if (result.updatedEndpoints.length === 0) {
    console.log('[DocuSync] openapi.yaml is already in sync — no changes needed');
  } else {
    console.log(
      `[DocuSync] Synced ${result.updatedEndpoints.length} endpoint(s): ` +
        result.updatedEndpoints.join(', ')
    );
  }

  return result;
}
