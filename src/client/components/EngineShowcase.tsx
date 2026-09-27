import React, { useEffect, useRef, useState } from 'react';
import { MacBookPro } from './ui/macbook-pro';
import { SentinelConsole } from './SentinelConsole';
import { Sparkles, Terminal, Activity, GitBranch } from 'lucide-react';

interface EngineShowcaseProps {
  autoRunTrigger?: 'CVE_ADVISORY' | 'GIT_DIFF' | null;
  initialTab?: 'graph' | 'diff' | 'spec' | 'breaking' | 'logs';
  onNavigateDemo?: (action?: string) => void;
}

export const EngineShowcase: React.FC<EngineShowcaseProps> = ({
  autoRunTrigger,
  initialTab = 'graph',
  onNavigateDemo,
}) => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.15 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="engine-showcase"
      ref={sectionRef}
      className="relative min-h-screen flex flex-col items-center justify-center py-20 px-4 sm:px-8 bg-[#0a0a0a] w-full z-20 overflow-hidden"
    >
      {/* Background radial gradient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] sm:w-[900px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none"
        aria-hidden="true"
      />

      <div className="w-full max-w-5xl mx-auto flex flex-col items-center text-center">
        {/* Section Header */}
        <div
          className={`flex flex-col items-center text-center max-w-3xl mb-12 sm:mb-16 transition-all duration-700 ease-out ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          {/* Top Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3.5 py-1 text-xs font-mono uppercase tracking-[0.18em] text-emerald-300 backdrop-blur-md mb-4 shadow-[0_0_15px_rgba(52,211,153,0.15)]">
            <Sparkles size={12} className="text-emerald-400" />
            <span>LIVE INTERACTIVE ENGINE</span>
          </div>

          {/* Section Heading */}
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-white drop-shadow-md">
            Autonomous Blast-Radius & Remediation Architecture
          </h2>

          {/* Subtitle */}
          <p className="mt-4 text-sm sm:text-base text-white/70 font-normal leading-relaxed max-w-2xl">
            Interact directly with the multi-agent pipeline inside the console below.
          </p>
        </div>

        {/* MacBook Pro Display Wrapper with Smooth Transition */}
        <div
          className={`w-full max-w-5xl mx-auto transition-all duration-700 ease-out transform ${
            isVisible ? 'opacity-100 scale-100' : 'opacity-80 scale-[0.98]'
          }`}
        >
          <MacBookPro width="100%" height="auto" className="w-full h-auto drop-shadow-2xl">
            {/* Mounted SentinelDev Engine Dashboard inside laptop screen viewport */}
            <SentinelConsole
              embedded
              autoRunTrigger={autoRunTrigger}
              initialTab={initialTab}
              onNavigateDemo={onNavigateDemo}
            />
          </MacBookPro>
        </div>

        {/* Bottom Feature Badges */}
        <div
          className={`mt-12 flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-white/60 transition-all duration-700 delay-300 ease-out ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-sm">
            <Activity size={13} className="text-emerald-400" />
            <span>Interactive Mermaid.js AST Tree</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-sm">
            <GitBranch size={13} className="text-cyan-400" />
            <span>Live Unified In-Place Diffs</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-sm">
            <Terminal size={13} className="text-purple-400" />
            <span>Real-time CI/CD Agent Logs</span>
          </div>
        </div>
      </div>
    </section>
  );
};
