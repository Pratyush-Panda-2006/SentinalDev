#!/usr/bin/env node
/**
 * bin/sentineldev.js — SentinelDev CLI entry point
 *
 * Usage (after `npm link` or `npm install -g sentineldev`):
 *
 *   sentineldev ui               Start the dashboard server on :3000
 *   sentineldev ui --port 8080   Use a custom port
 *   sentineldev audit [path]     Run a GIT_DIFF blast-radius audit on a local repo
 *   sentineldev cve   [path]     Run a CVE_ADVISORY remediation pipeline on a local repo
 *   sentineldev --help           Show this help
 *
 * Local testing without publishing:
 *   npm run build                 Compile TypeScript → dist/
 *   npm link                      Register "sentineldev" in your global node bin
 *   sentineldev ui                Opens http://localhost:3000 (CWD is the default target)
 *   npm unlink sentineldev        Remove the global link when done
 */

'use strict';

const path    = require('path');
const { execFileSync, spawn } = require('child_process');
const fs      = require('fs');

// ─── Resolve package root (works whether run via npm link or npx) ─────────────
const PACKAGE_ROOT = path.resolve(__dirname, '..');

// Prefer compiled JS in dist/; fall back to tsx for development
function resolveTsx() {
  const tsxBin = path.join(PACKAGE_ROOT, 'node_modules', '.bin', 'tsx.cmd');
  if (fs.existsSync(tsxBin)) return tsxBin;
  // Unix
  const tsxUnix = path.join(PACKAGE_ROOT, 'node_modules', '.bin', 'tsx');
  if (fs.existsSync(tsxUnix)) return tsxUnix;
  return null;
}

function resolveEntryDist(name) {
  return path.join(PACKAGE_ROOT, 'dist', name + '.js');
}

function resolveEntrySrc(name) {
  return path.join(PACKAGE_ROOT, 'src', name + '.ts');
}

/** Spawn a long-running process (server) that inherits stdio. */
function spawnProcess(cmd, args, env) {
  const proc = spawn(cmd, args, {
    stdio: 'inherit',
    env: { ...process.env, ...env },
    shell: process.platform === 'win32',
  });
  proc.on('error', (err) => { console.error('[sentineldev]', err.message); process.exit(1); });
  proc.on('exit', (code) => process.exit(code ?? 0));
}

/** Run a one-shot script that exits when done. */
function runScript(cmd, args) {
  try {
    execFileSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  } catch (err) {
    process.exit(err.status ?? 1);
  }
}

// ─── CLI parsing ──────────────────────────────────────────────────────────────

const args    = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h') {
  console.log(`
  SentinelDev — Autonomous Lifecycle & Blast-Radius Engine
  ─────────────────────────────────────────────────────────
  Usage:
    sentineldev ui               Start the web dashboard (http://localhost:3000)
    sentineldev ui --port <n>    Use a custom port
    sentineldev audit [path]     Blast-radius audit (GIT_DIFF trigger)
    sentineldev cve   [path]     CVE remediation pipeline (CVE_ADVISORY trigger)
    sentineldev --help           Show this message

  Examples:
    sentineldev ui
    sentineldev audit ./my-project
    sentineldev cve   /absolute/path/to/repo

  Notes:
    • [path] defaults to the current working directory (process.cwd()).
    • Dashboard UI auto-sets the target to the CWD on startup.
    • Run \`npm link\` in the package root to test locally before publishing.
`);
  process.exit(0);
}

// ─── Command: ui ─────────────────────────────────────────────────────────────

if (command === 'ui') {
  const portFlag = args.indexOf('--port');
  const port     = portFlag !== -1 ? args[portFlag + 1] : undefined;
  const env      = {
    SENTINELDEV_CWD: process.cwd(),
    ...(port ? { PORT: port } : {}),
  };

  // Try compiled dist/ first, then fall back to tsx
  const distEntry = resolveEntryDist('app');
  if (fs.existsSync(distEntry)) {
    console.log(`[sentineldev] Starting server (dist) → http://localhost:${port ?? 3000}`);
    spawnProcess(process.execPath, [distEntry], env);
  } else {
    const tsx = resolveTsx();
    if (!tsx) {
      console.error('[sentineldev] Cannot find tsx or dist/app.js. Run `npm run build` first.');
      process.exit(1);
    }
    const srcEntry = resolveEntrySrc('app');
    console.log(`[sentineldev] Starting server (tsx) → http://localhost:${port ?? 3000}`);
    spawnProcess(tsx, [srcEntry], env);
  }
}

// ─── Command: audit ──────────────────────────────────────────────────────────

else if (command === 'audit') {
  const targetPath = args[1] ? path.resolve(args[1]) : process.cwd();
  console.log(`[sentineldev] Running blast-radius audit on: ${targetPath}`);

  const distEntry = resolveEntryDist('index');
  if (fs.existsSync(distEntry)) {
    runScript(process.execPath, [
      distEntry,
      '--trigger-kind', 'GIT_DIFF',
      '--project-root', targetPath,
    ]);
  } else {
    const tsx = resolveTsx();
    if (!tsx) { console.error('[sentineldev] Cannot find tsx.'); process.exit(1); }
    runScript(tsx, [
      resolveEntrySrc('index'),
      '--trigger-kind', 'GIT_DIFF',
      '--project-root', targetPath,
    ]);
  }
}

// ─── Command: cve ────────────────────────────────────────────────────────────

else if (command === 'cve') {
  const targetPath = args[1] ? path.resolve(args[1]) : process.cwd();
  console.log(`[sentineldev] Running CVE remediation pipeline on: ${targetPath}`);

  const distEntry = resolveEntryDist('index');
  if (fs.existsSync(distEntry)) {
    runScript(process.execPath, [
      distEntry,
      '--trigger-kind', 'CVE_ADVISORY',
      '--project-root', targetPath,
    ]);
  } else {
    const tsx = resolveTsx();
    if (!tsx) { console.error('[sentineldev] Cannot find tsx.'); process.exit(1); }
    runScript(tsx, [
      resolveEntrySrc('index'),
      '--trigger-kind', 'CVE_ADVISORY',
      '--project-root', targetPath,
    ]);
  }
}

// ─── Unknown command ──────────────────────────────────────────────────────────

else {
  console.error(`[sentineldev] Unknown command: "${command}". Run sentineldev --help`);
  process.exit(1);
}
