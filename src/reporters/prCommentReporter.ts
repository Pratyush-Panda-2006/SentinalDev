import * as fs from 'fs';
import * as path from 'path';
import { PipelineReport, BlastRadiusScore, CallGraphNode } from '../types/index';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function basename(p: string): string {
  return path.basename(p);
}

const SCORE_EMOJI: Record<BlastRadiusScore, string> = {
  LOW:      '🟢',
  MED:      '🟡',
  CRITICAL: '🔴',
};

const CHANGE_EMOJI: Record<string, string> = {
  added:    '✅',
  modified: '🔄',
  removed:  '❌',
};

const METHOD_BADGE: Record<string, string> = {
  GET:    '`GET`',
  POST:   '`POST`',
  PUT:    '`PUT`',
  PATCH:  '`PATCH`',
  DELETE: '`DELETE`',
};

function scoreEmoji(score: BlastRadiusScore): string {
  return SCORE_EMOJI[score] ?? '⚪';
}

// ─── Call graph as Markdown tree ─────────────────────────────────────────────

function renderCallGraphMd(nodes: CallGraphNode[], indent = 0): string {
  return nodes.map((n) => {
    const prefix = '  '.repeat(indent) + (indent === 0 ? '- ' : '  - ');
    const line = `${prefix}\`${basename(n.file)}\` → \`${n.functionName}\` *(line ${n.line})*`;
    const children = n.calledBy.length > 0
      ? '\n' + renderCallGraphMd(n.calledBy, indent + 1)
      : '';
    return line + children;
  }).join('\n');
}

// ─── Main Markdown generator ──────────────────────────────────────────────────

export function generatePrComment(report: PipelineReport, outputPath: string): void {
  const br = report.blastRadius;
  const rem = report.remediation;
  const ds = report.docSync;
  const trigger = report.trigger;

  const score: BlastRadiusScore = br?.blastRadiusScore ?? 'LOW';

  const triggerLine = trigger.kind === 'CVE_ADVISORY'
    ? `**CVE Advisory** — \`${trigger.cveId}\` · Package: \`${trigger.packageName}\` \`${trigger.affectedVersionRange}\``
    : `**Git Diff** — ${(trigger as { changedFiles: string[] }).changedFiles.length} file(s) changed`;

  const lines: string[] = [];

  // ── Title ──────────────────────────────────────────────────────────────────
  lines.push(`## 🛡️ SentinelDev Pipeline Report`);
  lines.push('');
  lines.push(`> ${triggerLine}`);
  lines.push(`> Completed: \`${report.completedAt}\``);
  lines.push('');

  // ── Executive Summary ──────────────────────────────────────────────────────
  lines.push(`### ${scoreEmoji(score)} Risk Assessment: **${score}**`);
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|---|---|');
  lines.push(`| Blast Radius Score | ${scoreEmoji(score)} **${score}** |`);
  lines.push(`| Call Sites Patched | \`${rem?.callSitesRefactored ?? 0}\` |`);
  lines.push(`| Files Impacted | \`${br?.impactedFiles.length ?? 0}\` |`);
  lines.push(`| Breaking Signatures | \`${br?.breakingSignatures.length ?? 0}\` |`);
  lines.push(`| Endpoints Synced | \`${ds?.updatedEndpoints.length ?? 0}\` |`);
  lines.push('');

  // ── CVE Remediation ────────────────────────────────────────────────────────
  if (rem) {
    lines.push('---');
    lines.push('');
    lines.push(`### 🔧 CVE Remediation — \`${rem.cveId}\``);
    lines.push('');
    lines.push(`**Package:** \`${rem.packageName}\` · **${rem.currentVersion}** → **${rem.targetVersion}**`);
    lines.push('');
    lines.push('**Method replacements:**');
    lines.push('');
    for (const [old, safe] of Object.entries(rem.deprecatedMethods)) {
      lines.push(`- ~~\`${old}()\`~~ → \`${safe}()\``);
    }
    lines.push('');
    lines.push(`**${rem.callSitesRefactored}** call site(s) refactored across **${rem.affectedFiles.length}** file(s):`);
    lines.push('');
    for (const f of rem.affectedFiles) {
      lines.push(`- \`${basename(f)}\``);
    }
    lines.push('');

    if (rem.patch) {
      lines.push('<details>');
      lines.push('<summary>📄 View unified diff</summary>');
      lines.push('');
      lines.push('```diff');
      lines.push(rem.patch.trimEnd());
      lines.push('```');
      lines.push('');
      lines.push('</details>');
      lines.push('');
    }
  }

  // ── Blast Radius ───────────────────────────────────────────────────────────
  if (br) {
    lines.push('---');
    lines.push('');
    lines.push(`### ${scoreEmoji(score)} Blast Radius Analysis`);
    lines.push('');
    lines.push(`**Score:** ${scoreEmoji(score)} \`${score}\``);
    lines.push('');

    if (br.impactedFiles.length > 0) {
      lines.push('**Impacted files:**');
      lines.push('');
      for (const f of br.impactedFiles) {
        lines.push(`- \`${basename(f)}\``);
      }
      lines.push('');
    }

    if (br.breakingSignatures.length > 0) {
      lines.push('<details>');
      lines.push('<summary>⚠️ Breaking signatures (' + br.breakingSignatures.length + ')</summary>');
      lines.push('');
      lines.push('| File | Function |');
      lines.push('|---|---|');
      for (const sig of br.breakingSignatures) {
        // Signatures are "absolutePath:functionName".
        // On Windows paths start with "C:/..." so split on the LAST colon.
        const lastColon = sig.lastIndexOf(':');
        const filePart = lastColon > 0 ? sig.substring(0, lastColon) : sig;
        const fn = lastColon > 0 ? sig.substring(lastColon + 1) : '—';
        lines.push(`| \`${basename(filePart)}\` | \`${fn}\` |`);
      }
      lines.push('');
      lines.push('</details>');
      lines.push('');
    }

    if (br.callGraphTree.length > 0) {
      lines.push('<details>');
      lines.push('<summary>🌐 Call graph tree</summary>');
      lines.push('');
      lines.push(renderCallGraphMd(br.callGraphTree));
      lines.push('');
      lines.push('</details>');
      lines.push('');
    }
  }

  // ── DocuSync ───────────────────────────────────────────────────────────────
  if (ds) {
    lines.push('---');
    lines.push('');
    lines.push('### 📋 OpenAPI Spec Sync');
    lines.push('');

    if (ds.endpointChanges.length === 0) {
      lines.push('✅ `openapi.yaml` was already in sync — no changes required.');
    } else {
      lines.push('| Method | Path | Change |');
      lines.push('|---|---|---|');
      for (const ep of ds.endpointChanges) {
        const badge = METHOD_BADGE[ep.method.toUpperCase()] ?? `\`${ep.method}\``;
        const emoji = CHANGE_EMOJI[ep.changeKind] ?? '🔄';
        lines.push(`| ${badge} | \`${ep.path}\` | ${emoji} ${ep.changeKind} |`);
      }
      lines.push('');

      lines.push('<details>');
      lines.push('<summary>📄 View schema diff</summary>');
      lines.push('');
      lines.push('```diff');
      lines.push(ds.schemaDiff.trimEnd());
      lines.push('```');
      lines.push('');
      lines.push('</details>');
    }
    lines.push('');
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  lines.push('---');
  lines.push('');
  lines.push('*Made with [IBM Bob](https://www.ibm.com/products/watsonx-code-assistant) · SentinelDev Autonomous Lifecycle Engine*');

  fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
}
