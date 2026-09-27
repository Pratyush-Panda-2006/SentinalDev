import { Trigger, PipelineReport } from './types/index';
export interface ReporterOutputs {
    htmlPath: string;
    prCommentPath: string;
}
/**
 * Root orchestrator for the SentinelDev pipeline.
 *
 * CVE_ADVISORY flow (sequential):
 *   1. AutoRemediator  — rewrites deprecated call sites in-place
 *   2. BlastRadiusAuditor — analyses the call graph of the patched files
 *   3. DocuSync — reconciles openapi.yaml with current routes
 *
 * GIT_DIFF flow (sequential):
 *   1. BlastRadiusAuditor — analyses changed files
 *   2. DocuSync — reconciles openapi.yaml with changed route files
 */
export declare function runPipeline(trigger: Trigger, outputDir?: string, gitDiff?: string): Promise<{
    report: PipelineReport;
    outputs: ReporterOutputs;
}>;
//# sourceMappingURL=orchestrator.d.ts.map