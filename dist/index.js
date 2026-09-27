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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const orchestrator_1 = require("./orchestrator");
const seed_1 = require("./seed");
function parseArgs() {
    const args = process.argv.slice(2);
    let triggerFile;
    let demo = false;
    let triggerKind;
    let projectRoot;
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--trigger' && args[i + 1]) {
            triggerFile = args[++i];
        }
        if (args[i] === '--demo') {
            demo = true;
        }
        if (args[i] === '--trigger-kind' && args[i + 1]) {
            triggerKind = args[++i];
        }
        if (args[i] === '--project-root' && args[i + 1]) {
            projectRoot = path.resolve(args[++i]);
        }
    }
    return { triggerFile, demo, triggerKind, projectRoot };
}
// ─── Built-in Demo Trigger ────────────────────────────────────────────────────
function buildDemoTrigger() {
    const projectRoot = path.resolve(__dirname, '..', 'mock-target');
    return {
        kind: 'CVE_ADVISORY',
        cveId: 'CVE-2024-DEMO01',
        packageName: 'crypto-utils',
        affectedVersionRange: '<2.0.0',
        deprecatedMethods: {
            encryptMD5: 'encryptSHA256',
        },
        projectRoot,
    };
}
// ─── Report Pretty-Printer ────────────────────────────────────────────────────
function printReport(report) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  PIPELINE REPORT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(JSON.stringify(report, null, 2));
}
// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    const { triggerFile, demo, triggerKind, projectRoot } = parseArgs();
    let trigger;
    // ── Direct trigger-kind mode (from bin/sentineldev.js) ───────────────────
    if (triggerKind && projectRoot) {
        if (triggerKind === 'CVE_ADVISORY') {
            trigger = {
                kind: 'CVE_ADVISORY',
                cveId: 'CVE-2024-DEMO01',
                packageName: 'crypto-utils',
                affectedVersionRange: '<2.0.0',
                deprecatedMethods: { encryptMD5: 'encryptSHA256' },
                projectRoot,
            };
        }
        else {
            trigger = {
                kind: 'GIT_DIFF',
                changedFiles: [],
                projectRoot,
            };
        }
    }
    else if (demo || (!triggerFile && process.argv.length <= 2)) {
        console.log('[SentinelDev] Running built-in CVE demo...');
        // Seed a fresh copy of mock-target before running
        (0, seed_1.seedMockTarget)();
        trigger = buildDemoTrigger();
    }
    else if (triggerFile) {
        const resolved = path.isAbsolute(triggerFile)
            ? triggerFile
            : path.resolve(process.cwd(), triggerFile);
        if (!fs.existsSync(resolved)) {
            console.error(`[SentinelDev] Trigger file not found: ${resolved}`);
            process.exit(1);
        }
        try {
            const raw = fs.readFileSync(resolved, 'utf-8');
            // Replace __MOCK_TARGET_ROOT__ placeholder with the actual resolved path
            const mockTargetRoot = path.resolve(__dirname, '..', 'mock-target');
            const substituted = raw.replace(/__MOCK_TARGET_ROOT__/g, mockTargetRoot.replace(/\\/g, '/'));
            trigger = JSON.parse(substituted);
        }
        catch (err) {
            console.error(`[SentinelDev] Failed to parse trigger file: ${err.message}`);
            process.exit(1);
        }
        // Seed mock-target before running so every run starts clean
        (0, seed_1.seedMockTarget)();
    }
    else {
        console.error('[SentinelDev] Usage: tsx src/index.ts [--demo] [--trigger <file>] [--trigger-kind <kind> --project-root <path>]');
        process.exit(1);
    }
    try {
        const { report, outputs } = await (0, orchestrator_1.runPipeline)(trigger);
        printReport(report);
        console.log('\n┌─────────────────────────────────────────────────────┐');
        console.log('│  📊 Reports written to disk                         │');
        console.log('├─────────────────────────────────────────────────────┤');
        console.log(`│  HTML  → ${outputs.htmlPath}`);
        console.log(`│  PR MD → ${outputs.prCommentPath}`);
        console.log('├─────────────────────────────────────────────────────┤');
        console.log('│  Open in browser: npm run report:open               │');
        console.log('└─────────────────────────────────────────────────────┘\n');
    }
    catch (err) {
        console.error('[SentinelDev] Pipeline failed:', err.message);
        if (process.env.DEBUG) {
            console.error(err.stack);
        }
        process.exit(1);
    }
}
main();
//# sourceMappingURL=index.js.map