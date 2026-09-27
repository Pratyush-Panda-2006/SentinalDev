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
exports.runDocuSync = runDocuSync;
const path = __importStar(require("path"));
const docuSyncService_1 = require("../services/docuSyncService");
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
async function runDocuSync(trigger, changedFilesOverride, allSourceFiles) {
    const projectRoot = trigger.projectRoot;
    // Priority: explicit override > allSourceFiles (external repo full scan) >
    //           GIT_DIFF changedFiles > empty (docuSyncService will glob internally)
    let changedFiles;
    if (changedFilesOverride && changedFilesOverride.length > 0) {
        changedFiles = changedFilesOverride;
    }
    else if (allSourceFiles && allSourceFiles.length > 0) {
        changedFiles = allSourceFiles;
    }
    else if (trigger.kind === 'GIT_DIFF') {
        changedFiles = trigger.changedFiles.map((f) => path.isAbsolute(f) ? f : path.resolve(projectRoot, f));
    }
    else {
        changedFiles = [];
    }
    console.log(`[DocuSync] Scanning ${changedFiles.length > 0 ? changedFiles.length + ' file(s)' : 'all source files'} ` +
        `in ${projectRoot}`);
    const result = await (0, docuSyncService_1.syncDocs)(changedFiles, projectRoot);
    if (result.updatedEndpoints.length === 0) {
        console.log('[DocuSync] openapi.yaml is already in sync — no changes needed');
    }
    else {
        console.log(`[DocuSync] Synced ${result.updatedEndpoints.length} endpoint(s): ` +
            result.updatedEndpoints.join(', '));
    }
    return result;
}
//# sourceMappingURL=docuSync.js.map