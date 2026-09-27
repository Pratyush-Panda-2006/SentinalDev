import React, { useState } from 'react';
import { X, CheckCircle, Calendar, Sparkles } from 'lucide-react';

interface ConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PORTRAIT_URL =
  'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260728_050334_5b076e26-0ce7-4898-b432-d764190e448f.png&w=1280&q=85';

export const ConsultationModal: React.FC<ConsultationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('AI Automation');
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      // reset after feedback
    }, 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 bg-black/80 backdrop-blur-md animate-fadeIn">
      {/* Modal card */}
      <div className="relative w-full max-w-lg rounded-2xl border border-white/20 bg-[#0d0d0e]/95 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors p-1"
        >
          <X size={20} />
        </button>

        {!submitted ? (
          <div>
            {/* Header info */}
            <div className="flex items-center gap-4 mb-6 pb-5 border-b border-white/10">
              <img
                src={PORTRAIT_URL}
                alt="Mitha, co-founder of NovaAI"
                className="h-16 w-14 rounded-lg object-cover border border-white/15 shadow-md"
              />
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/60">
                  NovaAI Consultation
                </span>
                <h3 className="text-lg font-medium text-white">
                  Schedule with Mitha
                </h3>
                <p className="text-xs text-white/70">
                  15-minute strategy call on automation and architecture.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.15em] text-white/70 mb-1.5">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Vance"
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:border-white/40 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.15em] text-white/70 mb-1.5">
                  Work Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@company.com"
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:border-white/40 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.15em] text-white/70 mb-1.5">
                  Focus Area
                </label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-[#141416] px-3.5 py-2.5 text-sm text-white focus:border-white/40 focus:outline-none"
                >
                  <option value="AI Automation">AI Automation & Workflows</option>
                  <option value="AI Integration">System & API Integration</option>
                  <option value="AI Agent Development">Autonomous Agent Engineering</option>
                  <option value="SentinelDev Blast Radius">SentinelDev Blast-Radius Engine</option>
                </select>
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.15em] text-white/70 mb-1.5">
                  Project Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Describe your current bottleneck or stack..."
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-sm text-white placeholder-white/30 focus:border-white/40 focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-full bg-white py-3 text-sm font-medium text-black transition-colors duration-300 hover:bg-white/85"
                >
                  <Calendar size={16} />
                  <span>Confirm 15-Minute Session</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white border border-white/20">
              <CheckCircle size={28} className="text-white" />
            </div>
            <h3 className="text-xl font-medium text-white">Call Confirmed</h3>
            <p className="text-sm text-white/75 max-w-sm mx-auto">
              Thank you, {name || 'there'}! A calendar invitation has been sent to{' '}
              <span className="text-white font-medium">{email || 'your email'}</span>.
              Mitha looks forward to aligning on your goals.
            </p>
            <div className="pt-4">
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  onClose();
                }}
                className="rounded-full border border-white/25 bg-white/10 px-6 py-2.5 text-xs font-medium text-white hover:bg-white/20"
              >
                Close Window
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
