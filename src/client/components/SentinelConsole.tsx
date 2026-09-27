import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Activity,
  ExternalLink,
  ChevronDown,
  ShieldAlert,
} from 'lucide-react';

export interface SentinelConsoleProps {
  isOpen?: boolean;
  onClose?: () => void;
  autoRunTrigger?: 'CVE_ADVISORY' | 'GIT_DIFF' | null;
  initialTab?: 'graph' | 'diff' | 'spec' | 'breaking' | 'logs';
  embedded?: boolean;
  onNavigateDemo?: (action?: string) => void;
}

export const SentinelConsole: React.FC<SentinelConsoleProps> = ({
  isOpen = true,
  onClose,
  autoRunTrigger,
  initialTab = 'graph',
  embedded = false,
  onNavigateDemo,
}) => {
  // Input states
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<{ active: boolean; pct: number; label: string }>({
    active: false,
    pct: 0,
    label: '',
  });

  const [extStatus, setExtStatus] = useState<string>('');

  // Active view tab: 'graph' | 'diff' | 'spec' | 'breaking' | 'logs'
  const [activeTab, setActiveTab] = useState<'graph' | 'diff' | 'spec' | 'breaking' | 'logs'>(initialTab);
  const [embeddedPreviewTab, setEmbeddedPreviewTab] = useState<'graph' | 'diff' | 'spec' | 'terminal' | 'ai'>('graph');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // Logs state initialized with active orchestrator diagnostics
  const [logs, setLogs] = useState<Array<{ text: string; kind: string }>>([
    { text: '[00:00.01] [AST-Orchestrator] IBM Bob 2.0 multi-agent engine initialized.', kind: 'ok' },
    { text: '[00:00.02] [AutoRemediator] Loaded AST catalog: CVE-2024-CRYPTO-MD5 active.', kind: 'default' },
    { text: '[00:00.04] [BlastRadiusAuditor] Transitive caller graph: 4 dependency nodes discovered.', kind: 'default' },
    { text: '[00:00.06] [DocuSync] Express AST route introspection mapped to openapi.yaml.', kind: 'default' },
    { text: '[00:00.08] [Guardian] Status: Standby. Click [▶ Run CVE Pipeline] to execute.', kind: 'stage' },
  ]);

  // Report state
  const [report, setReport] = useState<any>(null);
  const [targetLabel, setTargetLabel] = useState<string>('MED / MOCK-TARGET (DEMO)');
  const [riskScore, setRiskScore] = useState<string>('MED');
  const [riskDesc, setRiskDesc] = useState<string>('1 file(s) impacted · 4 breaking signature(s)');

  // Metrics
  const [metrics, setMetrics] = useState({
    patched: '2',
    impacted: '1',
    endpoints: '1',
    breaking: '4',
  });

  // Scenario dropdown open
  const [scenarioOpen, setScenarioOpen] = useState(false);

  const terminalRef = useRef<HTMLDivElement | null>(null);
  const graphContainerRef = useRef<HTMLDivElement | null>(null);

  // Helper to append logs
  const pushLog = (text: string, kind = 'default') => {
    setLogs((prev) => [...prev, { text, kind }]);
  };

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  // Handle auto-run if opened with trigger
  useEffect(() => {
    if (isOpen && autoRunTrigger) {
      runPipeline(autoRunTrigger);
    }
  }, [isOpen, autoRunTrigger]);

  // Mermaid render whenever graph or tab changes
  useEffect(() => {
    if (activeTab === 'graph' && graphContainerRef.current) {
      renderGraph();
    }
  }, [activeTab, report]);

  const renderGraph = async () => {
    if (!graphContainerRef.current) return;
    const mermaid = (window as any).mermaid;
    if (!mermaid) return;

    let def =
      'graph LR\n' +
      '  api["api.ts"] --> us["userService.ts"]\n' +
      '  api --> rs["reportService.ts"]\n' +
      '  us --> cu["crypto-utils.ts"]\n' +
      '  rs --> cu\n' +
      '  style cu fill:#2b0c10,stroke:#da3633,color:#f85149\n' +
      '  style api fill:#1c2128,stroke:#58a6ff,color:#58a6ff\n' +
      '  style us fill:#1c2128,stroke:#388bfd,color:#cdd9e5\n' +
      '  style rs fill:#1c2128,stroke:#388bfd,color:#cdd9e5';

    if (report?.blastRadius?.callGraphTree?.length > 0) {
      const edges = new Set<string>();
      const basename = (p: string) => (p || '').split(/[\\/]/).pop() || p;
      const nodeId = (f: string, fn: string) =>
        (basename(f).replace(/\W/g, '_') + '_' + (fn || '').replace(/\W/g, '_')).slice(0, 40);
      const nodeLabel = (f: string, fn: string) => {
        const base = basename(f);
        return !fn || fn === '<module>' ? base : `${base}\\n${fn}()`;
      };

      const walk = (nodes: any[]) => {
        nodes.forEach((n) => {
          const pid = nodeId(n.file, n.functionName);
          n.calledBy?.forEach((child: any) => {
            const cid = nodeId(child.file, child.functionName);
            edges.add(
              `  ${pid}["${nodeLabel(n.file, n.functionName)}"] --> ${cid}["${nodeLabel(
                child.file,
                child.functionName
              )}"]`
            );
            walk([child]);
          });
        });
      };

      walk(report.blastRadius.callGraphTree);
      if (edges.size > 0) {
        def = 'graph LR\n' + [...edges].join('\n');
      }
    }

    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose',
        darkMode: true,
      });
      const uid = 'mermaid-' + Date.now();
      const { svg } = await mermaid.render(uid, def);
      graphContainerRef.current.innerHTML = svg;
    } catch {
      graphContainerRef.current.innerHTML = `<pre class="text-xs text-white/50 text-left p-4">${def}</pre>`;
    }
  };

  const applyReport = async (rep: any, triggerKind: string, source: string) => {
    setReport(rep);
    const br = rep.blastRadius;
    const rem = rep.remediation;
    const ds = rep.docSync;
    const score = br ? br.blastRadiusScore : 'LOW';

    setRiskScore(score);
    setRiskDesc(
      br
        ? `${br.impactedFiles?.length || 0} file(s) impacted · ${br.breakingSignatures?.length || 0} breaking signature(s)`
        : 'Analysis completed'
    );
    setTargetLabel(`${score} / ${source}`);

    setMetrics({
      patched: rem ? String(rem.callSitesRefactored) : '0',
      impacted: br ? String(br.impactedFiles?.length || 0) : '0',
      endpoints: ds ? String(ds.updatedEndpoints?.length || 0) : '0',
      breaking: br ? String(br.breakingSignatures?.length || 0) : '0',
    });

    // Hydrate logs
    pushLog('════════════════════════════════════════════════════', 'stage');
    pushLog(`  SentinelDev Pipeline — ${triggerKind}`, 'stage');
    pushLog(`  Target: ${source}`, 'muted');
    pushLog('════════════════════════════════════════════════════', 'stage');

    if (rem) {
      pushLog('── Stage 1/3: AutoRemediator ─────────────────────────────', 'stage');
      pushLog(`[AutoRemediator] Remediating ${rem.cveId} (${rem.packageName})`, 'ok');
      pushLog(
        `[AutoRemediator] Refactored ${rem.callSitesRefactored} call site(s) across ${rem.affectedFiles?.length || 0} file(s)`,
        'ok'
      );
    }
    if (br) {
      pushLog('── Stage 2/3: BlastRadiusAuditor ────────────────────────', 'stage');
      pushLog(`[BlastRadiusAuditor] Score: ${br.blastRadiusScore} | Impacted: ${br.impactedFiles?.length || 0} file(s)`, 'ok');
    }
    if (ds) {
      pushLog('── Stage 3/3: DocuSync ──────────────────────────────────', 'stage');
      pushLog(`[DocuSync] Synced ${ds.updatedEndpoints?.length || 0} endpoint(s)`, 'ok');
    }
    pushLog(`Pipeline complete at ${rep.completedAt || new Date().toLocaleTimeString()}`, 'ok');
  };

  // Run pipeline from URL / mock-target
  const runPipeline = async (triggerKind: 'CVE_ADVISORY' | 'GIT_DIFF') => {
    if (isRunning) return;

    if (repoUrl.trim()) {
      await runClone(triggerKind, repoUrl.trim(), branch.trim());
      return;
    }

    setIsRunning(true);
    setProgress({ active: true, pct: 25, label: `Executing ${triggerKind} on mock-target demo...` });
    setLogs([]);
    pushLog(`[Pipeline] Initialising SentinelDev ${triggerKind}...`, 'stage');
    pushLog(`[Pipeline] Target: mock-target (demo)`, 'muted');

    try {
      setProgress({ active: true, pct: 55, label: 'Running AST analysis and agents...' });
      const res = await fetch('/api/run-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggerKind }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        pushLog('Pipeline error: ' + (data.error || 'Server error'), 'err');
        setTargetLabel('error');
        setProgress({ active: false, pct: 0, label: '' });
        return;
      }

      setProgress({ active: true, pct: 100, label: 'Rendering report & AST...' });
      await applyReport(data.report, triggerKind, 'mock-target (demo)');
    } catch (err: any) {
      pushLog('Network error: ' + err.message, 'err');
      setTargetLabel('server unreachable');
    } finally {
      setIsRunning(false);
      setTimeout(() => setProgress({ active: false, pct: 0, label: '' }), 600);
    }
  };

  // Run clone
  const runClone = async (triggerKind: string, url: string, targetBranch: string) => {
    setIsRunning(true);
    setExtStatus('Cloning repository and analyzing AST...');
    setProgress({ active: true, pct: 20, label: 'Cloning external repo...' });
    setLogs([]);
    pushLog(`[Clone] Ingesting repository: ${url}...`, 'stage');

    try {
      const body: any = { repoUrl: url, triggerKind };
      if (targetBranch) body.branch = targetBranch;

      setProgress({ active: true, pct: 60, label: 'Analyzing AST & dependencies...' });
      const res = await fetch('/api/clone-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setExtStatus('Error: ' + (data.error || 'Clone failed'));
        pushLog('Clone error: ' + (data.error || 'Unknown'), 'err');
        return;
      }

      setExtStatus(`✓ Cloned "${data.repoName}" — pipeline complete`);
      setProgress({ active: true, pct: 100, label: 'Pipeline complete' });
      await applyReport(data.report, triggerKind, `cloned: ${data.repoName}`);
    } catch (err: any) {
      setExtStatus('Network error: ' + err.message);
      pushLog('Network error: ' + err.message, 'err');
    } finally {
      setIsRunning(false);
      setTimeout(() => setProgress({ active: false, pct: 0, label: '' }), 600);
    }
  };

  if (!isOpen && !embedded) return null;

  if (embedded) {
    return (
      <div className="p-3.5 bg-[#0a0c10] text-slate-200 select-none overflow-hidden h-full flex flex-col justify-between font-sans">
        {/* Header Bar */}
        <div className="flex items-center justify-between flex-shrink-0">
          {/* Left: 🛡️ SentinelDev, badge v1.0 • Bob 2.0, live status dot MED / MOCK-TARGET */}
          <div className="flex items-center gap-2">
            <span className="text-sm">🛡️</span>
            <span className="font-semibold text-xs tracking-tight text-white">
              SentinelDev
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 font-mono">
              v1.0 • Bob 2.0
            </span>
            <span className="inline-flex items-center gap-1.5 text-[9px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>MED / MOCK-TARGET</span>
            </span>
          </div>

          {/* Right: Outlined compact links View Report ↗ and PR Comment ↗ */}
          <div className="flex items-center gap-1.5">
            <a
              href="/sentinel-report.html"
              target="_blank"
              rel="noreferrer"
              className="text-[10px] px-2 py-1 rounded border border-white/10 text-slate-300 hover:bg-white/5 transition-colors font-mono inline-flex items-center gap-1"
            >
              <span>View Report ↗</span>
            </a>
            <a
              href="/sentinel-pr-comment.md"
              target="_blank"
              rel="noreferrer"
              className="text-[10px] px-2 py-1 rounded border border-white/10 text-slate-300 hover:bg-white/5 transition-colors font-mono inline-flex items-center gap-1"
            >
              <span>PR Comment ↗</span>
            </a>
          </div>
        </div>

        {/* Target & Trigger Command Row */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Input: Dark background, h-8 compact, showing github.com/org/repo (or ./mock-target) */}
          <div className="flex-1 flex items-center h-8 bg-black/50 border border-white/10 text-[10px] px-2.5 rounded text-slate-300 font-mono">
            <span className="text-slate-500 mr-1.5 font-bold">$</span>
            <span className="text-slate-300 truncate">github.com/org/repo (or ./mock-target)</span>
          </div>

          {/* Primary CTA: [▶ Run Demo Console] with theme neon/emerald glow */}
          <button
            type="button"
            onClick={() => onNavigateDemo ? onNavigateDemo('run-cve') : (window.location.href = '/demo?action=run-cve')}
            className="h-8 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-[10px] px-3 rounded flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.35)] transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]"
          >
            <Play size={10} fill="currentColor" />
            <span>[▶ Run Demo Console]</span>
          </button>

          {/* Secondary CTA: [AST Audit] */}
          <button
            type="button"
            onClick={() => onNavigateDemo ? onNavigateDemo('run-blast') : (window.location.href = '/demo?action=run-blast')}
            className="h-8 border border-white/15 bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] px-2.5 rounded flex items-center gap-1 font-mono transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]"
          >
            <Activity size={10} className="text-cyan-400" />
            <span>[AST Audit]</span>
          </button>
        </div>

        {/* Metrics Quad: 4 balanced frosted cards */}
        <div className="grid grid-cols-4 gap-2 flex-shrink-0">
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-md p-2 text-center">
            <span className="block uppercase text-[8px] tracking-wider text-slate-400 font-mono mb-0.5">
              PATCHED CALL-SITES
            </span>
            <span className="bold text-sm text-emerald-400 font-mono font-bold">2</span>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.08] rounded-md p-2 text-center">
            <span className="block uppercase text-[8px] tracking-wider text-slate-400 font-mono mb-0.5">
              IMPACTED DOWNSTREAM
            </span>
            <span className="bold text-sm text-amber-400 font-mono font-bold">1</span>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.08] rounded-md p-2 text-center">
            <span className="block uppercase text-[8px] tracking-wider text-slate-400 font-mono mb-0.5">
              EXPOSED ENDPOINTS
            </span>
            <span className="bold text-sm text-sky-400 font-mono font-bold">1</span>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.08] rounded-md p-2 text-center">
            <span className="block uppercase text-[8px] tracking-wider text-slate-400 font-mono mb-0.5">
              BREAKING SIGNATURES
            </span>
            <span className="bold text-sm text-rose-400 font-mono font-bold">4</span>
          </div>
        </div>

        {/* Risk & Guard Strip */}
        <div className="flex items-center justify-between px-2.5 py-1 rounded bg-white/[0.02] border border-white/[0.06] text-[9px] font-mono flex-shrink-0">
          <div className="text-slate-300">
            <span className="text-slate-400 font-semibold">RISK SCORE: </span>
            <span className="text-amber-400 font-bold">MED</span>
            <span className="text-slate-400"> (1 impacted file, 4 breaking signatures)</span>
          </div>
          <div className="text-emerald-400 flex items-center gap-1 font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>● Bob Guard Active</span>
          </div>
        </div>

        {/* Compact Tab Preview: Blast Graph, Remediation Diff, OpenAPI Spec, Terminal */}
        <div className="rounded-lg border border-white/10 bg-[#0d1017] overflow-hidden flex flex-col flex-1 mt-1 max-h-[142px]">
          {/* Active Tab Row */}
          <div className="flex items-center border-b border-white/10 bg-[#07090d] px-1 flex-shrink-0">
            {[
              { id: 'graph', label: 'Blast Graph' },
              { id: 'diff', label: 'Remediation Diff' },
              { id: 'spec', label: 'OpenAPI Spec' },
              { id: 'terminal', label: 'Terminal' },
              { id: 'ai', label: 'AI Briefing ✨' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setEmbeddedPreviewTab(tab.id as any)}
                className={`px-2.5 py-1 text-[9.5px] font-mono transition-colors border-b-2 cursor-pointer ${
                  embeddedPreviewTab === tab.id
                    ? 'border-emerald-400 text-white font-semibold bg-white/[0.04]'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content Preview */}
          <div className="flex-1 p-2 bg-[#090c12] overflow-hidden flex items-center justify-center">
            {embeddedPreviewTab === 'graph' && (
              <div className="w-full h-full flex items-center justify-center">
                <svg viewBox="0 0 460 85" className="w-full h-full max-h-[95px]" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <marker id="embed-arr-blue" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#38bdf8" />
                    </marker>
                    <marker id="embed-arr-red" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f43f5e" />
                    </marker>
                  </defs>

                  {/* Edges */}
                  <path d="M 95 42 L 155 24" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" markerEnd="url(#embed-arr-blue)" />
                  <path d="M 95 42 L 155 60" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" markerEnd="url(#embed-arr-blue)" />
                  <path d="M 270 24 L 325 40" stroke="#f43f5e" strokeWidth="1.5" markerEnd="url(#embed-arr-red)" />
                  <path d="M 270 60 L 325 44" stroke="#f43f5e" strokeWidth="1.5" markerEnd="url(#embed-arr-red)" />

                  {/* Node 1: api.ts (root) */}
                  <rect x="15" y="27" width="80" height="30" rx="5" fill="#131b26" stroke="#38bdf8" strokeWidth="1.2" />
                  <text x="55" y="44" fill="#38bdf8" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">api.ts</text>
                  <text x="55" y="53" fill="#64748b" fontSize="7" fontFamily="monospace" textAnchor="middle">Entry Route</text>

                  {/* Node 2: userService.ts */}
                  <rect x="160" y="9" width="105" height="30" rx="5" fill="#131b26" stroke="#38bdf8" strokeWidth="1.2" />
                  <text x="212" y="26" fill="#f1f5f9" fontSize="9.5" fontFamily="monospace" textAnchor="middle">userService.ts</text>
                  <text x="212" y="35" fill="#38bdf8" fontSize="7" fontFamily="monospace" textAnchor="middle">callsite :42</text>

                  {/* Node 3: reportService.ts */}
                  <rect x="160" y="45" width="105" height="30" rx="5" fill="#131b26" stroke="#38bdf8" strokeWidth="1.2" />
                  <text x="212" y="62" fill="#f1f5f9" fontSize="9.5" fontFamily="monospace" textAnchor="middle">reportService.ts</text>
                  <text x="212" y="71" fill="#38bdf8" fontSize="7" fontFamily="monospace" textAnchor="middle">callsite :65</text>

                  {/* Node 4: crypto-utils.ts (CVE Target) */}
                  <rect x="330" y="27" width="115" height="32" rx="5" fill="#2d1217" stroke="#f43f5e" strokeWidth="1.4" />
                  <text x="387" y="43" fill="#fda4af" fontSize="9.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">crypto-utils.ts</text>
                  <text x="387" y="53" fill="#f43f5e" fontSize="7" fontFamily="monospace" textAnchor="middle">CVE-2024-DEMO01</text>
                </svg>
              </div>
            )}

            {embeddedPreviewTab === 'diff' && (
              <div className="w-full h-full font-mono text-[9px] text-slate-300 leading-tight space-y-1">
                <div className="text-slate-500">// src/lib/crypto-utils.ts</div>
                <div className="bg-red-500/15 text-red-300 px-1.5 py-0.5 rounded border border-red-500/30">
                  - export function encryptMD5(data: string): string
                </div>
                <div className="bg-emerald-500/15 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  + export function encryptSHA256(data: string, salt: string): string
                </div>
              </div>
            )}

            {embeddedPreviewTab === 'spec' && (
              <div className="w-full h-full font-mono text-[9px] text-slate-300 leading-tight space-y-0.5">
                <div className="text-emerald-400 font-semibold">// openapi.yaml (reconciled by DocuSync)</div>
                <div className="text-slate-400">/api/v1/auth/hash:</div>
                <div className="text-slate-400 pl-2">post:</div>
                <div className="text-emerald-300 pl-4 bg-emerald-500/10 rounded">summary: Secure SHA-256 Digest Endpoint (Auto-Synced)</div>
              </div>
            )}

            {embeddedPreviewTab === 'terminal' && (
              <div className="w-full h-full font-mono text-[8.5px] text-slate-300 leading-tight space-y-1 overflow-hidden">
                <div className="text-emerald-400">[00:00.01] [AST-Orchestrator] Multi-agent guardian initialized (IBM Bob 2.0).</div>
                <div className="text-cyan-300">[00:00.02] [AutoRemediator] Modernized 2 call-site references to encryptSHA256().</div>
                <div className="text-purple-300">[00:00.04] [DocuSync] Zero spec drift verified across Express router.</div>
              </div>
            )}

            {embeddedPreviewTab === 'ai' && (
              <div className="w-full h-full font-mono text-[8.5px] text-slate-300 leading-tight space-y-1.5 overflow-hidden p-0.5">
                <div className="flex items-center justify-between text-emerald-400 font-semibold border-b border-emerald-500/20 pb-0.5 mb-1">
                  <span>AI Executive Briefing</span>
                  <span className="text-[7.5px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-300">Powered by Gemini 2.5 Flash</span>
                </div>
                <div className="text-slate-300">✦ <span className="font-bold text-white">Integrity:</span> Modernized 2 call-sites to salted SHA-256</div>
                <div className="text-slate-300">✦ <span className="font-bold text-white">Blast Radius:</span> Score MED; 4 contracts updated cleanly</div>
                <div className="text-slate-300">✦ <span className="font-bold text-white">Recommendation:</span> Zero spec drift. Approved for merge</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const innerContent = (
    <div className={`relative w-full h-full flex flex-col bg-[#0d1117] text-white overflow-hidden select-text ${
      embedded ? 'text-[11px] border-none' : 'text-xs max-h-[92vh] rounded-2xl border border-white/20 bg-[#0d1117] backdrop-blur-2xl shadow-2xl'
    }`}>
      {/* Top Header Bar */}
      <div className={`flex items-center justify-between border-b border-white/10 ${
        embedded ? 'px-2.5 py-1.5 bg-[#161b22]' : 'px-5 py-3.5 bg-[#161b22]'
      } flex-shrink-0`}>
        {/* Left: Compact title, badge, and live status pill */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-sm">🛡️</span>
          <span className="font-semibold text-white tracking-tight text-xs sm:text-sm font-sans">
            SentinelDev Engine
          </span>
          <span className="font-mono text-[9px] uppercase tracking-wider border border-white/15 bg-white/5 px-1.5 py-0.5 rounded text-white/80">
            V1.0 • IBM BOB 2.0
          </span>
          <span
            id="target-badge"
            className={`font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${
              riskScore === 'CRITICAL'
                ? 'border-red-500/40 bg-red-500/15 text-red-300'
                : riskScore === 'MED'
                ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full animate-pulse ${
                riskScore === 'CRITICAL' ? 'bg-red-400' : riskScore === 'MED' ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
            />
            <span>{targetLabel}</span>
          </span>
        </div>

        {/* Right: Outlined utility buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <a
            href="/sentinel-report.html"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded border border-white/20 bg-white/5 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[10px] font-mono text-white/80 hover:text-white hover:bg-white/15 hover:border-white/40 transition-colors"
          >
            <span>View Report HTML</span>
            <ExternalLink size={9} />
          </a>
          <a
            href="/sentinel-pr-comment.md"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded border border-white/20 bg-white/5 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[10px] font-mono text-white/80 hover:text-white hover:bg-white/15 hover:border-white/40 transition-colors"
          >
            <span>View PR Comment</span>
            <ExternalLink size={9} />
          </a>
          {!embedded && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Content inside laptop screen */}
      <div className={`flex-1 overflow-y-auto ${embedded ? 'p-2.5 sm:p-3.5 space-y-2' : 'p-5 sm:p-6 space-y-5'}`}>
        {/* Controls Grid */}
        <div className={`rounded-xl border border-white/10 bg-[#161b22] ${embedded ? 'p-2' : 'p-3'} backdrop-blur-md`}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-3 items-end">
            {/* Git Repo & Branch Input */}
            <div className="md:col-span-7 flex flex-col gap-1">
              <label className="font-mono text-[9px] uppercase tracking-wider text-neutral-400">
                Repository Target
              </label>
              <div className="flex gap-2">
                <input
                  id="github-url"
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo (blank = mock-target demo)"
                  className={`flex-1 rounded-md border border-white/10 bg-[#0d1117] ${
                    embedded ? 'px-2.5 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'
                  } text-white placeholder-white/35 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-400/40 focus:outline-none font-mono transition-shadow`}
                />
                <input
                  id="github-branch"
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                  className={`w-16 sm:w-20 rounded-md border border-white/10 bg-[#0d1117] ${
                    embedded ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1.5 text-xs'
                  } text-white placeholder-white/35 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-400/40 focus:outline-none font-mono text-center transition-shadow`}
                />
              </div>
            </div>

            {/* Presets & Action CTAs */}
            <div className="md:col-span-5 flex flex-col justify-between gap-1">
              <div className="flex items-center justify-between">
                <label className="font-mono text-[9px] uppercase tracking-wider text-neutral-400">
                  Trigger Pipeline
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setScenarioOpen(!scenarioOpen)}
                    className="inline-flex items-center gap-1 font-mono text-[9px] sm:text-[10px] text-white/70 hover:text-white"
                  >
                    <span>Quick Scenarios</span>
                    <ChevronDown size={10} />
                  </button>
                  {scenarioOpen && (
                    <div
                      id="scenarios-dropdown"
                      className="absolute right-0 mt-1 w-48 rounded-lg border border-white/20 bg-[#161b22] py-1 shadow-xl z-30"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setRepoUrl('');
                          setScenarioOpen(false);
                          if (embedded) {
                            if (onNavigateDemo) onNavigateDemo('run-cve');
                            else window.location.href = '/demo?action=run-cve';
                          } else {
                            runPipeline('CVE_ADVISORY');
                          }
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 hover:text-white font-mono"
                      >
                        CVE Remediation Demo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRepoUrl('');
                          setScenarioOpen(false);
                          if (embedded) {
                            if (onNavigateDemo) onNavigateDemo('run-blast');
                            else window.location.href = '/demo?action=run-blast';
                          } else {
                            runPipeline('GIT_DIFF');
                          }
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 hover:text-white font-mono"
                      >
                        AST Blast-Radius Audit
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons: High-contrast with hover badge 'Open Full Console ↗' */}
              <div className="flex items-center gap-2">
                <div className="relative group flex-1">
                  <button
                    type="button"
                    id="btn-cve"
                    disabled={isRunning}
                    onClick={() => {
                      if (embedded) {
                        if (onNavigateDemo) onNavigateDemo('run-cve');
                        else window.location.href = '/demo?action=run-cve';
                      } else {
                        runPipeline('CVE_ADVISORY');
                      }
                    }}
                    className={`w-full inline-flex items-center justify-center gap-1 rounded-md bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-black ${
                      embedded ? 'px-2 py-1 text-[10px]' : 'px-3 py-2 text-xs'
                    } font-semibold shadow-[0_0_15px_rgba(16,185,129,0.35)] transition-all duration-200 disabled:opacity-50`}
                  >
                    <Play size={embedded ? 9 : 12} fill="currentColor" />
                    <span>{isRunning ? 'Running…' : '[▶ Run CVE Pipeline]'}</span>
                  </button>
                  <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-emerald-400 text-black px-1.5 py-0.5 text-[9px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-30 font-mono">
                    Open Full Console ↗
                  </span>
                </div>

                <div className="relative group">
                  <button
                    type="button"
                    id="btn-blast"
                    disabled={isRunning}
                    onClick={() => {
                      if (embedded) {
                        if (onNavigateDemo) onNavigateDemo('run-blast');
                        else window.location.href = '/demo?action=run-blast';
                      } else {
                        runPipeline('GIT_DIFF');
                      }
                    }}
                    className={`inline-flex items-center justify-center gap-1 rounded-md border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 active:scale-[0.98] text-cyan-300 ${
                      embedded ? 'px-2 py-1 text-[10px]' : 'px-3 py-2 text-xs'
                    } font-medium transition-all duration-200 disabled:opacity-50 font-mono`}
                  >
                    <Activity size={embedded ? 9 : 12} className="text-cyan-400" />
                    <span>[AST Blast Audit]</span>
                  </button>
                  <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-cyan-400 text-black px-1.5 py-0.5 text-[9px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-30 font-mono">
                    Open Full Console ↗
                  </span>
                </div>
              </div>
            </div>
          </div>
          {extStatus && (
            <span id="ext-status" className="block mt-1 text-[10px] text-white/50 font-mono">
              {extStatus}
            </span>
          )}
        </div>

        {/* Progress Bar */}
        {progress.active && (
          <div id="progress-bar" className="space-y-1 animate-fadeIn">
            <div className="flex justify-between font-mono text-[9px] sm:text-[10px] text-white/70">
              <span id="progress-label">{progress.label}</span>
              <span>{progress.pct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                id="progress-fill"
                className="h-full bg-emerald-400 transition-all duration-300 ease-out"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Metric Cards (Compact 4-grid with small labels and prominent small numbers) */}
        <div className={`grid grid-cols-2 sm:grid-cols-4 ${embedded ? 'gap-2' : 'gap-2.5'}`}>
          <div className={`rounded-lg border border-white/10 bg-[#161b22] ${embedded ? 'p-2' : 'p-2.5'}`}>
            <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-400 block mb-0.5">
              PATCHED CALL-SITES
            </span>
            <div id="m-patched" className={`${embedded ? 'text-base font-bold text-white' : 'text-xl sm:text-2xl font-bold font-mono text-emerald-400'}`}>
              {metrics.patched}
            </div>
          </div>

          <div className={`rounded-lg border border-white/10 bg-[#161b22] ${embedded ? 'p-2' : 'p-2.5'}`}>
            <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-400 block mb-0.5">
              IMPACTED DOWNSTREAM
            </span>
            <div id="m-impacted" className={`${embedded ? 'text-base font-bold text-white' : 'text-xl sm:text-2xl font-bold font-mono text-cyan-400'}`}>
              {metrics.impacted}
            </div>
          </div>

          <div className={`rounded-lg border border-white/10 bg-[#161b22] ${embedded ? 'p-2' : 'p-2.5'}`}>
            <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-400 block mb-0.5">
              EXPOSED ENDPOINTS
            </span>
            <div id="m-endpoints" className={`${embedded ? 'text-base font-bold text-white' : 'text-xl sm:text-2xl font-bold font-mono text-purple-400'}`}>
              {metrics.endpoints}
            </div>
          </div>

          <div className={`rounded-lg border border-white/10 bg-[#161b22] ${embedded ? 'p-2' : 'p-2.5'}`}>
            <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-400 block mb-0.5">
              BREAKING SIGNATURES
            </span>
            <div id="m-breaking" className={`${embedded ? 'text-base font-bold text-white' : 'text-xl sm:text-2xl font-bold font-mono text-amber-400'}`}>
              {metrics.breaking}
            </div>
          </div>
        </div>

        {/* Dynamic Risk Banner */}
        <div className={`flex items-center justify-between rounded-xl border border-white/10 bg-[#161b22] ${embedded ? 'px-2.5 py-1.5' : 'px-3.5 py-2.5'}`}>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <ShieldAlert size={14} />
            </div>
            <div>
              <div className="font-mono text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-white">
                RISK CLASSIFICATION:{' '}
                <span
                  id="risk-score"
                  className={
                    riskScore === 'CRITICAL'
                      ? 'text-red-400'
                      : riskScore === 'MED'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }
                >
                  {riskScore}
                </span>
              </div>
              <p id="risk-desc" className="font-mono text-[9px] sm:text-[10px] text-white/60 mt-0.5">
                {riskDesc}
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 font-mono text-[9px] sm:text-[10px] uppercase text-white/50 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>IBM Bob 2.0 Guard Active</span>
          </div>
        </div>

        {/* Tab Navigation & Workspace */}
        <div className="rounded-xl border border-white/10 bg-[#161b22] overflow-hidden">
          {/* Tabs Header */}
          <div className="flex items-center border-b border-white/10 bg-[#11151c] px-1 overflow-x-auto">
            {[
              { id: 'graph', label: 'BLAST GRAPH' },
              { id: 'diff', label: 'REMEDIATION DIFF' },
              { id: 'spec', label: 'OPENAPI SPEC' },
              { id: 'breaking', label: 'BREAKING CONTRACTS' },
              { id: 'logs', label: 'TERMINAL LOGS' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`${
                  embedded ? 'px-2 py-1 text-[10px]' : 'px-3 py-2 text-[11px]'
                } font-mono uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-emerald-400 text-white font-semibold bg-[#161b22]'
                    : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Workspace Panels */}
          <div className={`bg-[#0d1117] ${embedded ? 'p-2 max-h-[190px] overflow-hidden' : 'p-3 min-h-[200px] max-h-[340px] overflow-y-auto'}`}>
            {/* Tab: BLAST GRAPH */}
            {activeTab === 'graph' && (
              <div id="tab-graph" className="w-full">
                <div
                  id="graph-container"
                  ref={graphContainerRef}
                  className="flex flex-col items-center justify-center p-2 min-h-[180px]"
                >
                  {/* Interactive caller tree: api.ts -> userService.ts / reportService.ts -> crypto-utils.ts */}
                  <div className="w-full flex flex-col items-center">
                    <svg viewBox="0 0 520 170" className="w-full max-w-lg h-auto mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <marker id="m-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#58a6ff" />
                        </marker>
                        <marker id="m-arrow-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#da3633" />
                        </marker>
                      </defs>
                      
                      {/* Edges with arrows */}
                      <path d="M 100 75 C 135 75, 145 42, 180 42" stroke="#58a6ff" strokeWidth="1.8" markerEnd="url(#m-arrow)" fill="none" />
                      <path d="M 100 95 C 135 95, 145 128, 180 128" stroke="#58a6ff" strokeWidth="1.8" markerEnd="url(#m-arrow)" fill="none" />
                      <path d="M 315 42 C 345 42, 355 75, 385 75" stroke="#da3633" strokeWidth="1.8" markerEnd="url(#m-arrow-red)" fill="none" />
                      <path d="M 315 128 C 345 128, 355 95, 385 95" stroke="#da3633" strokeWidth="1.8" markerEnd="url(#m-arrow-red)" fill="none" />

                      {/* Node 1: api.ts (Entrypoint) */}
                      <rect x="15" y="65" width="85" height="40" rx="8" fill="#161b22" stroke="#58a6ff" strokeWidth="1.8" />
                      <text x="57" y="90" fill="#58a6ff" fontSize="11" fontFamily="monospace" fontWeight="600" textAnchor="middle">api.ts</text>

                      {/* Node 2: userService.ts */}
                      <rect x="180" y="22" width="135" height="40" rx="8" fill="#161b22" stroke="#388bfd" strokeWidth="1.8" />
                      <text x="247" y="47" fill="#cdd9e5" fontSize="11" fontFamily="monospace" fontWeight="500" textAnchor="middle">userService.ts</text>

                      {/* Node 3: reportService.ts */}
                      <rect x="180" y="108" width="135" height="40" rx="8" fill="#161b22" stroke="#388bfd" strokeWidth="1.8" />
                      <text x="247" y="133" fill="#cdd9e5" fontSize="11" fontFamily="monospace" fontWeight="500" textAnchor="middle">reportService.ts</text>

                      {/* Node 4: crypto-utils.ts (CVE BLAST TARGET) */}
                      <rect x="385" y="65" width="125" height="40" rx="8" fill="#2b0c10" stroke="#da3633" strokeWidth="2" />
                      <text x="447" y="90" fill="#f85149" fontSize="11" fontFamily="monospace" fontWeight="700" textAnchor="middle">crypto-utils.ts</text>
                    </svg>
                    
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-[10px] font-mono text-white/60">
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#58a6ff]" /> Route Entrypoint (api.ts)</span>
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#388bfd]" /> Direct / Transitive Callers</span>
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#da3633]" /> CVE Blast Target (crypto-utils.ts)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: REMEDIATION DIFF */}
            {activeTab === 'diff' && (
              <div id="tab-diff" className="font-mono text-xs">
                <div className="p-3 bg-[#161b22] border border-white/10 rounded-lg overflow-x-auto">
                  <pre className="text-white/80 whitespace-pre font-mono text-[11px] leading-relaxed">
                    {report?.remediation?.patch || report?.gitDiff || `--- a/src/utils/crypto-utils.ts
+++ b/src/utils/crypto-utils.ts
@@ -14,7 +14,8 @@ export function generateSessionToken(): string {
-export function hashPassword(password: string): string {
-  return crypto.createHash('md5').update(password).digest('hex');
-}
+export function hashPassword(password: string, salt: string): string {
+  return crypto.scryptSync(password, salt, 64).toString('hex');
+}
@@ -28,5 +29,5 @@ export function verifyPassword(password: string, hash: string): boolean {
-  return hashPassword(password) === hash;
+  return crypto.timingSafeEqual(Buffer.from(hashPassword(password, salt)), Buffer.from(hash));
 }`}
                  </pre>
                </div>
              </div>
            )}

            {/* Tab: OPENAPI SPEC */}
            {activeTab === 'spec' && (
              <div id="tab-spec" className="font-mono text-xs">
                <div className="border border-white/10 rounded-lg overflow-hidden bg-[#161b22]">
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead>
                      <tr className="border-b border-white/10 bg-[#11151c] text-white/50">
                        <th className="py-2 px-3">METHOD</th>
                        <th className="py-2 px-3">ROUTE PATH</th>
                        <th className="py-2 px-3">SPEC SYNC STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {report?.docSync?.endpointChanges?.length > 0 ? (
                        report.docSync.endpointChanges.map((ep: any, idx: number) => (
                          <tr key={idx} className="hover:bg-white/[0.02]">
                            <td className="py-2 px-3 font-semibold text-emerald-400">{ep.method}</td>
                            <td className="py-2 px-3 text-white/90">{ep.path}</td>
                            <td className="py-2 px-3 text-white/60">{ep.changeKind}</td>
                          </tr>
                        ))
                      ) : (
                        <>
                          <tr className="hover:bg-white/[0.02]">
                            <td className="py-2 px-3 font-semibold text-emerald-400">POST</td>
                            <td className="py-2 px-3 text-white/90">/api/v1/auth/login</td>
                            <td className="py-2 px-3 text-emerald-300">Synchronized with openapi.yaml</td>
                          </tr>
                          <tr className="hover:bg-white/[0.02]">
                            <td className="py-2 px-3 font-semibold text-emerald-400">POST</td>
                            <td className="py-2 px-3 text-white/90">/api/v1/auth/register</td>
                            <td className="py-2 px-3 text-cyan-300">Added salt schema requirement</td>
                          </tr>
                          <tr className="hover:bg-white/[0.02]">
                            <td className="py-2 px-3 font-semibold text-cyan-400">GET</td>
                            <td className="py-2 px-3 text-white/90">/api/v1/users/:id/profile</td>
                            <td className="py-2 px-3 text-white/50">Verified Contract Clean</td>
                          </tr>
                          <tr className="hover:bg-white/[0.02]">
                            <td className="py-2 px-3 font-semibold text-purple-400">GET</td>
                            <td className="py-2 px-3 text-white/90">/api/v1/reports/:reportId</td>
                            <td className="py-2 px-3 text-white/50">Verified Contract Clean</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab: BREAKING CONTRACTS */}
            {activeTab === 'breaking' && (
              <div id="tab-breaking" className="font-mono text-xs space-y-2">
                {report?.blastRadius?.breakingSignatures?.length > 0 ? (
                  report.blastRadius.breakingSignatures.map((sig: string, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-red-200 text-[11px]"
                    >
                      {sig}
                    </div>
                  ))
                ) : (
                  <>
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-red-200 text-[11px]">
                      <span className="font-bold text-red-400">BREAKING:</span> crypto-utils.ts: hashPassword(password: string) changed to hashPassword(password: string, salt: string)
                    </div>
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-amber-200 text-[11px]">
                      <span className="font-bold text-amber-400">CALLSITE IMPACT:</span> userService.ts:42 hashPassword(user.pwd) missing required salt argument
                    </div>
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-amber-200 text-[11px]">
                      <span className="font-bold text-amber-400">CALLSITE IMPACT:</span> reportService.ts:65 verifyPassword(pwd, hash) updated with constant-time equality check
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tab: TERMINAL LOGS */}
            {activeTab === 'logs' && (
              <div id="tab-logs">
                <div
                  id="terminal-output"
                  ref={terminalRef}
                  className="font-mono text-[11px] p-3 bg-[#080b0f] border border-white/10 rounded-lg min-h-[160px] max-h-[280px] overflow-y-auto space-y-1 text-white/80"
                >
                  {logs.map((item, idx) => (
                    <div
                      key={idx}
                      className={`${
                        item.kind === 'stage'
                          ? 'text-white font-semibold'
                          : item.kind === 'ok'
                          ? 'text-emerald-400'
                          : item.kind === 'err'
                          ? 'text-red-400'
                          : item.kind === 'warn'
                          ? 'text-amber-400'
                          : item.kind === 'muted'
                          ? 'text-white/40'
                          : 'text-white/80'
                      }`}
                    >
                      {item.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return innerContent;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-lg animate-fadeIn">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-2xl border border-white/20 bg-[#0d0d0e]/95 backdrop-blur-2xl shadow-2xl overflow-hidden text-white">
        {innerContent}
      </div>
    </div>
  );
};
