/* global mermaid */
'use strict';

// ─── State ────────────────────────────────────────────────────────────────────
let isRunning = false;
const logs = [];

// ─── Page / nav switching ─────────────────────────────────────────────────────

function switchNav(btn, page) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  document.getElementById('page-overview').style.display = page === 'overview' ? 'flex' : 'none';
  document.getElementById('page-logs').style.display     = page === 'logs'     ? 'flex' : 'none';

  if (page === 'logs') {
    document.getElementById('nav-log-dot').className = 'status-dot dot-grey';
  }
}

// ─── Tab switching ────────────────────────────────────────────────────────────

function switchTab(btn, panelId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(panelId).classList.add('active');
}

// ─── Terminal / logging ───────────────────────────────────────────────────────

function pushLog(line, kind) {
  logs.push({ line, kind });
  const term = document.getElementById('terminal-output');
  const span = document.createElement('span');
  span.className = 'log-' + (kind || 'default');
  span.textContent = line + '\n';
  if (term.firstChild && term.firstChild.nodeType === 3 && term.firstChild.textContent === 'Waiting for pipeline run...') {
    term.textContent = '';
  }
  term.appendChild(span);
  term.scrollTop = term.scrollHeight;
  // Flash the log dot in the nav
  document.getElementById('nav-log-dot').className = 'status-dot dot-amber';
}

function clearLogs() {
  logs.length = 0;
  const term = document.getElementById('terminal-output');
  term.textContent = 'Logs cleared.\n';
  document.getElementById('nav-log-dot').className = 'status-dot dot-grey';
}

// ─── Synthesise terminal output from the report ───────────────────────────────

function hydrateLogsFromReport(report, triggerKind) {
  const term = document.getElementById('terminal-output');
  term.textContent = '';

  const lines = [
    { t: '════════════════════════════════════════════════════', k: 'stage' },
    { t: `  SentinelDev Pipeline — ${triggerKind}`, k: 'stage' },
    { t: `  Project: ${report.trigger.projectRoot}`, k: 'muted' },
    { t: '════════════════════════════════════════════════════', k: 'stage' },
  ];

  if (report.remediation) {
    const r = report.remediation;
    lines.push({ t: '', k: 'default' });
    lines.push({ t: '── Stage 1/3: AutoRemediator ─────────────────────────────', k: 'stage' });
    lines.push({ t: `[AutoRemediator] Remediating ${r.cveId} (${r.packageName})`, k: 'ok' });
    lines.push({ t: `[AutoRemediator] Refactored ${r.callSitesRefactored} call site(s) across ${r.affectedFiles.length} file(s)`, k: 'ok' });
    r.affectedFiles.forEach(f => lines.push({ t: `  • ${f.split('/').pop() || f}`, k: 'muted' }));
  }

  if (report.blastRadius) {
    const b = report.blastRadius;
    lines.push({ t: '', k: 'default' });
    const stageLabel = report.remediation ? '── Stage 2/3: BlastRadiusAuditor' : '── Stage 1/2: BlastRadiusAuditor';
    lines.push({ t: stageLabel + ' ────────────────────────', k: 'stage' });
    lines.push({ t: `[BlastRadiusAuditor] Analysing ${b.changedFiles.length} changed file(s)`, k: 'ok' });
    lines.push({
      t: `[BlastRadiusAuditor] Score: ${b.blastRadiusScore} | Impacted: ${b.impactedFiles.length} file(s) | Breaking: ${b.breakingSignatures.length}`,
      k: b.blastRadiusScore === 'CRITICAL' ? 'err' : b.blastRadiusScore === 'MED' ? 'warn' : 'ok',
    });
  }

  if (report.docSync) {
    const d = report.docSync;
    lines.push({ t: '', k: 'default' });
    const stageLabel = report.remediation ? '── Stage 3/3: DocuSync' : '── Stage 2/2: DocuSync';
    lines.push({ t: stageLabel + ' ──────────────────────────────────', k: 'stage' });
    if (d.updatedEndpoints.length > 0) {
      lines.push({ t: `[DocuSync] Synced ${d.updatedEndpoints.length} endpoint(s): ${d.updatedEndpoints.join(', ')}`, k: 'ok' });
    } else {
      lines.push({ t: '[DocuSync] openapi.yaml already in sync — no changes needed', k: 'muted' });
    }
  }

  lines.push({ t: '', k: 'default' });
  lines.push({ t: '── Reporters ────────────────────────────────────────', k: 'stage' });
  lines.push({ t: '[Reporter] HTML report written → sentinel-report.html', k: 'ok' });
  lines.push({ t: '[Reporter] PR comment written  → sentinel-pr-comment.md', k: 'ok' });
  lines.push({ t: '', k: 'default' });
  lines.push({ t: '════════════════════════════════════════════════════', k: 'stage' });
  lines.push({ t: `  Pipeline complete at ${report.completedAt}`, k: 'ok' });
  lines.push({ t: '════════════════════════════════════════════════════', k: 'stage' });

  lines.forEach(({ t, k }) => pushLog(t, k));
}

// ─── Metrics update ───────────────────────────────────────────────────────────

function updateMetrics(report) {
  const br  = report.blastRadius;
  const rem = report.remediation;
  const ds  = report.docSync;
  const score = br ? br.blastRadiusScore : 'LOW';

  // Risk card
  const scoreEl = document.getElementById('risk-score');
  const descEl  = document.getElementById('risk-desc');
  scoreEl.textContent = score;
  scoreEl.className   = 'risk-score-text ' + score.toLowerCase();
  descEl.textContent  = br
    ? `${br.impactedFiles.length} file(s) impacted · ${br.breakingSignatures.length} breaking signature(s)`
    : 'No blast radius data';

  const badge = document.getElementById('target-badge');
  const cls   = score === 'CRITICAL' ? 'badge-red' : score === 'MED' ? 'badge-amber' : 'badge-green';
  badge.className     = 'badge ' + cls;
  badge.textContent   = `● ${score} / pipeline complete`;

  // Metric counters
  document.getElementById('m-patched').textContent   = rem ? String(rem.callSitesRefactored) : '0';
  document.getElementById('m-impacted').textContent  = br  ? String(br.impactedFiles.length) : '0';
  document.getElementById('m-endpoints').textContent = ds  ? String(ds.updatedEndpoints.length) : '0';
  document.getElementById('m-breaking').textContent  = br  ? String(br.breakingSignatures.length) : '0';
}

// ─── Call graph (Mermaid) ─────────────────────────────────────────────────────

function basename(p) {
  return (p || '').split(/[\\/]/).pop() || p;
}

function buildMermaidDef(nodes) {
  const edges = new Set();

  function nodeId(file, fn) {
    return (basename(file).replace(/\W/g, '_') + '_' + (fn || '').replace(/\W/g, '_')).slice(0, 40);
  }
  function nodeLabel(file, fn) {
    const f = basename(file);
    return (!fn || fn === '<module>') ? f : `${f}\\n${fn}()`;
  }

  function walk(nodeList) {
    nodeList.forEach(n => {
      const pid = nodeId(n.file, n.functionName);
      n.calledBy.forEach(child => {
        const cid = nodeId(child.file, child.functionName);
        edges.add(`  ${pid}["${nodeLabel(n.file, n.functionName)}"] --> ${cid}["${nodeLabel(child.file, child.functionName)}"]`);
        walk([child]);
      });
    });
  }

  walk(nodes);

  if (edges.size === 0) {
    return 'graph LR\n  A["No call graph data — run a pipeline"]';
  }
  return 'graph LR\n' + [...edges].join('\n');
}

async function renderMermaid(def) {
  const container = document.getElementById('graph-container');
  container.innerHTML = '';
  try {
    const uid = 'mermaid-' + Date.now();
    const { svg } = await mermaid.render(uid, def);
    container.innerHTML = svg;
  } catch {
    container.innerHTML = `<pre style="color:var(--muted);font-size:11px;text-align:left;white-space:pre-wrap;">${def}</pre>`;
  }
}

// ─── Diff viewer ──────────────────────────────────────────────────────────────

function renderDiff(patch) {
  if (!patch || !patch.trim()) {
    return '<div class="empty-state">No diff available.</div>';
  }
  const lines = patch.split('\n').map(line => {
    const esc = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (line.startsWith('+++') || line.startsWith('---')) return `<div class="diff-file">${esc}</div>`;
    if (line.startsWith('@@'))  return `<div class="diff-hunk">${esc}</div>`;
    if (line.startsWith('+'))   return `<div class="diff-add">${esc}</div>`;
    if (line.startsWith('-'))   return `<div class="diff-del">${esc}</div>`;
    return `<div class="diff-ctx">${esc}</div>`;
  });
  return `<div class="diff-viewer">${lines.join('')}</div>`;
}

// ─── Spec sync table ──────────────────────────────────────────────────────────

function methodClass(m) {
  const map = { GET: 'm-get', POST: 'm-post', PUT: 'm-put', PATCH: 'm-patch', DELETE: 'm-delete' };
  return map[m.toUpperCase()] || '';
}

function changeKindBadge(k) {
  const colors = { added: '#22c55e', modified: '#f59e0b', removed: '#ef4444' };
  const c = colors[k] || '#6b7280';
  return `<span style="background:${c};color:#000;border-radius:4px;padding:1px 7px;font-size:11px;font-weight:600;text-transform:uppercase;">${k}</span>`;
}

function renderSpecTable(ds) {
  if (!ds || ds.endpointChanges.length === 0) {
    return '<div class="empty-state">No endpoint changes detected — spec is already in sync.</div>';
  }
  const rows = ds.endpointChanges.map(ep =>
    `<tr>
      <td><span class="method-badge ${methodClass(ep.method)}">${ep.method.toUpperCase()}</span></td>
      <td style="font-family:monospace;font-size:13px;">${ep.path}</td>
      <td>${changeKindBadge(ep.changeKind)}</td>
    </tr>`
  ).join('');

  const schemaSection = ds.schemaDiff ? `
    <div style="margin-top:20px;">
      <div class="section-head">Schema Diff</div>
      ${renderDiff(ds.schemaDiff)}
    </div>` : '';

  return `
    <table class="spec-table">
      <thead><tr>
        <th>Method</th><th>Path</th><th>Change</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${schemaSection}`;
}

// ─── Breaking signatures table ────────────────────────────────────────────────

function renderBreakingTable(br) {
  if (!br || br.breakingSignatures.length === 0) {
    return '<div class="empty-state">No breaking signatures detected.</div>';
  }
  const rows = br.breakingSignatures.map(sig => {
    const lastColon = sig.lastIndexOf(':');
    const file = lastColon > 0 ? basename(sig.substring(0, lastColon)) : sig;
    const fn   = lastColon > 0 ? sig.substring(lastColon + 1) : '—';
    return `<tr>
      <td style="font-family:monospace;font-size:12px;color:var(--muted);">${file}</td>
      <td style="font-family:monospace;font-size:13px;">${fn}</td>
    </tr>`;
  }).join('');
  return `
    <table class="spec-table">
      <thead><tr><th>File</th><th>Function</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ─── Loading state ────────────────────────────────────────────────────────────

function setLoading(loading) {
  isRunning = loading;
  const btnCve   = document.getElementById('btn-cve');
  const btnBlast = document.getElementById('btn-blast');
  const badge    = document.getElementById('target-badge');

  btnCve.disabled   = loading;
  btnBlast.disabled = loading;

  if (loading) {
    btnCve.innerHTML   = '<span class="spinner"></span> Running…';
    btnBlast.innerHTML = '<span class="spinner"></span> Running…';
    badge.className    = 'badge badge-amber';
    badge.textContent  = '● Running pipeline…';
  } else {
    btnCve.innerHTML   = '▶ Run CVE Pipeline';
    btnBlast.innerHTML = '◎ AST Blast-Radius Audit';
  }
}

// ─── Main pipeline runner ─────────────────────────────────────────────────────

async function runPipeline(triggerKind) {
  if (isRunning) return;

  setLoading(true);

  const repoPath = document.getElementById('repo-path').value.trim();

  // Pre-clear terminal
  const term = document.getElementById('terminal-output');
  term.textContent = '';
  pushLog('Connecting to SentinelDev server…', 'muted');
  pushLog(`Trigger: ${triggerKind}${repoPath ? ' | repo: ' + repoPath : ' | repo: mock-target (demo)'}`, 'muted');

  try {
    const body = { triggerKind };
    if (repoPath) body.repoPath = repoPath;

    const res  = await fetch('/api/run-pipeline', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      pushLog('Pipeline error: ' + (data.error || 'Unknown error'), 'err');
      document.getElementById('target-badge').className = 'badge badge-red';
      document.getElementById('target-badge').textContent = '● error';
      return;
    }

    const report = data.report;

    // Update metrics
    updateMetrics(report);

    // Synthesise terminal log
    hydrateLogsFromReport(report, triggerKind);

    // Call graph
    const graphDef = report.blastRadius && report.blastRadius.callGraphTree.length > 0
      ? buildMermaidDef(report.blastRadius.callGraphTree)
      : 'graph LR\n  A["api.ts"] --> B["userService.ts"]\n  A --> C["reportService.ts"]\n  B --> D["crypto-utils.ts"]\n  C --> D';
    await renderMermaid(graphDef);

    // Diff tab
    const diffPatch = report.remediation?.patch || report.gitDiff || '';
    document.getElementById('diff-container').innerHTML = renderDiff(diffPatch);

    // Spec tab
    document.getElementById('spec-container').innerHTML = renderSpecTable(report.docSync);

    // Breaking signatures tab
    document.getElementById('breaking-container').innerHTML = renderBreakingTable(report.blastRadius);

    // Flash nav log dot
    document.getElementById('nav-log-dot').className = 'status-dot dot-green';

  } catch (err) {
    pushLog('Network error: ' + err.message, 'err');
    document.getElementById('target-badge').className = 'badge badge-red';
    document.getElementById('target-badge').textContent = '● server unreachable';
  } finally {
    setLoading(false);
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  darkMode: true,
});

// Render the default placeholder graph on load
(async () => {
  const defaultGraph =
    'graph LR\n' +
    '  api["api.ts"] --> us["userService.ts"]\n' +
    '  api --> rs["reportService.ts"]\n' +
    '  us --> cu["crypto-utils.ts"]\n' +
    '  rs --> cu\n' +
    '  style cu fill:#2b0c10,stroke:#da3633,color:#f85149\n' +
    '  style api fill:#1c2128,stroke:#58a6ff,color:#58a6ff\n' +
    '  style us fill:#1c2128,stroke:#388bfd,color:#cdd9e5\n' +
    '  style rs fill:#1c2128,stroke:#388bfd,color:#cdd9e5';
  await renderMermaid(defaultGraph);
})();
