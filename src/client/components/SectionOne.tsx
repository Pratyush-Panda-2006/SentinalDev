import React from 'react';
import { ChevronRight, Shield, Play } from 'lucide-react';
import { Reveal } from './Reveal';

interface SectionOneProps {
  onRunDemo: () => void;
}

export const SectionOne: React.FC<SectionOneProps> = ({ onRunDemo }) => {
  const services = [
    '/ DETERMINISTIC AST REFACTORING',
    '/ TRANSITIVE CALLER GRAPH',
    '/ ZERO SPEC DRIFT GUARANTEE',
  ];

  return (
    <section className="relative min-h-screen supports-[height:100svh]:min-h-[100svh] w-full flex flex-col justify-between px-5 sm:px-8 md:px-12 pt-24 sm:pt-28 pb-12 md:pb-16 z-10">
      {/* Top row */}
      <div className="flex flex-col gap-8 sm:flex-row sm:items-start justify-between">
        {/* Left — service list */}
        <div className="flex flex-col gap-2">
          {services.map((service, i) => (
            <Reveal key={service} delay={150 + i * 120}>
              <div className="font-mono text-xs uppercase tracking-[0.15em] text-white/90 drop-shadow-md select-none">
                {service}
              </div>
            </Reveal>
          ))}
        </div>

        {/* Right — Subtitle copy */}
        <div className="max-w-md sm:text-right">
          <Reveal delay={300}>
            <p className="text-base sm:text-lg leading-relaxed text-white drop-shadow-md font-normal">
              A deterministic, multi-agent CI/CD guardian powered by IBM Bob 2.0 and ts-morph AST analysis.
            </p>
          </Reveal>
        </div>
      </div>

      {/* Bottom row */}
      <div className="mt-auto pt-16 flex flex-col gap-8 md:flex-row md:items-end justify-between">
        {/* Left headline area */}
        <div className="max-w-2xl">
          {/* Badge */}
          <Reveal delay={150}>
            <div className="inline-block border-l-2 border-white bg-white/15 px-3 py-1.5 backdrop-blur-md mb-5">
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-white drop-shadow-sm font-medium">
                Autonomous PR Blast-Radius & CVE Remediation Engine
              </span>
            </div>
          </Reveal>

          {/* H1 Headline */}
          <Reveal delay={280}>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-normal leading-[1.05] tracking-tight text-white drop-shadow-lg">
              Patch CVEs. Map Blast Radius.
              <br />
              Eliminate Spec Drift.
            </h1>
          </Reveal>
        </div>

        {/* Right — glass contact / engine card */}
        <div className="self-start md:self-end">
          <Reveal delay={420}>
            <div className="flex items-center gap-4 rounded-xl bg-white/15 p-3 backdrop-blur-md border border-white/15 shadow-xl">
              <div className="h-24 w-20 rounded-lg flex items-center justify-center bg-white/10 border border-white/20 text-3xl shadow-md flex-shrink-0">
                <Shield size={36} className="text-white" />
              </div>
              <div className="flex flex-col gap-1.5 pr-2">
                <span className="text-sm font-medium text-white drop-shadow-sm">
                  SentinelDev Engine
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/60">
                  Autonomous CI/CD Guardian
                </span>
                <button
                  type="button"
                  onClick={onRunDemo}
                  className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-medium text-black transition-colors duration-300 hover:bg-white/85 active:scale-95 shadow-md"
                >
                  <Play size={12} fill="currentColor" />
                  <span>[ Run Demo]</span>
                  <ChevronRight size={14} className="text-black" />
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};
