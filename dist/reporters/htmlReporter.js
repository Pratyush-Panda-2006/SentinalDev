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
exports.generateHtmlReport = generateHtmlReport;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// ─── Helpers ──────────────────────────────────────────────────────────────────
function esc(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function basename(p) {
    return path.basename(p);
}
const SCORE_COLORS = {
    LOW: { bg: '#f0fdf4', text: '#166534', border: '#86efac', badge: '#22c55e' },
    MED: { bg: '#fffbeb', text: '#92400e', border: '#fcd34d', badge: '#f59e0b' },
    CRITICAL: { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5', badge: '#ef4444' },
};
// ─── Mermaid call graph ───────────────────────────────────────────────────────
function buildMermaidGraph(nodes) {
    const edges = new Set();
    const seen = new Set();
    function nodeId(file, fn) {
        return (basename(file).replace(/\W/g, '_') + '_' + fn.replace(/\W/g, '_')).substring(0, 40);
    }
    function nodeLabel(file, fn) {
        const f = basename(file);
        return fn === '<module>' ? f : `${f}\\n${fn}()`;
    }
    function walk(nodes) {
        for (const n of nodes) {
            const parentId = nodeId(n.file, n.functionName);
            if (!seen.has(parentId)) {
                seen.add(parentId);
            }
            for (const child of n.calledBy) {
                const childId = nodeId(child.file, child.functionName);
                const edge = `  ${parentId}["${nodeLabel(n.file, n.functionName)}"] --> ${childId}["${nodeLabel(child.file, child.functionName)}"]`;
                edges.add(edge);
                walk([child]);
            }
        }
    }
    walk(nodes);
    if (edges.size === 0) {
        return 'graph LR\n  A["No call graph data"]';
    }
    return 'graph LR\n' + [...edges].join('\n');
}
// ─── Diff renderer ───────────────────────────────────────────────────────────
function renderDiff(patch) {
    if (!patch || patch.trim() === '') {
        return '<p style="color:#6b7280;font-style:italic;padding:12px 16px;">No changes recorded.</p>';
    }
    const lines = patch.split('\n');
    const rendered = lines.map((line) => {
        if (line.startsWith('+++') || line.startsWith('---')) {
            return `<div class="diff-file">${esc(line)}</div>`;
        }
        if (line.startsWith('@@')) {
            return `<div class="diff-hunk">${esc(line)}</div>`;
        }
        if (line.startsWith('+')) {
            return `<div class="diff-add">${esc(line)}</div>`;
        }
        if (line.startsWith('-')) {
            return `<div class="diff-del">${esc(line)}</div>`;
        }
        return `<div class="diff-ctx">${esc(line)}</div>`;
    });
    return rendered.join('');
}
// ─── Spec sync table ─────────────────────────────────────────────────────────
function renderSpecTable(report) {
    const ds = report.docSync;
    if (!ds || ds.endpointChanges.length === 0) {
        return '<p style="color:#6b7280;font-style:italic;padding:8px 0;">No endpoint changes detected.</p>';
    }
    const kindBadge = (k) => {
        const color = k === 'added' ? '#22c55e' : k === 'removed' ? '#ef4444' : '#f59e0b';
        return `<span style="background:${color};color:#fff;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600;text-transform:uppercase;">${k}</span>`;
    };
    const methodBadge = (m) => {
        const colors = {
            GET: '#3b82f6', POST: '#8b5cf6', PUT: '#f59e0b',
            PATCH: '#14b8a6', DELETE: '#ef4444',
        };
        const bg = colors[m.toUpperCase()] ?? '#6b7280';
        return `<span style="background:${bg};color:#fff;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:700;">${m.toUpperCase()}</span>`;
    };
    const rows = ds.endpointChanges.map((ep) => `
    <tr>
      <td style="padding:10px 14px;">${methodBadge(ep.method)}</td>
      <td style="padding:10px 14px;font-family:monospace;font-size:13px;">${esc(ep.path)}</td>
      <td style="padding:10px 14px;">${kindBadge(ep.changeKind)}</td>
    </tr>`).join('');
    return `
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb;">
          <th style="padding:10px 14px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Method</th>
          <th style="padding:10px 14px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Path</th>
          <th style="padding:10px 14px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Change</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}
// ─── Breaking signatures table ────────────────────────────────────────────────
function renderBreakingSignatures(report) {
    const br = report.blastRadius;
    if (!br || br.breakingSignatures.length === 0) {
        return '<p style="color:#6b7280;font-style:italic;padding:8px 0;">No breaking signatures detected.</p>';
    }
    const rows = br.breakingSignatures.map((sig) => {
        // Split on last colon to handle Windows absolute paths (e.g. "D:/path:fnName")
        const lastColon = sig.lastIndexOf(':');
        const filePart = lastColon > 0 ? sig.substring(0, lastColon) : sig;
        const fn = lastColon > 0 ? sig.substring(lastColon + 1) : '';
        return `<tr>
      <td style="padding:8px 14px;font-family:monospace;font-size:12px;color:#6b7280;">${esc(basename(filePart))}</td>
      <td style="padding:8px 14px;font-family:monospace;font-size:13px;color:#1f2328;">${esc(fn)}</td>
    </tr>`;
    });
    return `
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb;">
          <th style="padding:8px 14px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">File</th>
          <th style="padding:8px 14px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Function</th>
        </tr>
      </thead>
      <tbody>${rows.join('')}</tbody>
    </table>`;
}
// ─── Main HTML generator ──────────────────────────────────────────────────────
function generateHtmlReport(report, outputPath) {
    const br = report.blastRadius;
    const rem = report.remediation;
    const ds = report.docSync;
    const trigger = report.trigger;
    const score = br?.blastRadiusScore ?? 'LOW';
    const scoreColors = SCORE_COLORS[score];
    const triggerLabel = trigger.kind === 'CVE_ADVISORY'
        ? `CVE Advisory — ${trigger.cveId} (${trigger.packageName})`
        : `Git Diff — ${trigger.changedFiles.length} file(s) changed`;
    const mermaidGraph = br ? buildMermaidGraph(br.callGraphTree) : 'graph LR\n  A["No blast radius data"]';
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SentinelDev Pipeline Report</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, "Segoe UI", system-ui, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      background: #f3f4f6;
      color: #1f2328;
    }
    .page { max-width: 960px; margin: 0 auto; padding: 32px 20px 64px; }
    .header {
      background: #1f2328;
      color: #fff;
      border-radius: 12px;
      padding: 28px 32px;
      margin-bottom: 24px;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }
    .header-title { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
    .header-sub { font-size: 13px; color: #9ca3af; margin-top: 4px; }
    .header-ts { font-size: 11px; color: #6b7280; margin-top: 8px; font-family: monospace; }
    .score-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: ${scoreColors.badge};
      color: #fff;
      border-radius: 8px;
      padding: 6px 16px;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.5px;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 14px;
      margin-bottom: 24px;
    }
    .metric-card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 18px 20px;
    }
    .metric-value { font-size: 32px; font-weight: 700; color: #1f2328; line-height: 1; }
    .metric-label { font-size: 12px; color: #6b7280; margin-top: 6px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
    .section {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      margin-bottom: 20px;
      overflow: hidden;
    }
    .section-header {
      padding: 14px 20px;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      align-items: center;
      gap: 10px;
      background: #f9fafb;
    }
    .section-title { font-size: 14px; font-weight: 600; color: #1f2328; }
    .section-body { padding: 20px; }
    .risk-banner {
      background: ${scoreColors.bg};
      border: 1px solid ${scoreColors.border};
      border-radius: 10px;
      padding: 16px 20px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .risk-banner-score {
      font-size: 18px;
      font-weight: 800;
      color: ${scoreColors.text};
      white-space: nowrap;
    }
    .risk-banner-body { color: ${scoreColors.text}; font-size: 13px; line-height: 1.5; }
    .mermaid-wrap {
      background: #fafafa;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      overflow-x: auto;
      text-align: center;
    }
    .diff-viewer {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 12px;
      line-height: 1.5;
      background: #0d1117;
      border-radius: 8px;
      overflow-x: auto;
      padding: 4px 0;
    }
    .diff-viewer div { padding: 1px 16px; white-space: pre; }
    .diff-add  { background: #0d2818; color: #3fb950; }
    .diff-del  { background: #2d0f0f; color: #f85149; }
    .diff-hunk { background: #161b22; color: #58a6ff; }
    .diff-file { background: #161b22; color: #e3b341; font-weight: 600; }
    .diff-ctx  { color: #8b949e; }
    .trigger-pill {
      display: inline-block;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      border-radius: 20px;
      padding: 3px 12px;
      font-size: 12px;
      font-weight: 500;
    }
    .impacted-list { list-style: none; }
    .impacted-list li {
      padding: 6px 0;
      border-bottom: 1px solid #f3f4f6;
      font-family: monospace;
      font-size: 12px;
      color: #374151;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .impacted-list li::before { content: "📄"; font-size: 11px; }
    .footer {
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="page">

    <!-- Header -->
    <div class="header">
      <div>
        <div class="header-title">🛡️ SentinelDev Pipeline Report</div>
        <div class="header-sub">${esc(triggerLabel)}</div>
        <div class="header-ts">Completed: ${esc(report.completedAt)}</div>
      </div>
      <div class="score-badge">⚡ ${score}</div>
    </div>

    <!-- Risk Banner -->
    <div class="risk-banner">
      <div class="risk-banner-score">BLAST RADIUS: ${score}</div>
      <div class="risk-banner-body">
        ${br
        ? `${br.impactedFiles.length} file(s) impacted &nbsp;·&nbsp; ${br.breakingSignatures.length} breaking signature(s) detected`
        : 'No blast radius analysis available.'}
      </div>
    </div>

    <!-- Quick Metrics -->
    <div class="metrics">
      <div class="metric-card">
        <div class="metric-value">${rem?.callSitesRefactored ?? 0}</div>
        <div class="metric-label">Call Sites Patched</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${br?.impactedFiles.length ?? 0}</div>
        <div class="metric-label">Files Impacted</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${ds?.updatedEndpoints.length ?? 0}</div>
        <div class="metric-label">Endpoints Synced</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${br?.breakingSignatures.length ?? 0}</div>
        <div class="metric-label">Breaking Signatures</div>
      </div>
    </div>

    <!-- Call Graph -->
    <div class="section">
      <div class="section-header">
        <span>🌐</span>
        <span class="section-title">Call Graph — Blast Radius Traversal</span>
      </div>
      <div class="section-body">
        <div class="mermaid-wrap">
          <div class="mermaid">
${esc(mermaidGraph)}
          </div>
        </div>
        ${br && br.impactedFiles.length > 0 ? `
        <div style="margin-top:16px;">
          <div style="font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Impacted Files</div>
          <ul class="impacted-list">
            ${br.impactedFiles.map((f) => `<li>${esc(basename(f))}</li>`).join('')}
          </ul>
        </div>` : ''}
      </div>
    </div>

    <!-- Breaking Signatures -->
    <div class="section">
      <div class="section-header">
        <span>⚠️</span>
        <span class="section-title">Breaking Signatures</span>
      </div>
      <div class="section-body">
        ${renderBreakingSignatures(report)}
      </div>
    </div>

    <!-- CVE Remediation Diff -->
    ${rem ? `
    <div class="section">
      <div class="section-header">
        <span>🔧</span>
        <span class="section-title">CVE Remediation — ${esc(rem.cveId)}</span>
        <span class="trigger-pill">${esc(rem.packageName)} ${esc(rem.currentVersion)} → ${esc(rem.targetVersion)}</span>
      </div>
      <div class="section-body">
        <div style="margin-bottom:12px;display:flex;gap:24px;font-size:13px;">
          ${Object.entries(rem.deprecatedMethods).map(([old, safe]) => `<div><span style="color:#f85149;font-family:monospace;">${esc(old)}()</span>
             <span style="color:#6b7280;margin:0 6px;">→</span>
             <span style="color:#3fb950;font-family:monospace;">${esc(safe)}()</span></div>`).join('')}
        </div>
        <div class="diff-viewer">${renderDiff(rem.patch)}</div>
      </div>
    </div>` : ''}

    <!-- Spec Sync -->
    <div class="section">
      <div class="section-header">
        <span>📋</span>
        <span class="section-title">OpenAPI Spec Sync — DocuSync Results</span>
        ${ds ? `<span class="trigger-pill">${esc(path.basename(ds.specPath))}</span>` : ''}
      </div>
      <div class="section-body">
        ${renderSpecTable(report)}
        ${ds && ds.schemaDiff ? `
        <div style="margin-top:16px;">
          <div style="font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Schema Diff</div>
          <div class="diff-viewer">${renderDiff(ds.schemaDiff)}</div>
        </div>` : ''}
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">Made with IBM Bob &nbsp;·&nbsp; SentinelDev Autonomous Lifecycle Engine</div>

  </div>

  <script>
    mermaid.initialize({ startOnLoad: true, theme: 'neutral', securityLevel: 'loose' });
  </script>
</body>
</html>`;
    fs.writeFileSync(outputPath, html, 'utf-8');
}
//# sourceMappingURL=htmlReporter.js.map