import * as path from 'path';
import { analyzeBlastRadius } from '../services/blastRadiusService';
import { BlastRadiusResult, Trigger } from '../types/index';

/**
 * BlastRadiusAuditor subagent.
 *
 * Accepts any Trigger and derives the set of changed files to analyse:
 *   - GitDiffTrigger: uses trigger.changedFiles directly
 *   - CVEAdvisoryTrigger: uses the affectedFiles from the remediation output
 *     (passed via the optional changedFiles override)
 *
 * Returns a BlastRadiusResult with call graph, impacted files, and risk score.
 */
export async function runBlastRadiusAudit(
  trigger: Trigger,
  changedFilesOverride?: string[]
): Promise<BlastRadiusResult> {
  const projectRoot = trigger.projectRoot;

  let changedFiles: string[];

  if (changedFilesOverride && changedFilesOverride.length > 0) {
    changedFiles = changedFilesOverride;
  } else if (trigger.kind === 'GIT_DIFF') {
    // Resolve relative paths to absolute
    changedFiles = trigger.changedFiles.map((f) =>
      path.isAbsolute(f) ? f : path.resolve(projectRoot, f)
    );
  } else {
    // CVE_ADVISORY without override — analyse entire src directory
    changedFiles = [];
  }

  console.log(
    `[BlastRadiusAuditor] Analysing ${changedFiles.length} changed file(s) in ${projectRoot}`
  );

  const result = analyzeBlastRadius(changedFiles, projectRoot);

  console.log(
    `[BlastRadiusAuditor] Score: ${result.blastRadiusScore} | ` +
      `Impacted: ${result.impactedFiles.length} file(s) | ` +
      `Breaking signatures: ${result.breakingSignatures.length}`
  );

  return result;
}
