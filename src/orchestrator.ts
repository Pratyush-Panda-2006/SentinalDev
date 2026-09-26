import * as path from 'path';
import { runBlastRadiusAudit } from './agents/blastRadiusAuditor';
import { runRemediation } from './agents/autoRemediator';
import { runDocuSync } from './agents/docuSync';
import { generateHtmlReport } from './reporters/htmlReporter';
import { generatePrComment } from './reporters/prCommentReporter';
import {
  Trigger,
  PipelineReport,
  BlastRadiusResult,
  CVERemediationPlan,
  SpecSyncResult,
} from './types/index';

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
export async function runPipeline(
  trigger: Trigger,
  outputDir?: string,
  gitDiff?: string
): Promise<{ report: PipelineReport; outputs: ReporterOutputs }> {
  console.log('\n════════════════════════════════════════════════════');
  console.log('  SentinelDev Pipeline — Starting');
  console.log(`  Trigger: ${trigger.kind}`);
  console.log(`  Project: ${trigger.projectRoot}`);
  console.log('════════════════════════════════════════════════════\n');

  let blastRadius: BlastRadiusResult | null = null;
  let remediation: CVERemediationPlan | null = null;
  let docSync: SpecSyncResult | null = null;

  if (trigger.kind === 'CVE_ADVISORY') {
    // ── Stage 1: Remediate ─────────────────────────────────────────────────
    console.log('── Stage 1/3: AutoRemediator ─────────────────────────────');
    remediation = await runRemediation(trigger);

    // ── Stage 2: Blast Radius (on patched files) ──────────────────────────
    console.log('\n── Stage 2/3: BlastRadiusAuditor ────────────────────────');
    blastRadius = await runBlastRadiusAudit(trigger, remediation.affectedFiles);

    // ── Stage 3: DocuSync ─────────────────────────────────────────────────
    console.log('\n── Stage 3/3: DocuSync ──────────────────────────────────');
    // For CVE flow, scan all source files (remediation may touch any file)
    docSync = await runDocuSync(trigger, []);
  } else {
    // GIT_DIFF flow

    // ── Stage 1: Blast Radius ─────────────────────────────────────────────
    console.log('── Stage 1/2: BlastRadiusAuditor ────────────────────────');
    blastRadius = await runBlastRadiusAudit(trigger);

    // ── Stage 2: DocuSync ─────────────────────────────────────────────────
    console.log('\n── Stage 2/2: DocuSync ──────────────────────────────────');
    docSync = await runDocuSync(trigger);
  }

  const report: PipelineReport = {
    trigger,
    blastRadius,
    remediation,
    docSync,
    ...(gitDiff !== undefined ? { gitDiff } : {}),
    completedAt: new Date().toISOString(),
  };

  // ── Reporting ───────────────────────────────────────────────────────────────
  const dir = outputDir ?? process.cwd();
  const htmlPath = path.resolve(dir, 'sentinel-report.html');
  const prCommentPath = path.resolve(dir, 'sentinel-pr-comment.md');

  console.log('\n── Reporters ────────────────────────────────────────');
  generateHtmlReport(report, htmlPath);
  console.log(`[Reporter] HTML  → ${htmlPath}`);
  generatePrComment(report, prCommentPath);
  console.log(`[Reporter] PR MD → ${prCommentPath}`);

  console.log('\n════════════════════════════════════════════════════');
  console.log('  SentinelDev Pipeline — Complete');
  console.log('════════════════════════════════════════════════════\n');

  return { report, outputs: { htmlPath, prCommentPath } };
}
