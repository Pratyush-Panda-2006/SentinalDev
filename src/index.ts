import * as fs from 'fs';
import * as path from 'path';
import { runPipeline } from './orchestrator';
import { Trigger, CVEAdvisoryTrigger } from './types/index';
import { seedMockTarget } from './seed';

// ─── CLI Argument Parsing ─────────────────────────────────────────────────────

interface ParsedArgs {
  triggerFile?: string;
  demo: boolean;
  /** --trigger-kind GIT_DIFF | CVE_ADVISORY  (from bin/sentineldev.js) */
  triggerKind?: string;
  /** --project-root <path>  (from bin/sentineldev.js) */
  projectRoot?: string;
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  let triggerFile: string | undefined;
  let demo = false;
  let triggerKind: string | undefined;
  let projectRoot: string | undefined;

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

function buildDemoTrigger(): CVEAdvisoryTrigger {
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

function printReport(report: unknown): void {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  PIPELINE REPORT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(JSON.stringify(report, null, 2));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { triggerFile, demo, triggerKind, projectRoot } = parseArgs();

  let trigger: Trigger;

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
    } else {
      trigger = {
        kind: 'GIT_DIFF',
        changedFiles: [],
        projectRoot,
      };
    }
  } else if (demo || (!triggerFile && process.argv.length <= 2)) {
    console.log('[SentinelDev] Running built-in CVE demo...');
    // Seed a fresh copy of mock-target before running
    seedMockTarget();
    trigger = buildDemoTrigger();
  } else if (triggerFile) {
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
      trigger = JSON.parse(substituted) as Trigger;
    } catch (err) {
      console.error(`[SentinelDev] Failed to parse trigger file: ${(err as Error).message}`);
      process.exit(1);
    }

    // Seed mock-target before running so every run starts clean
    seedMockTarget();
  } else {
    console.error('[SentinelDev] Usage: tsx src/index.ts [--demo] [--trigger <file>] [--trigger-kind <kind> --project-root <path>]');
    process.exit(1);
  }

  try {
    const { report, outputs } = await runPipeline(trigger);
    printReport(report);
    console.log('\n┌─────────────────────────────────────────────────────┐');
    console.log('│  📊 Reports written to disk                         │');
    console.log('├─────────────────────────────────────────────────────┤');
    console.log(`│  HTML  → ${outputs.htmlPath}`);
    console.log(`│  PR MD → ${outputs.prCommentPath}`);
    console.log('├─────────────────────────────────────────────────────┤');
    console.log('│  Open in browser: npm run report:open               │');
    console.log('└─────────────────────────────────────────────────────┘\n');
  } catch (err) {
    console.error('[SentinelDev] Pipeline failed:', (err as Error).message);
    if (process.env.DEBUG) {
      console.error((err as Error).stack);
    }
    process.exit(1);
  }
}

main();
