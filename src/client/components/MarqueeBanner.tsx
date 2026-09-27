import React from 'react';

const MARQUEE_TEXT =
  '✦ DETERMINISTIC AST REFACTORING ✦ TRANSITIVE CALLER GRAPH ✦ ZERO SPEC DRIFT GUARANTEE ✦ AUTONOMOUS CVE REMEDIATION ✦ POWERED BY IBM BOB 2.0 ✦';

export const MarqueeBanner: React.FC = () => {
  return (
    <div className="relative w-full overflow-hidden border-y border-black/20 bg-[#00ff66] py-3.5 shadow-[0_0_35px_rgba(0,255,102,0.35)] select-none z-20">
      {/* Top subtle highlight line */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-white/50" />

      {/* Marquee track with pause-on-hover */}
      <div className="animate-marquee flex items-center">
        {/* Sequence 1 */}
        <span
          className="text-xs sm:text-sm font-black tracking-[0.2em] text-black px-4 whitespace-nowrap uppercase"
          style={{ fontFamily: "'Fira Code', 'Roboto Mono', 'SF Mono', 'Courier New', monospace" }}
        >
          {MARQUEE_TEXT}
        </span>
        <span
          className="text-xs sm:text-sm font-black tracking-[0.2em] text-black px-4 whitespace-nowrap uppercase"
          style={{ fontFamily: "'Fira Code', 'Roboto Mono', 'SF Mono', 'Courier New', monospace" }}
        >
          {MARQUEE_TEXT}
        </span>
        {/* Sequence 2 for seamless -50% loop */}
        <span
          className="text-xs sm:text-sm font-black tracking-[0.2em] text-black px-4 whitespace-nowrap uppercase"
          style={{ fontFamily: "'Fira Code', 'Roboto Mono', 'SF Mono', 'Courier New', monospace" }}
        >
          {MARQUEE_TEXT}
        </span>
        <span
          className="text-xs sm:text-sm font-black tracking-[0.2em] text-black px-4 whitespace-nowrap uppercase"
          style={{ fontFamily: "'Fira Code', 'Roboto Mono', 'SF Mono', 'Courier New', monospace" }}
        >
          {MARQUEE_TEXT}
        </span>
      </div>

      {/* Bottom subtle shadow line */}
      <div className="absolute bottom-0 inset-x-0 h-[1px] bg-black/25" />
    </div>
  );
};
