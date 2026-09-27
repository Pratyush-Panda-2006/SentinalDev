import React, { useState, useEffect } from 'react';
import { ScrollVideo } from './components/ScrollVideo';
import { Navbar } from './components/Navbar';
import { SectionOne } from './components/SectionOne';
import { SectionTwo } from './components/SectionTwo';
import { MarqueeBanner } from './components/MarqueeBanner';
import { EngineShowcase } from './components/EngineShowcase';
import { SentinelConsole } from './components/SentinelConsole';
import { Footer } from './components/Footer';
import { DemoPage } from './pages/DemoPage';

export const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'graph' | 'diff' | 'spec' | 'breaking' | 'logs'>('graph');
  const [modalTrigger, setModalTrigger] = useState<'CVE_ADVISORY' | 'GIT_DIFF' | null>(null);

  // Embedded showcase state inside MacBook Pro
  const [embeddedTab, setEmbeddedTab] = useState<'graph' | 'diff' | 'spec' | 'breaking' | 'logs'>('graph');
  const [embeddedTrigger, setEmbeddedTrigger] = useState<'CVE_ADVISORY' | 'GIT_DIFF' | null>(null);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path.split('?')[0]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRunDemo = () => {
    navigate('/demo?action=run-cve');
  };

  const handleOpenConsole = (tab: 'graph' | 'diff' | 'spec' | 'breaking' | 'logs' = 'graph') => {
    navigate('/demo');
  };

  // If on /demo or /app route, render the full-screen execution workspace
  if (currentPath === '/demo' || currentPath === '/app') {
    return (
      <DemoPage
        onBack={() => navigate('/')}
      />
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-[#0a0a0a] text-white selection:bg-white/20 selection:text-white overflow-x-hidden">
      {/* 1. Full-viewport scroll-scrubbed video background */}
      <ScrollVideo />

      {/* 2. Interactive page content wrapper */}
      <div className="relative z-10 w-full">
        {/* Fixed Navbar */}
        <Navbar
          onRunDemo={handleRunDemo}
          onOpenConsole={handleOpenConsole}
        />

        {/* Main Content Layout Sequence */}
        <main className="w-full">
          {/* 1. Hero Section (Untouched & Preserved in exact hierarchy) */}
          <div id="hero-section-wrapper" className="w-full">
            <SectionOne onRunDemo={handleRunDemo} />

            <SectionTwo
              onRunDemo={handleRunDemo}
              onOpenReport={() => window.open('/sentinel-report.html', '_blank')}
            />
          </div>

          {/* 2. Full-Width Infinite Scrolling Text Marquee (Theme Color Ribbon) */}
          <MarqueeBanner />

          {/* 3. Pixel-Accurate MacBook Pro Engine Showcase Section */}
          <EngineShowcase
            autoRunTrigger={embeddedTrigger}
            initialTab={embeddedTab}
            onNavigateDemo={(action) => navigate(action ? `/demo?action=${action}` : '/demo')}
          />
        </main>

        {/* 4. Sleek Dark Developer Footer */}
        <Footer onNavigateDemo={() => navigate('/demo?action=run-cve')} />
      </div>

      {/* SentinelDev Engine Console Modal (for fullscreen quick modal when triggered) */}
      <SentinelConsole
        isOpen={consoleOpen}
        onClose={() => {
          setConsoleOpen(false);
          setModalTrigger(null);
        }}
        autoRunTrigger={modalTrigger}
        initialTab={modalTab}
        onNavigateDemo={(action) => {
          setConsoleOpen(false);
          navigate(action ? `/demo?action=${action}` : '/demo');
        }}
      />
    </div>
  );
};
