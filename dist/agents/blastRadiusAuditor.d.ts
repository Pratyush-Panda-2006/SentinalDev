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
export declare function runBlastRadiusAudit(trigger: Trigger, changedFilesOverride?: string[]): Promise<BlastRadiusResult>;
//# sourceMappingURL=blastRadiusAuditor.d.ts.map