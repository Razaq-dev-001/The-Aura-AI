import React, { useState } from 'react';
import { CheckCircle2, FolderCode, ArrowRight } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onFinish: (config: { provider: string; projectsDir: string }) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onFinish
}) => {
  const [provider, setProvider] = useState('openai');
  const [projectsDir, setProjectsDir] = useState('./projects');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white text-black border border-black rounded-xl shadow-2xl overflow-hidden p-6 space-y-6">
        {/* Welcome Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded bg-black text-white flex items-center justify-center mx-auto font-bold text-lg">
            A
          </div>
          <h2 className="text-lg font-bold text-black tracking-tight">Welcome to AURA</h2>
          <p className="text-xs text-zinc-600 max-w-sm mx-auto">
            Autonomous Universal Reasoning Assistant — your private personal AI engineering assistant.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="space-y-2 bg-zinc-50 border border-zinc-300 rounded p-3.5 text-xs text-black">
          {[
            'Deep codebase analysis & AST symbol extraction',
            'Precise patch editing & automatic diff tracking',
            'Controlled terminal execution & automated test recovery',
            'Persistent cross-session architectural memory'
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-black shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        {/* Initial Configuration */}
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-black font-semibold mb-1">Primary AI Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full bg-white border border-zinc-300 rounded px-3 py-2 text-black focus:outline-none focus:border-black"
            >
              <option value="openai">OpenAI (ChatGPT / GPT-4o)</option>
              <option value="ollama">Ollama (Local Offline)</option>
              <option value="gemini">Google Gemini</option>
              <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
              <option value="local-aura-engine">Built-in AURA Offline Engine</option>
            </select>
          </div>

          <div>
            <label className="block text-black font-semibold mb-1">Projects Directory Path</label>
            <div className="flex items-center gap-2">
              <FolderCode className="w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={projectsDir}
                onChange={(e) => setProjectsDir(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded px-3 py-1.5 text-black font-mono focus:outline-none focus:border-black"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => onFinish({ provider, projectsDir })}
          className="w-full py-2.5 rounded bg-black hover:bg-zinc-800 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all"
        >
          <span>Get Started</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
