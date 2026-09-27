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
exports.runBlastRadiusAudit = runBlastRadiusAudit;
const path = __importStar(require("path"));
const blastRadiusService_1 = require("../services/blastRadiusService");
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
async function runBlastRadiusAudit(trigger, changedFilesOverride) {
    const projectRoot = trigger.projectRoot;
    let changedFiles;
    if (changedFilesOverride && changedFilesOverride.length > 0) {
        changedFiles = changedFilesOverride;
    }
    else if (trigger.kind === 'GIT_DIFF') {
        // Resolve relative paths to absolute
        changedFiles = trigger.changedFiles.map((f) => path.isAbsolute(f) ? f : path.resolve(projectRoot, f));
    }
    else {
        // CVE_ADVISORY without override — analyse entire src directory
        changedFiles = [];
    }
    console.log(`[BlastRadiusAuditor] Analysing ${changedFiles.length} changed file(s) in ${projectRoot}`);
    const result = (0, blastRadiusService_1.analyzeBlastRadius)(changedFiles, projectRoot);
    console.log(`[BlastRadiusAuditor] Score: ${result.blastRadiusScore} | ` +
        `Impacted: ${result.impactedFiles.length} file(s) | ` +
        `Breaking signatures: ${result.breakingSignatures.length}`);
    return result;
}
//# sourceMappingURL=blastRadiusAuditor.js.map