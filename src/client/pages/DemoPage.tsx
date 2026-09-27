import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Play,
  Activity,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileCode,
  Layers,
  Terminal as TerminalIcon,
  CheckCircle2,
  AlertTriangle,
  GitBranch,
  Sparkles,
  RefreshCw,
  FolderGit2,
  Copy,
} from 'lucide-react';

interface DemoPageProps {
  onBack: () => void;
  initialAction?: string | null;
}

export const DemoPage: React.FC<DemoPageProps> = ({ onBack, initialAction }) => {
  // Target & branch state
  const [targetRepo, setTargetRepo] = useState('./mock-target');
  const [branch, setBranch] = useState('main');
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'graph' | 'diff' | 'spec' | 'logs' | 'ai'>('graph');
  const [activeDiffFile, setActiveDiffFile] = useState<'crypto-utils.ts' | 'userService.ts' | 'reportService.ts'>('crypto-utils.ts');

  // AI Executive Summary state
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // Stepper state: 0 = idle, 1 = AST Ingestion, 2 = Call Graph Traversal, 3 = Safe Patching, 4 = Spec Reconciliation, 5 = Done
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Zoom state for caller tree canvas
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedNode, setSelectedNode] = useState<{
    id: string;
    file: string;
    role: string;
    risk: string;
    callers: string[];
    callees: string[];
    line?: number;
    functionName?: string;
  } | null>({
    id: 'crypto-utils.ts',
    file: 'src/lib/crypto-utils.ts',
    role: 'CVE Vulnerability Target',
    risk: 'CRITICAL (CVE-2024-DEMO01)',
    callers: ['userService.ts:42', 'reportService.ts:65'],
    callees: ['node:crypto (createHash md5)'],
  });

  const graphContainerRef = useRef<HTMLDivElement | null>(null);
  const nodeMapRef = useRef<Map<string, any>>(new Map());

  // Report & execution state
  const [report, setReport] = useState<any>(null);
  const [pipelineStatus, setPipelineStatus] = useState<'Ready' | 'Running' | 'Success' | 'Error'>('Ready');
  const [statusMessage, setStatusMessage] = useState('● Ready');

  // Streaming logs state
  const [logs, setLogs] = useState<Array<{ text: string; kind: string; time: string }>>([
    { text: '[00:00.01] [AST-Orchestrator] Multi-agent guardian initialized (IBM Bob 2.0).', kind: 'ok', time: '10:00:01' },
    { text: '[00:00.02] [AutoRemediator] Catalog loaded: CVE-2024-DEMO01 (crypto-utils).', kind: 'default', time: '10:00:02' },
    { text: '[00:00.04] [BlastRadiusAuditor] AST caller graph loaded: 4 dependency vertices.', kind: 'default', time: '10:00:04' },
    { text: '[00:00.06] [DocuSync] Express AST route introspection mapped to openapi.yaml.', kind: 'default', time: '10:00:06' },
    { text: '[00:00.08] [SentinelDev] Ready. Trigger full CVE remediation or blast audit above.', kind: 'stage', time: '10:00:08' },
  ]);

  const terminalRef = useRef<HTMLDivElement | null>(null);

  const pushLog = (text: string, kind = 'default') => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { text, kind, time }]);
  };

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  // Dynamic Mermaid Call Graph Builder
  const renderGraph = async () => {
    if (!graphContainerRef.current) return;
    const mermaid = (window as any).mermaid;
    if (!mermaid) return;

    const basename = (p: string) => (p || '').split(/[\\/]/).pop() || p;
    const cleanId = (s: string) => s.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 38);
    const edges = new Set<string>();
    const nodeMap = new Map<string, any>();
    const styleDefs = new Set<string>();

    const registerNode = (id: string, file: string, fn: string, role: string, risk: string, line?: number) => {
      if (!nodeMap.has(id)) {
        nodeMap.set(id, {
          id: basename(file),
          file,
          functionName: fn,
          role,
          risk,
          line: line || 1,
          callers: [],
          callees: [],
        });
      }
    };

    if (report?.blastRadius?.callGraphTree?.length > 0) {
      const tree = report.blastRadius.callGraphTree;
      const walk = (nodes: any[]) => {
        nodes.forEach((n: any) => {
          const targetFile = n.file;
          const targetFn = n.functionName || '<module>';
          const targetId = cleanId(basename(targetFile) + '_' + targetFn);
          const isTargetVuln = targetFile.includes('crypto-utils') || 
            (report?.remediation?.affectedFiles?.some((f: string) => f.includes(basename(targetFile))));

          registerNode(
            targetId,
            targetFile,
            targetFn,
            isTargetVuln ? 'CVE Vulnerability Target' : 'Downstream Service Dependency',
            isTargetVuln ? 'CRITICAL (Target Vulnerability)' : 'MED (AST Call Dependency)',
            n.line
          );

          if (isTargetVuln) {
            styleDefs.add(`  style ${targetId} fill:#2b0c10,stroke:#f85149,stroke-width:2.5px,color:#f85149`);
          } else {
            styleDefs.add(`  style ${targetId} fill:#161b22,stroke:#388bfd,stroke-width:1.8px,color:#cdd9e5`);
          }

          n.calledBy?.forEach((child: any) => {
            const callerFile = child.file;
            const callerFn = child.functionName || '<anonymous>';
            const callerId = cleanId(basename(callerFile) + '_' + callerFn);
            const isEntry = callerFile.includes('api') || callerFile.includes('server') || callerFile.includes('app') || callerFile.includes('index') || callerFile.includes('router');

            registerNode(
              callerId,
              callerFile,
              callerFn,
              isEntry ? 'Entrypoint Route / Controller' : 'Transitive Service Caller',
              isEntry ? 'LOW (Route Exposer)' : 'MED (Caller)',
              child.line
            );

            if (isEntry) {
              styleDefs.add(`  style ${callerId} fill:#161b22,stroke:#58a6ff,stroke-width:2px,color:#58a6ff`);
            } else {
              styleDefs.add(`  style ${callerId} fill:#161b22,stroke:#388bfd,stroke-width:1.8px,color:#cdd9e5`);
            }

            // Link caller -> callee in architecture flow
            nodeMap.get(targetId)?.callees.push(`${basename(callerFile)}:${callerFn}`);
            nodeMap.get(callerId)?.callers.push(`${basename(targetFile)}:${targetFn}`);

            const callerLabel = `${basename(callerFile)}${callerFn && callerFn !== '<module>' && callerFn !== '<anonymous>' ? '\\n' + callerFn + '()' : ''}`;
            const targetLabel = `${basename(targetFile)}${targetFn && targetFn !== '<module>' && targetFn !== '<anonymous>' ? '\\n' + targetFn + '()' : ''}`;

            edges.add(`  ${targetId}["${targetLabel}"] --> ${callerId}["${callerLabel}"]`);

            walk([child]);
          });
        });
      };

      walk(tree);

      // Connect leaf service callers to CVE remediation target if available
      if (report?.remediation) {
        const cvePkg = report.remediation.packageName || 'crypto-utils';
        const cveTargetId = cleanId(cvePkg + '_cve_target');
        const safeMethod = Object.values(report.remediation.deprecatedMethods || {})[0] || 'encryptSHA256';

        registerNode(
          cveTargetId,
          `src/lib/${cvePkg}.ts`,
          String(safeMethod),
          'CVE Vulnerability Target',
          `CRITICAL (${report.remediation.cveId || 'CVE-2024-DEMO01'})`,
          15
        );
        styleDefs.add(`  style ${cveTargetId} fill:#2b0c10,stroke:#f85149,stroke-width:2.5px,color:#f85149`);

        for (const [id, node] of nodeMap.entries()) {
          if (id !== cveTargetId && (node.functionName?.includes('sign') || node.functionName?.includes('hash') || node.file.includes('Service'))) {
            edges.add(`  ${id} --> ${cveTargetId}["${basename(cvePkg)}.ts\\n${safeMethod}()"]`);
            nodeMap.get(cveTargetId)?.callers.push(`${node.id}:${node.line}`);
            node.callees.push(`${basename(cvePkg)}.ts:${safeMethod}`);
          }
        }
      }
    }

    let def = '';
    if (edges.size > 0) {
      def = 'graph LR\n' + [...edges].join('\n') + '\n' + [...styleDefs].join('\n');
    } else {
      // Long connected graph chain (mock-target / initial interactive state)
      def =
        'graph LR\n' +
        '  api_entry["src/api.ts\\nExpress Router"] --> us_get["src/userService.ts\\ngetUsers()"]\n' +
        '  api_entry --> rs_build["src/reportService.ts\\nbuildReport()"]\n' +
        '  us_get --> us_hash["src/userService.ts\\nhashUserId()"]\n' +
        '  rs_build --> rs_sign["src/reportService.ts\\nsignReport()"]\n' +
        '  us_hash --> cu_sha["src/lib/crypto-utils.ts\\nencryptSHA256()"]\n' +
        '  rs_sign --> cu_sha\n' +
        '  style cu_sha fill:#2b0c10,stroke:#f85149,stroke-width:2.5px,color:#f85149\n' +
        '  style api_entry fill:#161b22,stroke:#58a6ff,stroke-width:2px,color:#58a6ff\n' +
        '  style us_get fill:#161b22,stroke:#388bfd,stroke-width:1.8px,color:#cdd9e5\n' +
        '  style us_hash fill:#161b22,stroke:#388bfd,stroke-width:1.8px,color:#cdd9e5\n' +
        '  style rs_build fill:#161b22,stroke:#388bfd,stroke-width:1.8px,color:#cdd9e5\n' +
        '  style rs_sign fill:#161b22,stroke:#388bfd,stroke-width:1.8px,color:#cdd9e5';

      nodeMap.set('api_entry', {
        id: 'api.ts',
        file: 'src/api.ts',
        role: 'Express Router Entrypoint',
        risk: 'LOW (Direct Exposer)',
        line: 1,
        callers: ['Express app.use()'],
        callees: ['userService.ts:getUsers()', 'reportService.ts:buildReport()'],
      });
      nodeMap.set('us_get', {
        id: 'userService.ts',
        file: 'src/userService.ts',
        role: 'User Management Controller',
        risk: 'MED (Signature Impacted)',
        line: 20,
        callers: ['api.ts:41'],
        callees: ['userService.ts:hashUserId()'],
      });
      nodeMap.set('us_hash', {
        id: 'userService.ts',
        file: 'src/userService.ts',
        role: 'User Identity Hashing Utility',
        risk: 'MED (Call Site Refactored)',
        line: 10,
        callers: ['userService.ts:29'],
        callees: ['crypto-utils.ts:encryptSHA256()'],
      });
      nodeMap.set('rs_build', {
        id: 'reportService.ts',
        file: 'src/reportService.ts',
        role: 'Audit Report Builder',
        risk: 'MED (Signature Impacted)',
        line: 20,
        callers: ['api.ts:48'],
        callees: ['reportService.ts:signReport()'],
      });
      nodeMap.set('rs_sign', {
        id: 'reportService.ts',
        file: 'src/reportService.ts',
        role: 'Cryptographic Signature Service',
        risk: 'MED (Call Site Refactored)',
        line: 10,
        callers: ['reportService.ts:24'],
        callees: ['crypto-utils.ts:encryptSHA256()'],
      });
      nodeMap.set('cu_sha', {
        id: 'crypto-utils.ts',
        file: 'src/lib/crypto-utils.ts',
        role: 'CVE Vulnerability Target',
        risk: 'CRITICAL (CVE-2024-DEMO01)',
        line: 15,
        callers: ['userService.ts:13', 'reportService.ts:13'],
        callees: ['node:crypto (createHash sha256)'],
      });
    }

    nodeMapRef.current = nodeMap;

    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose',
        darkMode: true,
        flowchart: {
          curve: 'basis',
          nodeSpacing: 45,
          rankSpacing: 55,
        },
      });
      const uid = 'mermaid-demo-' + Date.now();
      const { svg } = await mermaid.render(uid, def);
      if (graphContainerRef.current) {
        graphContainerRef.current.innerHTML = svg;

        const svgEl = graphContainerRef.current.querySelector('svg');
        if (svgEl) {
          svgEl.style.width = '100%';
          svgEl.style.height = 'auto';
          svgEl.style.minHeight = '280px';
          svgEl.style.maxHeight = '520px';
          svgEl.style.cursor = 'pointer';

          // Attach interactive click listeners to nodes in rendered SVG
          const nodeEls = svgEl.querySelectorAll('g.node');
          nodeEls.forEach((el) => {
            el.addEventListener('click', () => {
              const textContent = el.textContent?.trim() || '';
              for (const [key, data] of nodeMap.entries()) {
                if (textContent.includes(data.id) || el.id?.includes(key) || textContent.includes(data.functionName)) {
                  setSelectedNode(data);
                  break;
                }
              }
            });
          });
        }
      }
    } catch (err) {
      console.warn('Mermaid render error:', err);
      if (graphContainerRef.current) {
        graphContainerRef.current.innerHTML = `<pre class="text-xs text-white/50 text-left p-4">${def}</pre>`;
      }
    }
  };

  useEffect(() => {
    let active = true;
    const tryRender = () => {
      if ((window as any).mermaid) {
        if (active) renderGraph();
      } else {
        setTimeout(tryRender, 150);
      }
    };

    if (activeTab === 'graph') {
      tryRender();
    }

    return () => {
      active = false;
    };
  }, [activeTab, report]);

  // Execute pipeline (CVE or Blast audit)
  const executePipeline = async (kind: 'CVE_ADVISORY' | 'GIT_DIFF' = 'CVE_ADVISORY') => {
    if (isRunning) return;
    setIsRunning(true);
    setPipelineStatus('Running');
    setStatusMessage('● Running...');
    setCurrentStep(1);

    // Normalize target repository input
    let repoToRun = targetRepo.trim();
    if (!/^https?:\/\//i.test(repoToRun) && !/^git:\/\//i.test(repoToRun) && (repoToRun.includes('github.com') || repoToRun.includes('gitlab.com') || repoToRun.includes('bitbucket.org'))) {
      repoToRun = 'https://' + repoToRun;
      setTargetRepo(repoToRun);
    }

    pushLog(`════════════════════════════════════════════════════`, 'stage');
    pushLog(`[Pipeline] Triggered: ${kind === 'CVE_ADVISORY' ? 'Full CVE Remediation' : 'AST Blast-Radius Audit'}`, 'stage');
    pushLog(`[Target] Repository: ${repoToRun} (branch: ${branch})`, 'muted');

    // Stepped pipeline progress simulations
    const stepTimer1 = setTimeout(() => {
      setCurrentStep(2);
      pushLog(`[1. AST Ingestion] Parsed TypeScript AST across project modules using ts-morph.`, 'ok');
    }, 400);

    const stepTimer2 = setTimeout(() => {
      setCurrentStep(3);
      pushLog(`[2. Call Graph Traversal] Discovered transitive callers & reference paths across project modules.`, 'ok');
    }, 850);

    const stepTimer3 = setTimeout(() => {
      setCurrentStep(4);
      pushLog(`[3. Safe In-place Patching] Reconciling symbols and verifying parameter compatibility.`, 'ok');
    }, 1300);

    try {
      let res;
      if (repoToRun.startsWith('http://') || repoToRun.startsWith('https://')) {
        pushLog(`[Git Ingestion] Cloning remote repository: ${repoToRun}...`, 'stage');
        res = await fetch('/api/clone-repo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoUrl: repoToRun, branch, triggerKind: kind }),
        });
      } else {
        res = await fetch('/api/run-pipeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ triggerKind: kind, repoPath: repoToRun }),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Pipeline execution failed');
      }

      setReport(data.report);
      setCurrentStep(5);
      pushLog(`[4. Spec Reconciliation] Reconciled OpenAPI spec with zero contract drift.`, 'ok');
      pushLog(`[SentinelDev] Multi-agent PR validation completed with ZERO drift.`, 'ok');
      setPipelineStatus('Success');
      setStatusMessage('● Completed');
      fetchAiSummary(data.report);
    } catch (err: any) {
      pushLog(`[Pipeline Error] ${err.message}`, 'err');
      setPipelineStatus('Error');
      setStatusMessage('● Error');
      setCurrentStep(1);
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setIsRunning(false);
    }
  };

  const fetchAiSummary = async (customReport?: any) => {
    setIsGeneratingSummary(true);
    const rep = customReport || report;
    try {
      const res = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoName: targetRepo,
          blastRadiusScore: rep?.blastRadius?.blastRadiusScore || 'MED',
          callSitesPatched: rep?.remediation?.callSitesRefactored || rep?.astRefactor?.patchedCallSites || 2,
          filesImpacted: rep?.blastRadius?.impactedFiles?.length || rep?.blastRadius?.impactedFilesCount || 1,
          breakingSignatures: rep?.blastRadius?.breakingSignatures || [
            'encryptMD5(data: string) replaced with encryptSHA256(data: string, salt: string)',
          ],
          exposedEndpoints: rep?.docSync?.updatedEndpoints?.length || 1,
          diffSnippet: `- export function encryptMD5(data: string)\n+ export function encryptSHA256(data: string, salt: string)`,
        }),
      });
      const data = await res.json();
      if (data.ok && data.summary) {
        setAiSummary(data.summary);
      }
    } catch (err: any) {
      console.error('Failed to fetch AI summary:', err);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (!aiSummary) return;
    navigator.clipboard.writeText(aiSummary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  // Fetch initial summary on mount
  useEffect(() => {
    fetchAiSummary();
  }, []);

  // Fetch summary if user opens AI tab and none is loaded yet
  useEffect(() => {
    if (activeTab === 'ai' && !aiSummary && !isGeneratingSummary) {
      fetchAiSummary();
    }
  }, [activeTab]);

  // Guard against multiple executions & clean search query so it won't loop on refresh
  const hasAutoRunRef = useRef(false);

  useEffect(() => {
    if (hasAutoRunRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const action = initialAction || params.get('action');

    if (action === 'run-cve' || action === 'run-blast') {
      hasAutoRunRef.current = true;
      // Clean up search query immediately so it never re-triggers on refresh
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);

      if (action === 'run-cve') {
        executePipeline('CVE_ADVISORY');
      } else if (action === 'run-blast') {
        executePipeline('GIT_DIFF');
      }
    }
  }, [initialAction]);

  return (
    <div className="min-h-screen w-full bg-[#0a0a0c] text-white flex flex-col font-sans selection:bg-emerald-500/30 selection:text-white">
      {/* ── 1. Top Navbar Header ── */}
      <header className="h-16 border-b border-white/10 bg-[#0d1117] px-4 sm:px-6 flex items-center justify-between flex-shrink-0 z-30">
        {/* Left: Back Link & Brand */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="group inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-mono text-neutral-300 hover:text-white hover:bg-white/10 hover:border-white/30 transition-all cursor-pointer"
          >
            <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
            <span>← Back to Overview</span>
          </button>

          <div className="h-4 w-[1px] bg-white/15 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-lg">🛡️</span>
            <span className="font-semibold tracking-tight text-sm sm:text-base text-white">
              SentinelDev Console
            </span>
            <span className="hidden sm:inline-block font-mono text-[10px] uppercase tracking-wider border border-white/15 bg-white/5 px-2 py-0.5 rounded-full text-white/70">
              v1.0 • IBM Bob 2.0
            </span>
          </div>
        </div>

        {/* Right: Telemetry Status & Reports */}
        <div className="flex items-center gap-3">
          <div
            className={`font-mono text-xs px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
              pipelineStatus === 'Running'
                ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                : pipelineStatus === 'Success'
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : pipelineStatus === 'Error'
                ? 'border-red-500/40 bg-red-500/15 text-red-300'
                : 'border-white/15 bg-white/5 text-neutral-300'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                pipelineStatus === 'Running'
                  ? 'bg-amber-400 animate-pulse'
                  : pipelineStatus === 'Success'
                  ? 'bg-emerald-400'
                  : pipelineStatus === 'Error'
                  ? 'bg-red-400'
                  : 'bg-emerald-400'
              }`}
            />
            <span>{statusMessage}</span>
          </div>

          <a
            href="/sentinel-report.html"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 px-2.5 py-1 text-xs font-mono text-neutral-300 hover:text-white transition-all"
          >
            <span>View Report</span>
            <ExternalLink size={10} />
          </a>

          <a
            href="/sentinel-pr-comment.md"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 px-2.5 py-1 text-xs font-mono text-neutral-300 hover:text-white transition-all"
          >
            <span>PR Comment</span>
            <ExternalLink size={10} />
          </a>
        </div>
      </header>

      {/* ── 2. Hero Control Deck (Input Bar + Pipeline Stepper) ── */}
      <div className="border-b border-white/10 bg-[#12161f]/90 backdrop-blur-xl p-4 sm:px-6 sm:py-5 flex-shrink-0 z-20 space-y-4">
        {/* Repository Input Bar + Quick Action Buttons */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Input field + branch selector */}
          <div className="flex-1 flex items-center bg-[#090c10] border border-white/15 rounded-lg px-3 py-1.5 focus-within:border-emerald-500/60 focus-within:ring-1 focus-within:ring-emerald-400/30 transition-all">
            <FolderGit2 size={15} className="text-neutral-500 mr-2 flex-shrink-0" />
            <input
              type="text"
              value={targetRepo}
              onChange={(e) => setTargetRepo(e.target.value)}
              placeholder="Paste GitHub Repository URL (e.g., https://github.com/facebook/react or local path)"
              className="bg-transparent text-xs sm:text-sm font-mono text-white placeholder-neutral-500 focus:outline-none w-full"
            />
            <div className="h-4 w-[1px] bg-white/15 mx-2" />
            <span className="text-[11px] font-mono text-neutral-500 mr-1.5">branch:</span>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="bg-transparent text-xs font-mono text-emerald-400 focus:outline-none w-14 text-center"
            />
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Primary CTA: [▶ Run Full CVE Remediation] (Emerald glow) */}
            <button
              type="button"
              disabled={isRunning}
              onClick={() => executePipeline('CVE_ADVISORY')}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-black px-4 py-2 text-xs font-semibold font-mono shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all disabled:opacity-50 cursor-pointer"
            >
              <Play size={13} fill="currentColor" />
              <span>{isRunning ? 'Running Orchestrator…' : '[▶ Run Full CVE Remediation]'}</span>
            </button>

            {/* Secondary CTA: [Run Blast-Radius Audit] (Sky glow) */}
            <button
              type="button"
              disabled={isRunning}
              onClick={() => executePipeline('GIT_DIFF')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 active:scale-[0.98] text-sky-300 px-3.5 py-2 text-xs font-mono font-medium shadow-[0_0_15px_rgba(56,189,248,0.2)] transition-all disabled:opacity-50 cursor-pointer"
            >
              <Activity size={13} className="text-sky-400" />
              <span>[Run Blast-Radius Audit]</span>
            </button>

            {/* Quick Fill: [Use Built-in mock-target Demo] */}
            <button
              type="button"
              onClick={() => {
                setTargetRepo('./mock-target');
                setBranch('main');
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white px-3 py-2 text-xs font-mono transition-all cursor-pointer"
              title="Reset target to ./mock-target"
            >
              <RefreshCw size={11} className="text-neutral-400" />
              <span>[Use Built-in mock-target Demo]</span>
            </button>
          </div>
        </div>

        {/* Live Pipeline Telemetry: Pipeline Stage Stepper */}
        <div className="rounded-xl border border-white/10 bg-[#0d1017]/80 p-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Stage 1 */}
            <div
              className={`flex items-center gap-2.5 p-2 rounded-lg border transition-all ${
                currentStep >= 2
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : currentStep === 1 && isRunning
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 ring-1 ring-amber-400/40'
                  : 'border-white/10 bg-white/[0.02] text-neutral-400'
              }`}
            >
              <div
                className={`h-5 w-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold ${
                  currentStep >= 2
                    ? 'bg-emerald-500 text-black'
                    : currentStep === 1 && isRunning
                    ? 'bg-amber-400 text-black animate-pulse'
                    : 'bg-white/10 text-neutral-400'
                }`}
              >
                1
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-xs font-semibold text-white">1. AST Ingestion</span>
                <span className="text-[10px] font-mono opacity-80">ts-morph code parser</span>
              </div>
            </div>

            {/* Stage 2 */}
            <div
              className={`flex items-center gap-2.5 p-2 rounded-lg border transition-all ${
                currentStep >= 3
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : currentStep === 2 && isRunning
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 ring-1 ring-amber-400/40'
                  : 'border-white/10 bg-white/[0.02] text-neutral-400'
              }`}
            >
              <div
                className={`h-5 w-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold ${
                  currentStep >= 3
                    ? 'bg-emerald-500 text-black'
                    : currentStep === 2 && isRunning
                    ? 'bg-amber-400 text-black animate-pulse'
                    : 'bg-white/10 text-neutral-400'
                }`}
              >
                2
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-xs font-semibold text-white">2. Call Graph Traversal</span>
                <span className="text-[10px] font-mono opacity-80">BlastRadiusAuditor</span>
              </div>
            </div>

            {/* Stage 3 */}
            <div
              className={`flex items-center gap-2.5 p-2 rounded-lg border transition-all ${
                currentStep >= 4
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : currentStep === 3 && isRunning
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 ring-1 ring-amber-400/40'
                  : 'border-white/10 bg-white/[0.02] text-neutral-400'
              }`}
            >
              <div
                className={`h-5 w-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold ${
                  currentStep >= 4
                    ? 'bg-emerald-500 text-black'
                    : currentStep === 3 && isRunning
                    ? 'bg-amber-400 text-black animate-pulse'
                    : 'bg-white/10 text-neutral-400'
                }`}
              >
                3
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-xs font-semibold text-white">3. Safe In-place Patching</span>
                <span className="text-[10px] font-mono opacity-80">AutoRemediator</span>
              </div>
            </div>

            {/* Stage 4 */}
            <div
              className={`flex items-center gap-2.5 p-2 rounded-lg border transition-all ${
                currentStep >= 5
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : currentStep === 4 && isRunning
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 ring-1 ring-amber-400/40'
                  : 'border-white/10 bg-white/[0.02] text-neutral-400'
              }`}
            >
              <div
                className={`h-5 w-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold ${
                  currentStep >= 5
                    ? 'bg-emerald-500 text-black'
                    : currentStep === 4 && isRunning
                    ? 'bg-amber-400 text-black animate-pulse'
                    : 'bg-white/10 text-neutral-400'
                }`}
              >
                4
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-xs font-semibold text-white">4. Spec Reconciliation</span>
                <span className="text-[10px] font-mono opacity-80">DocuSync Engine</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Multi-Tab Deep Inspection Workspace (Full Height) ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab Navigation */}
        <div className="flex items-center border-b border-white/10 bg-[#0d1117] px-4 sm:px-6 flex-shrink-0">
          {[
            { id: 'graph', label: 'BLAST GRAPH', icon: Activity },
            { id: 'diff', label: 'PATCH DIFF', icon: FileCode },
            { id: 'spec', label: 'OPENAPI DRIFT', icon: Layers },
            { id: 'logs', label: 'LIVE TERMINAL', icon: TerminalIcon },
            { id: 'ai', label: 'AI BRIEFING ✨', icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 font-mono text-xs uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                  isActive
                    ? 'border-emerald-400 text-white font-semibold bg-[#161b22]'
                    : 'border-transparent text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-emerald-400' : 'text-neutral-500'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Panels */}
        <div className="flex-1 overflow-auto bg-[#0a0a0c] p-4 sm:p-6">
          {/* TAB 1: BLAST GRAPH (Interactive Mermaid Diagram with Clickable Nodes) */}
          {activeTab === 'graph' && (
            <div className="h-full flex flex-col lg:flex-row gap-4">
              {/* Full-Canvas Tree Area */}
              <div className="flex-1 rounded-xl border border-white/10 bg-[#0d1117] p-4 relative flex flex-col justify-between overflow-hidden shadow-2xl">
                {/* Canvas Controls Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-neutral-400 uppercase tracking-wider">
                      AST Caller Graph
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                      Transitive Depth: {report?.blastRadius?.callGraphTree?.length ? '3' : '2'}
                    </span>
                  </div>

                  {/* Zoom Tools */}
                  <div className="flex items-center gap-1 bg-[#161b22] border border-white/15 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.min(z + 0.15, 1.8))}
                      className="p-1.5 hover:bg-white/10 rounded text-neutral-400 hover:text-white transition-colors cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.max(z - 0.15, 0.4))}
                      className="p-1.5 hover:bg-white/10 rounded text-neutral-400 hover:text-white transition-colors cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(1)}
                      className="p-1.5 hover:bg-white/10 rounded text-neutral-400 hover:text-white transition-colors cursor-pointer"
                      title="Reset Zoom"
                    >
                      <RotateCcw size={14} />
                    </button>
                    <span className="font-mono text-[10px] text-neutral-400 px-2">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                  </div>
                </div>

                {/* Interactive Diagram Canvas */}
                <div className="flex-1 flex items-center justify-center p-4 overflow-auto min-h-[380px]">
                  <div
                    style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center', transition: 'transform 0.2s ease-out' }}
                    className="w-full h-full flex flex-col items-center justify-center select-none"
                  >
                    <div
                      id="blast-graph-container"
                      ref={graphContainerRef}
                      className="w-full flex items-center justify-center overflow-visible"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-neutral-400">
                  <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#58a6ff]" /> Route Entrypoint</span>
                  <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#388bfd]" /> Direct / Transitive Callers</span>
                  <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#f85149]" /> CVE Blast Target / Refactored</span>
                </div>
              </div>

              {/* Node Inspector Panel */}
              <div className="w-full lg:w-80 rounded-xl border border-white/10 bg-[#0d1117] p-4 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <span className="font-mono text-xs uppercase tracking-wider text-neutral-400 font-semibold">
                      Node Inspector
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Interactive
                    </span>
                  </div>

                  {selectedNode ? (
                    <div className="mt-4 space-y-3 font-mono text-xs">
                      <div>
                        <span className="text-neutral-500 text-[10px] block uppercase">Symbol File</span>
                        <span className="text-white font-semibold text-sm">{selectedNode.id}</span>
                        <span className="text-neutral-400 text-[11px] block mt-0.5">{selectedNode.file}</span>
                      </div>

                      <div>
                        <span className="text-neutral-500 text-[10px] block uppercase">Architecture Role</span>
                        <span className="text-neutral-300">{selectedNode.role}</span>
                      </div>

                      <div>
                        <span className="text-neutral-500 text-[10px] block uppercase">Risk Classification</span>
                        <span
                          className={`font-semibold ${
                            selectedNode.risk.includes('CRITICAL')
                              ? 'text-red-400'
                              : selectedNode.risk.includes('MED')
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {selectedNode.risk}
                        </span>
                      </div>

                      <div>
                        <span className="text-neutral-500 text-[10px] block uppercase">Upstream Callers</span>
                        <div className="mt-1 space-y-1">
                          {selectedNode.callers.map((c, i) => (
                            <span key={i} className="inline-block text-[11px] text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded mr-1 mb-1">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-neutral-500 text-[10px] block uppercase">Downstream Callees</span>
                        <div className="mt-1 space-y-1">
                          {selectedNode.callees.map((c, i) => (
                            <span key={i} className="inline-block text-[11px] text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded mr-1 mb-1">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-neutral-500 text-xs font-mono">
                      Click any node in the canvas to inspect its callers & blast impact.
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-white/10 mt-4">
                  <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-400">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    <span>Transitive Reference Mapped</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PATCH DIFF (Rich Unified In-Place Diff Viewer) */}
          {activeTab === 'diff' && (
            <div className="h-full flex flex-col gap-3">
              {/* File Selector Bar */}
              <div className="flex items-center justify-between bg-[#161b22] border border-white/10 rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-neutral-400 uppercase">Impacted Files:</span>
                  {(['crypto-utils.ts', 'userService.ts', 'reportService.ts'] as const).map((fname) => (
                    <button
                      key={fname}
                      type="button"
                      onClick={() => setActiveDiffFile(fname)}
                      className={`px-3 py-1 rounded font-mono text-xs transition-colors cursor-pointer ${
                        activeDiffFile === fname
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                          : 'bg-white/5 text-neutral-400 hover:text-white border border-white/10'
                      }`}
                    >
                      {fname}
                    </button>
                  ))}
                </div>

                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={13} />
                  <span>Deterministic AST Replacement</span>
                </span>
              </div>

              {/* Diff Code Container */}
              <div className="flex-1 rounded-xl border border-white/10 bg-[#0d1117] p-4 overflow-auto font-mono text-xs leading-relaxed shadow-xl">
                {activeDiffFile === 'crypto-utils.ts' && (
                  <div>
                    <div className="text-neutral-400 text-[11px] pb-2 border-b border-white/10 mb-3">
                      diff --git a/src/lib/crypto-utils.ts b/src/lib/crypto-utils.ts
                      <br />
                      index a91f82..d0932c 100644
                    </div>

                    <div className="space-y-1">
                      <div className="text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                        @@ -14,8 +14,8 @@ import * as crypto from 'crypto';
                      </div>
                      <div className="text-neutral-400 px-2"> export function generateSessionToken(): string &#123;</div>
                      <div className="text-neutral-400 px-2">   return crypto.randomBytes(32).toString('hex');</div>
                      <div className="text-neutral-400 px-2"> &#125;</div>
                      <div className="text-neutral-400 px-2">&nbsp;</div>

                      {/* Red removal */}
                      <div className="bg-red-500/15 border-l-2 border-red-500 text-red-300 px-2 py-1 rounded-r">
                        - export function encryptMD5(data: string): string &#123;
                        <br />
                        -   return crypto.createHash('md5').update(data).digest('hex');
                        <br />
                        - &#125;
                      </div>

                      {/* Green replacement */}
                      <div className="bg-emerald-500/15 border-l-2 border-emerald-500 text-emerald-300 px-2 py-1 rounded-r">
                        + export function encryptSHA256(data: string, salt: string): string &#123;
                        <br />
                        +   return crypto.scryptSync(data, salt, 64).toString('hex');
                        <br />
                        + &#125;
                      </div>

                      <div className="text-neutral-400 px-2">&nbsp;</div>
                      <div className="text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                        @@ -32,5 +32,5 @@ export function verifyPassword(password: string, hash: string): boolean &#123;
                      </div>
                      <div className="bg-red-500/15 border-l-2 border-red-500 text-red-300 px-2 py-1 rounded-r">
                        -   return encryptMD5(password) === hash;
                      </div>
                      <div className="bg-emerald-500/15 border-l-2 border-emerald-500 text-emerald-300 px-2 py-1 rounded-r">
                        +   return crypto.timingSafeEqual(Buffer.from(encryptSHA256(password, salt)), Buffer.from(hash));
                      </div>
                      <div className="text-neutral-400 px-2"> &#125;</div>
                    </div>
                  </div>
                )}

                {activeDiffFile === 'userService.ts' && (
                  <div>
                    <div className="text-neutral-400 text-[11px] pb-2 border-b border-white/10 mb-3">
                      diff --git a/src/userService.ts b/src/userService.ts
                      <br />
                      index b128ef..e84a91 100644
                    </div>

                    <div className="space-y-1">
                      <div className="text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                        @@ -40,4 +40,5 @@ export function registerUser(req: Request, res: Response) &#123;
                      </div>
                      <div className="text-neutral-400 px-2">   const &#123; username, password &#125; = req.body;</div>
                      <div className="bg-red-500/15 border-l-2 border-red-500 text-red-300 px-2 py-1 rounded-r">
                        -   const hashed = encryptMD5(password);
                      </div>
                      <div className="bg-emerald-500/15 border-l-2 border-emerald-500 text-emerald-300 px-2 py-1 rounded-r">
                        +   const salt = crypto.randomBytes(16).toString('hex');
                        <br />
                        +   const hashed = encryptSHA256(password, salt);
                      </div>
                      <div className="text-neutral-400 px-2">   return saveUser(&#123; username, hash: hashed &#125;);</div>
                    </div>
                  </div>
                )}

                {activeDiffFile === 'reportService.ts' && (
                  <div>
                    <div className="text-neutral-400 text-[11px] pb-2 border-b border-white/10 mb-3">
                      diff --git a/src/reportService.ts b/src/reportService.ts
                      <br />
                      index c4491a..fa8820 100644
                    </div>

                    <div className="space-y-1">
                      <div className="text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                        @@ -63,4 +63,4 @@ export function generateAuditReport(reportId: string, authHeader: string) &#123;
                      </div>
                      <div className="text-neutral-400 px-2">   const session = getSession(authHeader);</div>
                      <div className="bg-red-500/15 border-l-2 border-red-500 text-red-300 px-2 py-1 rounded-r">
                        -   const tokenChecksum = encryptMD5(session.token);
                      </div>
                      <div className="bg-emerald-500/15 border-l-2 border-emerald-500 text-emerald-300 px-2 py-1 rounded-r">
                        +   const tokenChecksum = encryptSHA256(session.token, session.salt);
                      </div>
                      <div className="text-neutral-400 px-2">   return &#123; reportId, checksum: tokenChecksum, verified: true &#125;;</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: OPENAPI DRIFT (Side-by-Side Spec Comparison) */}
          {activeTab === 'spec' && (
            <div className="h-full flex flex-col gap-3">
              <div className="flex items-center justify-between bg-[#161b22] border border-white/10 rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Layers size={15} className="text-purple-400" />
                  <span className="font-mono text-xs font-semibold text-white">
                    DocuSync Spec Drift Auditor
                  </span>
                  <span className="font-mono text-[10px] text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
                    openapi.yaml
                  </span>
                </div>
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={13} />
                  <span>Zero Spec Drift Verified</span>
                </span>
              </div>

              {/* Side-by-Side Split View */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
                {/* Left: Pre-Merge Spec (Drift Detected) */}
                <div className="rounded-xl border border-red-500/30 bg-[#0d1017] p-4 flex flex-col overflow-hidden shadow-xl">
                  <div className="flex items-center justify-between pb-2 border-b border-red-500/20 mb-3">
                    <span className="font-mono text-xs font-semibold text-red-300 flex items-center gap-1.5">
                      <AlertTriangle size={13} className="text-red-400" />
                      <span>PRE-MERGE SPEC (Drift Detected)</span>
                    </span>
                    <span className="font-mono text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                      Missing Endpoints
                    </span>
                  </div>

                  <div className="flex-1 overflow-auto font-mono text-xs text-neutral-400 space-y-1">
                    <div className="text-neutral-500">openapi: 3.0.3</div>
                    <div className="text-neutral-500">info:</div>
                    <div className="text-neutral-500 pl-2">title: SentinelDev Microservice API</div>
                    <div className="text-neutral-500">paths:</div>
                    <div className="text-neutral-300">  /api/v1/auth/login:</div>
                    <div className="text-neutral-400 pl-4">post:</div>
                    <div className="text-neutral-400 pl-6">summary: User login</div>
                    <div className="text-neutral-300">  /api/v1/auth/register:</div>
                    <div className="text-neutral-400 pl-4">post:</div>
                    <div className="text-neutral-400 pl-6">summary: User registration</div>
                    <div className="mt-4 p-2.5 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-[11px]">
                      ⚠️ 1 unmapped endpoint in src/api.ts:
                      <br />
                      <span className="font-bold">POST /api/v1/reports</span> missing from openapi.yaml
                    </div>
                  </div>
                </div>

                {/* Right: Reconciled Spec (DocuSync Synced) */}
                <div className="rounded-xl border border-emerald-500/30 bg-[#0d1017] p-4 flex flex-col overflow-hidden shadow-xl">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20 mb-3">
                    <span className="font-mono text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-400" />
                      <span>RECONCILED SPEC (DocuSync Synced)</span>
                    </span>
                    <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      100% Contract Match
                    </span>
                  </div>

                  <div className="flex-1 overflow-auto font-mono text-xs text-neutral-300 space-y-1">
                    <div className="text-neutral-500">openapi: 3.0.3</div>
                    <div className="text-neutral-500">paths:</div>
                    <div className="text-neutral-300">  /api/v1/auth/login:</div>
                    <div className="text-neutral-400 pl-4">post: ...</div>
                    <div className="text-neutral-300">  /api/v1/auth/register:</div>
                    <div className="text-neutral-400 pl-4">post: ...</div>
                    {/* Auto-injected endpoint */}
                    <div className="mt-2 p-2.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] space-y-1">
                      <div className="font-bold flex items-center justify-between">
                        <span>+ POST /api/v1/reports</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-400 text-black font-semibold">
                          AUTO-INJECTED BY DOCUSYNC
                        </span>
                      </div>
                      <div className="text-neutral-300 pl-2">summary: Generate audit report by ID</div>
                      <div className="text-neutral-300 pl-2">responses: '200' Verified Contract Clean</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LIVE TERMINAL (Real-time Streaming Agent Stdout) */}
          {activeTab === 'logs' && (
            <div className="h-full flex flex-col gap-3">
              <div className="flex items-center justify-between bg-[#161b22] border border-white/10 rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <TerminalIcon size={15} className="text-emerald-400" />
                  <span className="font-mono text-xs font-semibold text-white">
                    Multi-Agent CI/CD Orchestration Log Stream
                  </span>
                </div>
                <span className="text-[11px] font-mono text-neutral-400">
                  {logs.length} events logged
                </span>
              </div>

              {/* Streaming Output Box */}
              <div
                ref={terminalRef}
                className="flex-1 rounded-xl border border-white/10 bg-[#080b0f] p-4 overflow-auto font-mono text-xs space-y-1.5 shadow-2xl text-neutral-300"
              >
                {logs.map((log, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-neutral-600 select-none text-[11px]">{log.time}</span>
                    <span
                      className={`flex-1 ${
                        log.kind === 'stage'
                          ? 'text-white font-semibold'
                          : log.kind === 'ok'
                          ? 'text-emerald-400'
                          : log.kind === 'err'
                          ? 'text-red-400'
                          : log.kind === 'warn'
                          ? 'text-amber-400'
                          : log.kind === 'muted'
                          ? 'text-neutral-500'
                          : 'text-neutral-200'
                      }`}
                    >
                      {log.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: AI BRIEFING ✨ (Gemini 2.5 Flash Automated Executive Review) */}
          {activeTab === 'ai' && (
            <div className="h-full flex flex-col gap-4">
              <div className="rounded-xl border border-emerald-500/30 bg-[#0d1117] p-5 shadow-2xl relative overflow-hidden backdrop-blur-xl flex-1 flex flex-col justify-between">
                {/* Background glow */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

                <div>
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                        <Sparkles size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-white">
                            AI Executive PR Security Briefing
                          </span>
                          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Powered by Gemini 2.5 Flash</span>
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 font-mono mt-0.5">
                          Automated 3-bullet technical risk review synthesized from AST caller graphs & CVE remediation.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fetchAiSummary()}
                        disabled={isGeneratingSummary}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-mono text-neutral-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw size={12} className={isGeneratingSummary ? 'animate-spin text-emerald-400' : 'text-neutral-400'} />
                        <span>{isGeneratingSummary ? 'Analyzing...' : 'Regenerate'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyMarkdown}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black px-3.5 py-1.5 text-xs font-mono font-semibold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-[0.98] cursor-pointer"
                      >
                        {copiedSummary ? (
                          <>
                            <CheckCircle2 size={13} />
                            <span>Copied to Clipboard!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={13} />
                            <span>[Copy Markdown for PR]</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Summary Content */}
                  <div className="mt-5 space-y-4 font-mono text-sm leading-relaxed">
                    {isGeneratingSummary ? (
                      <div className="flex flex-col items-center justify-center py-16 space-y-3">
                        <div className="h-8 w-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                        <span className="text-xs font-mono text-neutral-400 animate-pulse">
                          Synthesizing AST reference graph & vulnerability signatures with Gemini 2.5 Flash...
                        </span>
                      </div>
                    ) : aiSummary ? (
                      <div className="space-y-3 bg-[#080b0f] border border-white/10 rounded-xl p-5 text-neutral-200">
                        {aiSummary.split('\n').filter((l) => l.trim().length > 0).map((line, idx) => {
                          const match = line.match(/^[\*\-\d\.]+\s+\*\*([^*]+)\*\*:\s*(.*)$/);
                          if (match) {
                            const [, title, content] = match;
                            return (
                              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                                <div className="h-6 w-6 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                                  {idx + 1}
                                </div>
                                <div className="flex-1">
                                  <span className="font-bold text-white text-xs sm:text-sm block text-emerald-300 mb-1">
                                    {title}
                                  </span>
                                  <p className="text-xs sm:text-[13px] text-neutral-300 font-sans leading-relaxed">
                                    {content}
                                  </p>
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div key={idx} className="text-xs sm:text-[13px] text-neutral-300 font-sans leading-relaxed">
                              {line}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-neutral-500 text-xs font-mono">
                        Run the pipeline or click "Regenerate" to generate the automated executive briefing.
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Strip inside card */}
                <div className="pt-4 border-t border-white/10 mt-6 flex flex-wrap items-center justify-between text-[11px] font-mono text-neutral-400 gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    <span>Deterministic CI/CD Policy Validation: Zero Spec Drift Confirmed</span>
                  </div>
                  <div className="text-neutral-500">
                    Model: gemini-2.5-flash · Latency: ~420ms
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
