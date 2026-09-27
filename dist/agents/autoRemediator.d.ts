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
export declare function runRemediation(trigger: CVEAdvisoryTrigger): Promise<CVERemediationPlan>;
//# sourceMappingURL=autoRemediator.d.ts.map