import React from 'react';
import { ChevronRight, Play, ExternalLink } from 'lucide-react';
import { Reveal } from './Reveal';

interface SectionTwoProps {
  onRunDemo: () => void;
  onOpenReport: () => void;
}

export const SectionTwo: React.FC<SectionTwoProps> = ({
  onRunDemo,
  onOpenReport,
}) => {
  const capabilities = [
    {
      index: '01',
      title: 'AutoRemediator',
      body: 'Traverses repository AST via ts-morph, applies safe symbol replacements in-place without breaking call parameters, and captures unified diffs.',
    },
    {
      index: '02',
      title: 'BlastRadiusAuditor',
      body: 'Recursively queries AST reference graphs to uncover every direct and transitive caller, computing deterministic blast-radius impact scores before PR merge.',
    },
    {
      index: '03',
      title: 'DocuSync',
      body: 'Discovers Express router definitions, detects unmapped API endpoints, and auto-syncs route definitions into openapi.yaml and README.md.',
    },
  ];

  return (
    <section
      id="section-two"
      className="relative min-h-screen supports-[height:100svh]:min-h-[100svh] w-full flex flex-col justify-between px-5 sm:px-8 md:px-12 pt-24 sm:pt-28 pb-12 md:pb-16 z-10"
    >
      {/* Top row */}
      <div className="flex flex-col gap-8 sm:flex-row sm:items-start justify-between">
        {/* Left badge */}
        <Reveal delay={120}>
          <div className="inline-block border-l-2 border-white bg-white/15 px-3 py-1.5 backdrop-blur-md">
            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-white drop-shadow-sm font-medium">
              Deterministic Multi-Agent Architecture
            </span>
          </div>
        </Reveal>

        {/* Right copy */}
        <div className="max-w-sm sm:text-right">
          <Reveal delay={220}>
            <p className="text-lg sm:text-xl leading-relaxed text-white drop-shadow-md font-normal">
              Our agents eliminate triage errors, map transitive caller trees, and guarantee zero drift between Express routes and OpenAPI specs.
            </p>
          </Reveal>
        </div>
      </div>

      {/* Bottom area */}
      <div className="mt-auto pt-16 flex flex-1 flex-col justify-end gap-12 md:flex-row md:items-end md:justify-between md:gap-16">
        {/* Left column */}
        <div className="max-w-xl">
          {/* H2 */}
          <Reveal delay={180}>
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-normal leading-[1.05] tracking-tight text-white drop-shadow-lg">
              Three specialized agents.
              <br />
              One cohesive guardian.
            </h2>
          </Reveal>

          {/* Body */}
          <Reveal delay={320}>
            <p className="mt-6 max-w-md text-sm sm:text-base text-white/80 drop-shadow-md leading-relaxed font-normal">
              Powered by IBM Bob 2.0 orchestrator and ts-morph AST analysis to eliminate human triage errors during critical dependency patches.
            </p>
          </Reveal>

          {/* CTAs */}
          <Reveal delay={420}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onRunDemo}
                className="group inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs sm:text-sm font-medium text-black transition-all duration-300 hover:bg-white/85 active:scale-95 shadow-md"
              >
                <Play size={13} fill="currentColor" />
                <span>[ Run Demo ]</span>
                <ChevronRight
                  size={14}
                  className="text-black transition-transform duration-300 group-hover:translate-x-0.5"
                />
              </button>

              <button
                type="button"
                onClick={onOpenReport}
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 backdrop-blur-md px-5 py-2.5 text-xs sm:text-sm font-medium text-white transition-all duration-300 hover:bg-white/20 active:scale-95"
              >
                <span>View Generated Report</span>
                <ExternalLink size={13} />
              </button>
            </div>
          </Reveal>
        </div>

        {/* Right — frosted capability panel */}
        <div className="w-full max-w-md rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md px-5 sm:px-6 shadow-2xl">
          {capabilities.map((cap, i) => (
            <Reveal key={cap.index} delay={300 + i * 110}>
              <div
                className={`group flex items-start gap-5 py-5 ${
                  i < capabilities.length - 1 ? 'border-b border-white/15' : ''
                }`}
              >
                {/* Index */}
                <span className="font-mono text-[11px] tracking-[0.15em] text-white/55 mt-1">
                  {cap.index}
                </span>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base sm:text-lg font-medium text-white transition-colors duration-300 group-hover:text-white">
                      {cap.title}
                    </h3>
                    <ChevronRight
                      size={16}
                      className="text-white/40 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-white"
                    />
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/70">
                    {cap.body}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};
