import React, { useState } from 'react';
import {
  X,
  Key,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { UserSettings, ProviderHealth } from '@aura/shared';

interface QuickConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (params: { apiKey: string; baseUrl?: string; defaultModel?: string; providerId?: string }) => Promise<void>;
  settings?: UserSettings | null;
  providerHealth?: ProviderHealth[];
}

export const QuickConnectModal: React.FC<QuickConnectModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  providerHealth = []
}) => {
  const [providerType, setProviderType] = useState<'free' | 'omniroute' | 'openai'>('free');
  const [apiKey, setApiKey] = useState('');
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [selectedModel, setSelectedModel] = useState('free-gpt-4o');
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentActiveHealth = providerHealth.find(
    (p) => p.provider === (providerType === 'omniroute' ? 'openrouter' : providerType === 'openai' ? 'openai' : 'free-ai')
  );

  const handleProviderSelect = (type: 'free' | 'omniroute' | 'openai') => {
    setProviderType(type);
    setErrorMessage(null);
    setSuccessMessage(null);
    if (type === 'free') {
      setSelectedModel('free-gpt-4o');
    } else if (type === 'omniroute') {
      setSelectedModel('deepseek/deepseek-r1:free');
      setCustomBaseUrl('https://openrouter.ai/api/v1');
    } else {
      setSelectedModel('gpt-4o');
      setCustomBaseUrl('https://api.openai.com/v1');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (providerType !== 'free' && !apiKey.trim()) {
      setErrorMessage(`Please enter your ${providerType === 'omniroute' ? 'OpenRouter / OmniRoute' : 'OpenAI'} API key.`);
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsConnecting(true);

    try {
      if (providerType === 'free') {
        await onConnect({
          apiKey: '',
          defaultModel: selectedModel,
          providerId: 'free-ai'
        });
        setSuccessMessage('Free Unlimited AI activated successfully (0 keys needed).');
      } else if (providerType === 'omniroute') {
        await onConnect({
          apiKey: apiKey.trim(),
          baseUrl: 'https://openrouter.ai/api/v1',
          defaultModel: selectedModel,
          providerId: 'openrouter'
        });
        setSuccessMessage('Connected to OmniRoute / OpenRouter.');
      } else {
        await onConnect({
          apiKey: apiKey.trim(),
          baseUrl: customBaseUrl.trim() || 'https://api.openai.com/v1',
          defaultModel: selectedModel,
          providerId: 'openai'
        });
        setSuccessMessage('Connected to ChatGPT / OpenAI.');
      }

      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to connect. Please check credentials.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white text-black border border-black rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-white">
          <div>
            <h2 className="text-sm font-bold text-black flex items-center gap-2">
              <span>AI Engine & Model Gateway</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Choose Free Unlimited AI (zero setup) or connect OmniRoute / OpenAI
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-black hover:bg-zinc-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Provider Selection Tabs */}
        <div className="grid grid-cols-3 border-b border-zinc-200 bg-zinc-50 p-1 text-xs">
          <button
            type="button"
            onClick={() => handleProviderSelect('free')}
            className={`py-2 px-3 rounded font-medium transition-all text-center ${
              providerType === 'free'
                ? 'bg-black text-white shadow-sm'
                : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
            }`}
          >
            <div className="font-semibold">Free Unlimited AI</div>
            <div className={`text-[10px] ${providerType === 'free' ? 'text-zinc-300' : 'text-zinc-500'}`}>
              0 keys required
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleProviderSelect('omniroute')}
            className={`py-2 px-3 rounded font-medium transition-all text-center ${
              providerType === 'omniroute'
                ? 'bg-black text-white shadow-sm'
                : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
            }`}
          >
            <div className="font-semibold">OmniRoute</div>
            <div className={`text-[10px] ${providerType === 'omniroute' ? 'text-zinc-300' : 'text-zinc-500'}`}>
              DeepSeek R1 / Llama
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleProviderSelect('openai')}
            className={`py-2 px-3 rounded font-medium transition-all text-center ${
              providerType === 'openai'
                ? 'bg-black text-white shadow-sm'
                : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
            }`}
          >
            <div className="font-semibold">ChatGPT / OpenAI</div>
            <div className={`text-[10px] ${providerType === 'openai' ? 'text-zinc-300' : 'text-zinc-500'}`}>
              GPT-4o / o3-mini
            </div>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs bg-white">
          {currentActiveHealth && currentActiveHealth.isAvailable && (
            <div className="p-2.5 rounded bg-zinc-50 border border-black flex items-center gap-2 text-[11px] font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-black shrink-0" />
              <span>{currentActiveHealth.statusMessage}</span>
            </div>
          )}

          {/* FREE AI MODE */}
          {providerType === 'free' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded border border-black bg-zinc-50 text-black space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-black" />
                  <span>Free Unlimited AI Gateway is Active</span>
                </div>
                <p className="text-zinc-600 text-[11px] leading-relaxed">
                  No API key, credit card, or account needed. AURA routes your requests through high-speed free AI gateways with intelligent multi-model synthesis.
                </p>
              </div>

              <div>
                <label className="block text-black font-semibold mb-1.5">Choose Free AI Model</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'free-gpt-4o', title: 'Free GPT-4o', desc: 'Unlimited conversational reasoning' },
                    { id: 'free-deepseek-r1', title: 'Free DeepSeek R1', desc: 'Advanced step-by-step reasoning' },
                    { id: 'free-claude-3.5', title: 'Free Claude 3.5', desc: 'Architecture & technical writing' },
                    { id: 'free-qwen-coder', title: 'Free Qwen Coder', desc: 'Coding & full-stack development' }
                  ].map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setSelectedModel(m.id)}
                      className={`p-2.5 rounded border cursor-pointer transition-all ${
                        selectedModel === m.id
                          ? 'border-black bg-zinc-100 font-semibold'
                          : 'border-zinc-300 bg-white text-zinc-600 hover:border-black hover:text-black'
                      }`}
                    >
                      <div className="text-black font-semibold">{m.title}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{m.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* OMNIROUTE / OPENROUTER MODE */}
          {providerType === 'omniroute' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-black font-semibold flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-black" />
                  <span>OpenRouter / OmniRoute API Key</span>
                </label>
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
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder="sk-or-v1-..."
                autoFocus
                className="w-full bg-white border border-zinc-300 rounded px-3.5 py-2.5 text-black font-mono text-xs focus:outline-none focus:border-black"
              />

              <div>
                <label className="block text-black font-semibold mb-1.5">Select Model</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'deepseek/deepseek-r1:free', title: 'DeepSeek R1 (Free)', desc: 'Elite reasoning model (zero cost)' },
                    { id: 'meta-llama/llama-3.3-70b-instruct:free', title: 'Llama 3.3 70B (Free)', desc: 'Meta open weights flagship' },
                    { id: 'google/gemini-2.0-flash-lite-preview-02-05:free', title: 'Gemini 2.0 Flash (Free)', desc: '1M context window' },
                    { id: 'qwen/qwen-2.5-coder-32b-instruct:free', title: 'Qwen 2.5 Coder (Free)', desc: 'Top coding benchmark' }
                  ].map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setSelectedModel(m.id)}
                      className={`p-2.5 rounded border cursor-pointer transition-all ${
                        selectedModel === m.id
                          ? 'border-black bg-zinc-100 font-semibold'
                          : 'border-zinc-300 bg-white text-zinc-600 hover:border-black hover:text-black'
                      }`}
                    >
                      <div className="text-black font-semibold">{m.title}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{m.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* OPENAI / CHATGPT MODE */}
          {providerType === 'openai' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-black font-semibold flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-black" />
                  <span>OpenAI API Key</span>
                </label>
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
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder="sk-..."
                autoFocus
                className="w-full bg-white border border-zinc-300 rounded px-3.5 py-2.5 text-black font-mono text-xs focus:outline-none focus:border-black"
              />

              <div>
                <label className="block text-black font-semibold mb-1.5">Select Model</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'gpt-4o', title: 'GPT-4o (Flagship)', desc: 'Top multimodal intelligence' },
                    { id: 'gpt-4o-mini', title: 'GPT-4o Mini', desc: 'Fast & cost-effective' },
                    { id: 'o3-mini', title: 'o3-mini (Reasoning)', desc: 'Complex reasoning & code' },
                    { id: 'o1', title: 'o1 (Full Reasoning)', desc: 'Deep deliberative thinking' }
                  ].map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setSelectedModel(m.id)}
                      className={`p-2.5 rounded border cursor-pointer transition-all ${
                        selectedModel === m.id
                          ? 'border-black bg-zinc-100 font-semibold'
                          : 'border-zinc-300 bg-white text-zinc-600 hover:border-black hover:text-black'
                      }`}
                    >
                      <div className="text-black font-semibold">{m.title}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{m.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {errorMessage && (
            <div className="p-3 rounded border border-black bg-zinc-50 text-black flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-black" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded border border-black bg-zinc-100 text-black flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-black" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Privacy Note */}
          <p className="text-[11px] text-zinc-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
            <span>Keys and prompts stay securely on your Mac.</span>
          </p>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded text-zinc-600 hover:text-black transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isConnecting}
              className="flex items-center gap-1.5 px-4 py-2 rounded bg-black hover:bg-zinc-800 disabled:opacity-40 text-white font-medium text-xs transition-all cursor-pointer"
            >
              {isConnecting ? (
                <span>Connecting...</span>
              ) : providerType === 'free' ? (
                <span>Activate Free AI</span>
              ) : (
                <span>Save & Connect</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
