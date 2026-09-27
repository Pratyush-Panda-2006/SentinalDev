"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPipeline = runPipeline;
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const blastRadiusAuditor_1 = require("./agents/blastRadiusAuditor");
const autoRemediator_1 = require("./agents/autoRemediator");
const docuSync_1 = require("./agents/docuSync");
const htmlReporter_1 = require("./reporters/htmlReporter");
const prCommentReporter_1 = require("./reporters/prCommentReporter");
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
async function runPipeline(trigger, outputDir, gitDiff) {
    console.log('\n════════════════════════════════════════════════════');
    console.log('  SentinelDev Pipeline — Starting');
    console.log(`  Trigger: ${trigger.kind}`);
    console.log(`  Project: ${trigger.projectRoot}`);
    console.log('════════════════════════════════════════════════════\n');
    let blastRadius = null;
    let remediation = null;
    let docSync = null;
    if (trigger.kind === 'CVE_ADVISORY') {
        // ── Stage 1: Remediate ─────────────────────────────────────────────────
        console.log('── Stage 1/3: AutoRemediator ─────────────────────────────');
        remediation = await (0, autoRemediator_1.runRemediation)(trigger);
        // ── Stage 2: Blast Radius (on patched files) ──────────────────────────
        console.log('\n── Stage 2/3: BlastRadiusAuditor ────────────────────────');
        // For external repos the remediation may have found 0 affected files
        // (the repo doesn't use crypto-utils). Fall back to all source files so
        // BlastRadiusAuditor still produces a real call-graph for the repo.
        const blastFiles = remediation.affectedFiles.length > 0
            ? remediation.affectedFiles
            : (trigger.allSourceFiles ?? []);
        blastRadius = await (0, blastRadiusAuditor_1.runBlastRadiusAudit)(trigger, blastFiles);
        // ── Stage 3: DocuSync ─────────────────────────────────────────────────
        console.log('\n── Stage 3/3: DocuSync ──────────────────────────────────');
        // Pass allSourceFiles so DocuSync can scan the full project for routes
        docSync = await (0, docuSync_1.runDocuSync)(trigger, [], trigger.allSourceFiles);
    }
    else {
        // GIT_DIFF flow
        // ── Stage 1: Blast Radius ─────────────────────────────────────────────
        console.log('── Stage 1/2: BlastRadiusAuditor ────────────────────────');
        blastRadius = await (0, blastRadiusAuditor_1.runBlastRadiusAudit)(trigger);
        // ── Stage 2: DocuSync ─────────────────────────────────────────────────
        console.log('\n── Stage 2/2: DocuSync ──────────────────────────────────');
        docSync = await (0, docuSync_1.runDocuSync)(trigger);
    }
    const report = {
        trigger,
        blastRadius,
        remediation,
        docSync,
        ...(gitDiff !== undefined ? { gitDiff } : {}),
        completedAt: new Date().toISOString(),
    };
    // ── Reporting ───────────────────────────────────────────────────────────────
    const dir = outputDir ?? (process.env.VERCEL ? os.tmpdir() : process.cwd());
    const htmlPath = path.resolve(dir, 'sentinel-report.html');
    const prCommentPath = path.resolve(dir, 'sentinel-pr-comment.md');
    console.log('\n── Reporters ────────────────────────────────────────');
    try {
        (0, htmlReporter_1.generateHtmlReport)(report, htmlPath);
        console.log(`[Reporter] HTML  → ${htmlPath}`);
    }
    catch (err) {
        console.warn(`[Reporter] Warning: Could not write HTML report to disk: ${err.message}`);
    }
    try {
        (0, prCommentReporter_1.generatePrComment)(report, prCommentPath);
        console.log(`[Reporter] PR MD → ${prCommentPath}`);
    }
    catch (err) {
        console.warn(`[Reporter] Warning: Could not write PR comment to disk: ${err.message}`);
    }
    console.log('\n════════════════════════════════════════════════════');
    console.log('  SentinelDev Pipeline — Complete');
    console.log('════════════════════════════════════════════════════\n');
    return { report, outputs: { htmlPath, prCommentPath } };
}
//# sourceMappingURL=orchestrator.js.map