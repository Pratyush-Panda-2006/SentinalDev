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
export declare function runDocuSync(trigger: Trigger, changedFilesOverride?: string[], allSourceFiles?: string[]): Promise<SpecSyncResult>;
//# sourceMappingURL=docuSync.d.ts.map