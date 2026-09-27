import React from 'react';
import { Shield, Play } from 'lucide-react';
import { Reveal } from './Reveal';

interface NavbarProps {
  onRunDemo: () => void;
  onOpenConsole: (tab?: 'graph' | 'diff' | 'spec' | 'breaking' | 'logs') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onRunDemo,
  onOpenConsole,
}) => {
  const navLinks = [
    {
      name: 'Architecture',
      onClick: () => {
        const el = document.getElementById('section-two') || document.getElementById('capability-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      },
    },
    {
      name: 'Blast Radius',
      onClick: () => {
        onOpenConsole('graph');
      },
    },
    {
      name: 'OpenAPI Sync',
      onClick: () => {
        onOpenConsole('spec');
      },
    },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-white/15 bg-[#0a0a0a]/60 backdrop-blur-md">
      <div className="mx-auto flex h-20 items-center justify-between px-5 sm:px-8 md:px-12">
        {/* Brand / Logo: 🛡️ SentinelDev with badge v1.0 • IBM Bob 2.0 */}
        <Reveal delay={0}>
          <a
            href="/"
            className="flex items-center gap-2.5 text-white transition-opacity hover:opacity-85"
          >
            <span className="text-xl">🛡️</span>
            <span className="text-lg sm:text-xl font-medium tracking-tight">
              SentinelDev
            </span>
            <span className="ml-1 font-mono text-[10px] uppercase tracking-wider border border-white/20 bg-white/10 px-2 py-0.5 rounded-full text-white/70">
              v1.0 • IBM Bob 2.0
            </span>
          </a>
        </Reveal>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-8 lg:gap-10">
          {navLinks.map((link, i) => (
            <Reveal key={link.name} delay={100 + i * 100}>
              <button
                type="button"
                onClick={link.onClick}
                className="group relative flex items-center text-sm text-white/85 transition-colors duration-300 hover:text-white"
              >
                <span>{link.name}</span>
              </button>
            </Reveal>
          ))}
        </nav>

        {/* Primary Action Button: [▶ Run Demo] */}
        <div className="flex items-center gap-3">
          <Reveal delay={500}>
            <button
              type="button"
              onClick={onRunDemo}
              className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/15 backdrop-blur-md px-4 py-2 text-xs sm:px-5 sm:text-sm font-medium text-white transition-all duration-300 hover:bg-white/25 active:scale-[0.98]"
            >
              <Play size={12} fill="currentColor" />
              <span>[ Run Demo]</span>
            </button>
          </Reveal>
        </div>
      </div>
    </header>
  );
};
