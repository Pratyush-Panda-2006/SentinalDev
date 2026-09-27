import React from 'react';
import { ExternalLink, GitBranch, FileText, Activity, ShieldCheck } from 'lucide-react';

interface FooterProps {
  onNavigateDemo?: () => void;
  onNavigateOverview?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigateDemo,
  onNavigateOverview,
}) => {
  return (
    <footer className="w-full bg-[#0a0a0c] border-t border-white/10 py-12 px-6 sm:px-12 z-20 relative">
      <div className="max-w-6xl mx-auto">
        {/* 3 Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
          {/* Column 1 (Brand & Mission) */}
          <div className="md:col-span-6 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🛡️</span>
              <span className="font-semibold text-white text-lg tracking-tight">SentinelDev</span>
              <span className="font-mono text-[10px] uppercase tracking-wider border border-white/20 bg-white/10 px-2 py-0.5 rounded-full text-white/80">
                v1.0
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-md font-normal">
              Deterministic multi-agent CI/CD guardian powered by IBM Bob 2.0 and ts-morph AST analysis. Eliminates CVE triage errors and guarantees zero spec drift.
            </p>
            <div className="mt-2 inline-flex items-center gap-2 text-xs font-mono text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Built for the IBM Bob 2.0 Challenge</span>
            </div>
          </div>

          {/* Column 2 (Core Architecture) */}
          <div className="md:col-span-3 flex flex-col gap-2.5">
            <h4 className="font-mono text-xs uppercase tracking-wider text-white font-semibold mb-1">
              Core Architecture
            </h4>
            <ul className="space-y-2 text-xs text-neutral-400 font-mono">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('section-two');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-emerald-400 transition-colors text-left flex items-center gap-1.5"
                >
                  <Activity size={12} className="text-emerald-400/80" />
                  <span>AutoRemediator (AST Engine)</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('section-two');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-cyan-400 transition-colors text-left flex items-center gap-1.5"
                >
                  <ShieldCheck size={12} className="text-cyan-400/80" />
                  <span>BlastRadiusAuditor (Call Tree)</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('section-two');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-purple-400 transition-colors text-left flex items-center gap-1.5"
                >
                  <FileText size={12} className="text-purple-400/80" />
                  <span>DocuSync (OpenAPI Auto-Reconcile)</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onNavigateDemo}
                  className="text-white hover:text-emerald-400 transition-colors font-semibold text-left flex items-center gap-1 mt-1"
                >
                  <span>Launch Execution Console ↗</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3 (Resources & Proofs) */}
          <div className="md:col-span-3 flex flex-col gap-2.5">
            <h4 className="font-mono text-xs uppercase tracking-wider text-white font-semibold mb-1">
              Resources & Proofs
            </h4>
            <ul className="space-y-2 text-xs text-neutral-400 font-mono">
              <li>
                <a
                  href="https://github.com/Pratyush-Panda-2006/SentinalDev"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3 h-3 fill-current flex-shrink-0" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  <span>GitHub Repository</span>
                  <ExternalLink size={10} className="text-neutral-500" />
                </a>
              </li>
              <li>
                <a
                  href="/sentinel-pr-comment.md"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <FileText size={12} />
                  <span>PR Blast Radius Comment</span>
                  <ExternalLink size={10} className="text-neutral-500" />
                </a>
              </li>
              <li>
                <a
                  href="/sentinel-report.html"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Activity size={12} />
                  <span>Interactive Mermaid Graph</span>
                  <ExternalLink size={10} className="text-neutral-500" />
                </a>
              </li>
              <li>
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Bob Session Proofs</span>
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="border-t border-white/5 pt-6 mt-8 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-neutral-500 font-mono">
          <div>
            © 2026 SentinelDev. Deterministic CI/CD Guardian.
          </div>
          <div>
            Orchestrated with IBM Bob 2.0 · TypeScript AST Engine
          </div>
        </div>
      </div>
    </footer>
  );
};
