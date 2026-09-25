import { remediateCVE } from '../services/cveRemediationService';
import { CVEAdvisoryTrigger, CVERemediationPlan } from '../types/index';

/**
 * AutoRemediator subagent.
 *
 * Receives a CVEAdvisoryTrigger and delegates to cveRemediationService
 * to locate and rewrite all deprecated call sites in-place.
 *
 * Returns a CVERemediationPlan containing:
 *  - the number of call sites refactored
 *  - the list of affected files (used by BlastRadiusAuditor in the next stage)
 *  - a unified patch diff of every change made
 */
export async function runRemediation(
  trigger: CVEAdvisoryTrigger
): Promise<CVERemediationPlan> {
  console.log(
    `[AutoRemediator] Starting remediation for ${trigger.cveId} ` +
      `(${trigger.packageName} — deprecated: ${Object.keys(trigger.deprecatedMethods).join(', ')})`
  );

  const plan = await remediateCVE(trigger);

  console.log(
    `[AutoRemediator] Refactored ${plan.callSitesRefactored} call site(s) ` +
      `across ${plan.affectedFiles.length} file(s)`
  );

  if (plan.affectedFiles.length > 0) {
    console.log('[AutoRemediator] Affected files:');
    for (const f of plan.affectedFiles) {
      console.log(`  • ${f}`);
    }
  }

  return plan;
}
