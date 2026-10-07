import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Bookmark,
  Keyboard,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Key
} from 'lucide-react';
import { UserSettings, ProviderHealth } from '@aura/shared';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings | null;
  providerHealth: ProviderHealth[];
  onSaveSettings: (settings: Partial<UserSettings>) => Promise<void>;
  onTestProvider: (providerId: string) => Promise<void>;
  onClearMemory: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  providerHealth,
  onSaveSettings,
  onTestProvider,
  onClearMemory
}) => {
  const [activeTab, setActiveTab] = useState<'providers' | 'agent' | 'memory' | 'shortcuts'>('providers');

  const [provider, setProvider] = useState(settings?.defaultProvider || 'free-ai');
  const [openrouterKey, setOpenrouterKey] = useState((settings as any)?.openrouterApiKey || '');
  const [openaiKey, setOpenaiKey] = useState(settings?.openaiApiKey || '');
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState(settings?.openaiBaseUrl || 'https://api.openai.com/v1');
  const [defaultModel, setDefaultModel] = useState(settings?.defaultModel || 'free-gpt-4o');

  const [ollamaUrl, setOllamaUrl] = useState(settings?.ollamaBaseUrl || 'http://localhost:11434');
  const [geminiKey, setGeminiKey] = useState(settings?.geminiApiKey || '');
  const [anthropicKey, setAnthropicKey] = useState(settings?.anthropicApiKey || '');

  const [agentMode, setAgentMode] = useState(settings?.agentMode || 'ASSIST');
  const [autoApproveSafe, setAutoApproveSafe] = useState(settings?.autoApproveSafeCommands ?? true);
  const [maxIterations, setMaxIterations] = useState(settings?.maxIterations || 15);
  const [memoryEnabled, setMemoryEnabled] = useState(settings?.memoryEnabled ?? true);

  const [isSaving, setIsSaving] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const freeAiHealth = providerHealth.find((p) => p.provider === 'free-ai');
  const openrouterHealth = providerHealth.find((p) => p.provider === 'openrouter');
  const openaiHealth = providerHealth.find((p) => p.provider === 'openai');
  const ollamaHealth = providerHealth.find((p) => p.provider === 'ollama');

  const handleSave = async () => {
    setIsSaving(true);
    await onSaveSettings({
      defaultProvider: provider,
      defaultModel,
      openaiApiKey: openaiKey || undefined,
      openaiBaseUrl: openaiBaseUrl || 'https://api.openai.com/v1',
      openrouterApiKey: openrouterKey || undefined,
      ollamaBaseUrl: ollamaUrl,
      geminiApiKey: geminiKey || undefined,
      anthropicApiKey: anthropicKey || undefined,
      agentMode,
      autoApproveSafeCommands: autoApproveSafe,
      maxIterations: Number(maxIterations),
      memoryEnabled
    });
    setIsSaving(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleTest = async (provId: string) => {
    setTestingProvider(provId);
    await onTestProvider(provId);
    setTestingProvider(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white text-black border border-black rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-white">
          <div>
            <h2 className="text-sm font-bold text-black">AURA Settings & AI Gateway</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Free AI, OmniRoute, ChatGPT, and execution safety</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-black hover:bg-zinc-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Settings Navigation Tabs */}
          <div className="w-48 border-r border-zinc-200 p-3 space-y-1 bg-zinc-50 text-xs">
            <button
              onClick={() => setActiveTab('providers')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded font-medium transition-colors text-left ${
                activeTab === 'providers'
                  ? 'bg-black text-white'
                  : 'text-zinc-600 hover:bg-zinc-200 hover:text-black'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>AI Providers</span>
            </button>

            <button
              onClick={() => setActiveTab('agent')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded font-medium transition-colors text-left ${
                activeTab === 'agent'
                  ? 'bg-black text-white'
                  : 'text-zinc-600 hover:bg-zinc-200 hover:text-black'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Agent & Safety</span>
            </button>

            <button
              onClick={() => setActiveTab('memory')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded font-medium transition-colors text-left ${
                activeTab === 'memory'
                  ? 'bg-black text-white'
                  : 'text-zinc-600 hover:bg-zinc-200 hover:text-black'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Memory</span>
            </button>

            <button
              onClick={() => setActiveTab('shortcuts')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded font-medium transition-colors text-left ${
                activeTab === 'shortcuts'
                  ? 'bg-black text-white'
                  : 'text-zinc-600 hover:bg-zinc-200 hover:text-black'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Shortcuts</span>
            </button>
          </div>

          {/* Settings Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto text-xs space-y-5 bg-white">
            {/* 1. PROVIDERS */}
            {activeTab === 'providers' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-black font-semibold mb-1">Primary AI Engine</label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full bg-white border border-zinc-300 rounded px-3 py-2 text-black focus:outline-none focus:border-black font-mono"
                  >
                    <option value="free-ai">Free Unlimited AI (No API Key Required)</option>
                    <option value="openrouter">OmniRoute / OpenRouter (300+ models)</option>
                    <option value="openai">OpenAI (ChatGPT / GPT-4o / o3-mini)</option>
                    <option value="ollama">Ollama (Local Offline)</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="anthropic">Anthropic Claude</option>
                    <option value="local-aura-engine">AURA Offline Engine</option>
                  </select>
                </div>

                {/* 1A. FREE AI SECTION */}
                <div className="p-3.5 rounded border border-black bg-zinc-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-black">Free Unlimited AI Gateway</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black text-white">Active</span>
                  </div>
                  {freeAiHealth && (
                    <div className="flex items-center gap-2 p-2 rounded bg-white border border-zinc-300 text-[11px] font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5 text-black shrink-0" />
                      <span>{freeAiHealth.statusMessage}</span>
                    </div>
                  )}
                  <p className="text-zinc-600 text-[11px] leading-relaxed">
                    Always enabled as a zero-setup fallback. Unlimited queries for Free GPT-4o, DeepSeek R1, Claude 3.5, and Qwen Coder without any API keys.
                  </p>
                </div>

                {/* 1B. OmniRoute / OpenRouter Section */}
                <div className="p-3.5 rounded border border-zinc-300 bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-black">OmniRoute / OpenRouter Setup</span>
                    <button
                      onClick={() => handleTest('openrouter')}
                      disabled={testingProvider === 'openrouter'}
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] bg-white border border-black text-black hover:bg-zinc-100 transition-colors"
                    >
                      <RefreshCw className={`w-3 h-3 ${testingProvider === 'openrouter' ? 'animate-spin' : ''}`} />
                      <span>Test Key</span>
                    </button>
                  </div>

                  {openrouterHealth && (
                    <div className="flex items-center gap-2 p-2 rounded bg-zinc-50 border border-zinc-300 text-[11px] font-mono">
                      {openrouterHealth.isAvailable ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-black shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-black shrink-0" />
                      )}
                      <span>{openrouterHealth.statusMessage}</span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-black font-semibold">OpenRouter API Key</label>
                      <a
                        href="https://openrouter.ai/keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-black underline flex items-center gap-1"
                      >
                        <span>Get Free OpenRouter Key</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <input
                      type="password"
                      value={openrouterKey}
                      onChange={(e) => setOpenrouterKey(e.target.value)}
                      placeholder="sk-or-v1-..."
                      className="w-full bg-white border border-zinc-300 rounded px-3 py-1.5 text-black font-mono focus:outline-none focus:border-black"
                    />
                  </div>
                </div>

                {/* 1C. OpenAI / ChatGPT Section */}
                <div className="p-3.5 rounded border border-zinc-300 bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-black">OpenAI / ChatGPT Setup</span>
                    <button
                      onClick={() => handleTest('openai')}
                      disabled={testingProvider === 'openai'}
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] bg-white border border-black text-black hover:bg-zinc-100 transition-colors"
                    >
                      <RefreshCw className={`w-3 h-3 ${testingProvider === 'openai' ? 'animate-spin' : ''}`} />
                      <span>Test Key</span>
                    </button>
                  </div>

                  {openaiHealth && (
                    <div className="flex items-center gap-2 p-2 rounded bg-zinc-50 border border-zinc-300 text-[11px] font-mono">
                      {openaiHealth.isAvailable ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-black shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-black shrink-0" />
                      )}
                      <span>{openaiHealth.statusMessage}</span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-black font-semibold">OpenAI API Key</label>
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-black underline flex items-center gap-1"
                      >
                        <span>Get OpenAI Key</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <input
                      type="password"
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full bg-white border border-zinc-300 rounded px-3 py-1.5 text-black font-mono focus:outline-none focus:border-black"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-600 text-[11px] mb-1">OpenAI Base URL</label>
                    <input
                      type="text"
                      value={openaiBaseUrl}
                      onChange={(e) => setOpenaiBaseUrl(e.target.value)}
                      placeholder="https://api.openai.com/v1"
                      className="w-full bg-white border border-zinc-300 rounded px-3 py-1.5 text-black font-mono focus:outline-none focus:border-black"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-600 text-[11px] mb-1">Default Model</label>
                    <input
                      type="text"
                      value={defaultModel}
                      onChange={(e) => setDefaultModel(e.target.value)}
                      placeholder="free-gpt-4o or gpt-4o"
                      className="w-full bg-white border border-zinc-300 rounded px-3 py-1.5 text-black font-mono focus:outline-none focus:border-black"
                    />
                  </div>
                </div>

                {/* 1D. Ollama & Other Providers */}
                <div className="p-3.5 rounded border border-zinc-300 bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-black">Ollama & Other APIs</span>
                    <button
                      onClick={() => handleTest('ollama')}
                      disabled={testingProvider === 'ollama'}
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] bg-zinc-100 border border-zinc-300 text-black hover:bg-zinc-200 transition-colors"
                    >
                      <RefreshCw className={`w-3 h-3 ${testingProvider === 'ollama' ? 'animate-spin' : ''}`} />
                      <span>Test Ollama</span>
                    </button>
                  </div>

                  {ollamaHealth && (
                    <div className="flex items-center gap-2 p-2 rounded bg-zinc-50 border border-zinc-300 text-[11px] font-mono">
                      {ollamaHealth.isAvailable ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-black shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-black shrink-0" />
                      )}
                      <span>{ollamaHealth.statusMessage}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-zinc-600 text-[11px] mb-1">Ollama Server URL</label>
                    <input
                      type="text"
                      value={ollamaUrl}
                      onChange={(e) => setOllamaUrl(e.target.value)}
                      className="w-full bg-white border border-zinc-300 rounded px-3 py-1.5 text-black font-mono focus:outline-none focus:border-black"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div>
                      <label className="block text-zinc-600 text-[11px] mb-1">Gemini API Key</label>
                      <input
                        type="password"
                        value={geminiKey}
                        onChange={(e) => setGeminiKey(e.target.value)}
                        placeholder="AIza..."
                        className="w-full bg-white border border-zinc-300 rounded px-3 py-1.5 text-black font-mono focus:outline-none focus:border-black"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-600 text-[11px] mb-1">Anthropic API Key</label>
                      <input
                        type="password"
                        value={anthropicKey}
                        onChange={(e) => setAnthropicKey(e.target.value)}
                        placeholder="sk-ant-..."
                        className="w-full bg-white border border-zinc-300 rounded px-3 py-1.5 text-black font-mono focus:outline-none focus:border-black"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. AGENT & SAFETY */}
            {activeTab === 'agent' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-black font-semibold mb-1">Default Execution Mode</label>
                  <select
                    value={agentMode}
                    onChange={(e) => setAgentMode(e.target.value as any)}
                    className="w-full bg-white border border-zinc-300 rounded px-3 py-2 text-black font-mono focus:outline-none focus:border-black"
                  >
                    <option value="ASSIST">ASSIST — Natural conversation & guidance</option>
                    <option value="PLAN">PLAN — Multi-step breakdown before execution</option>
                    <option value="EXECUTE">EXECUTE — Autonomous tool calling & verification</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-3 rounded border border-zinc-300 bg-zinc-50">
                  <div>
                    <div className="font-semibold text-black">Auto-Approve Safe Commands</div>
                    <div className="text-zinc-500 text-[11px]">Read-only git, npm test, and file scans run without prompt</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoApproveSafe}
                    onChange={(e) => setAutoApproveSafe(e.target.checked)}
                    className="w-4 h-4 accent-black rounded cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-black font-semibold mb-1">Max Autonomous Iterations</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={maxIterations}
                    onChange={(e) => setMaxIterations(Number(e.target.value))}
                    className="w-full bg-white border border-zinc-300 rounded px-3 py-1.5 text-black font-mono focus:outline-none focus:border-black"
                  />
                </div>
              </div>
            )}

            {/* 3. MEMORY */}
            {activeTab === 'memory' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded border border-zinc-300 bg-zinc-50">
                  <div>
                    <div className="font-semibold text-black">Persistent Context Memory</div>
                    <div className="text-zinc-500 text-[11px]">Store persistent architectural preferences across sessions</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={memoryEnabled}
                    onChange={(e) => setMemoryEnabled(e.target.checked)}
                    className="w-4 h-4 accent-black rounded cursor-pointer"
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={onClearMemory}
                    className="px-3 py-1.5 rounded border border-black bg-white hover:bg-black hover:text-white text-black font-medium transition-colors"
                  >
                    Clear All Stored Memories
                  </button>
                </div>
              </div>
            )}

            {/* 4. SHORTCUTS */}
            {activeTab === 'shortcuts' && (
              <div className="space-y-3">
                <h3 className="font-semibold text-black mb-2">Global Keyboard Shortcuts</h3>
                <div className="divide-y divide-zinc-200 border border-zinc-200 rounded">
                  {[
                    { key: 'Cmd + K', desc: 'Open Command Palette' },
                    { key: 'Cmd + Enter', desc: 'Send prompt immediately' },
                    { key: 'Cmd + N', desc: 'New conversation' },
                    { key: 'Cmd + B', desc: 'Toggle context panel' },
                    { key: '/run <cmd>', desc: 'Direct terminal command' },
                    { key: '/project', desc: 'Inspect project structure' }
                  ].map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5">
                      <span className="text-zinc-600">{s.desc}</span>
                      <kbd className="px-2 py-1 rounded bg-zinc-100 border border-zinc-300 font-mono text-[11px] text-black">
                        {s.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-200 bg-zinc-50">
          <div className="text-xs">
            {savedSuccess && (
              <span className="text-black font-medium flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-black" />
                Settings saved successfully!
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded text-zinc-600 hover:text-black transition-colors text-xs"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 rounded bg-black hover:bg-zinc-800 text-white font-medium text-xs transition-all cursor-pointer"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
