import { CVEAdvisoryTrigger, CVERemediationPlan } from '../types/index';
/**
 * Core CVE remediation logic.
 *
 * For every TypeScript source file under projectRoot:
 *  1. Find all CallExpression nodes whose callee identifier matches a deprecated method.
 *  2. Rewrite the callee identifier only (arguments left untouched).
 *  3. Capture before/after text for unified diff generation.
 *  4. Save all changes to disk.
 */
export declare function remediateCVE(trigger: CVEAdvisoryTrigger): Promise<CVERemediationPlan>;
//# sourceMappingURL=cveRemediationService.d.ts.map