import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Square,
  ChevronDown,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  FolderTree,
  Terminal,
  FileDiff as DiffIcon,
  Key,
  ExternalLink
} from 'lucide-react';
import { Message, Conversation, ModelInfo, AgentMode, Project, ProviderHealth } from '@aura/shared';
import { StreamingState, RightPanelTab } from '../types.js';
import { CodeBlock } from './CodeBlock.js';
import { DiffViewer } from './DiffViewer.js';

interface ChatAreaProps {
  conversation: Conversation | null;
  messages: Message[];
  streamingState: StreamingState;
  models: ModelInfo[];
  providerHealth?: ProviderHealth[];
  selectedModel: string;
  onModelChange: (model: string) => void;
  agentMode: AgentMode;
  onModeChange: (mode: AgentMode) => void;
  activeProject: Project | null;
  rightPanelTab: RightPanelTab;
  isRightPanelOpen: boolean;
  onToggleRightPanel: (tab?: RightPanelTab) => void;
  onSendMessage: (text: string) => void;
  onStopStreaming: () => void;
  onOpenQuickConnect?: () => void;
  onApplyDiff?: (id: string) => void;
  onApplyCodeBlock?: (filePath: string, code: string) => void;
}

const SLASH_COMMANDS = [
  { command: '/project', desc: 'Inspect current project architecture and stack' },
  { command: '/files', desc: 'Search or view files in codebase' },
  { command: '/search', desc: 'Search text across codebase using ripgrep' },
  { command: '/run', desc: 'Run a terminal command (e.g. /run npm run build)' },
  { command: '/test', desc: 'Run automated test suite and report results' },
  { command: '/memory', desc: 'Inspect or save persistent context rules' },
  { command: '/research', desc: 'Perform web research' }
];

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversation,
  messages,
  streamingState,
  models,
  providerHealth = [],
  selectedModel,
  onModelChange,
  agentMode,
  onModeChange,
  activeProject,
  rightPanelTab,
  isRightPanelOpen,
  onToggleRightPanel,
  onSendMessage,
  onStopStreaming,
  onOpenQuickConnect,
  onApplyDiff,
  onApplyCodeBlock
}) => {
  const [inputText, setInputText] = useState('');
  const [quickKeyInput, setQuickKeyInput] = useState('');
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const openaiHealth = providerHealth.find((p) => p.provider === 'openai');
  const ollamaHealth = providerHealth.find((p) => p.provider === 'ollama');
  const isChatGPTConnected = Boolean(openaiHealth?.isAvailable);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingState.streamedText, streamingState.toolCalls]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    if (val.startsWith('/')) {
      setShowSlashMenu(true);
    } else {
      setShowSlashMenu(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlashMenu) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSlashIndex((prev) => (prev + 1) % SLASH_COMMANDS.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSlashIndex((prev) => (prev - 1 + SLASH_COMMANDS.length) % SLASH_COMMANDS.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        setInputText(SLASH_COMMANDS[selectedSlashIndex].command + ' ');
        setShowSlashMenu(false);
        return;
      }
    }

    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!inputText.trim() || streamingState.isStreaming) return;
    onSendMessage(inputText.trim());
    setInputText('');
    setShowSlashMenu(false);
  };

  const toggleToolExpand = (id: string) => {
    setExpandedTools((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Group models by provider
  const freeModels = models.filter((m) => m.provider === 'free-ai');
  const openrouterModels = models.filter((m) => m.provider === 'openrouter');
  const openaiModels = models.filter((m) => m.provider === 'openai');
  const ollamaModels = models.filter((m) => m.provider === 'ollama');
  const geminiModels = models.filter((m) => m.provider === 'gemini');
  const anthropicModels = models.filter((m) => m.provider === 'anthropic');
  const localModels = models.filter((m) => m.provider === 'local-aura-engine');

  const openrouterHealth = providerHealth.find((p) => p.provider === 'openrouter');

  return (
    <div className="flex-1 flex flex-col h-full bg-white text-black relative">
      {/* Top Header Bar */}
      <header className="h-12 border-b border-zinc-200 bg-white px-4 flex items-center justify-between z-10 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold text-black truncate max-w-xs">
              {conversation?.title || 'Universal Workspace'}
            </h2>
            {activeProject && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 text-black border border-zinc-300">
                {activeProject.name}
              </span>
            )}
          </div>

          {/* AI Connection Status Badge */}
          {isChatGPTConnected ? (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-black text-white text-[10px] font-medium font-mono">
              <span>ChatGPT Active</span>
            </div>
          ) : openrouterHealth?.isAvailable && (openrouterHealth.latencyMs !== undefined) ? (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-black text-white text-[10px] font-medium font-mono">
              <span>OmniRoute Active</span>
            </div>
          ) : ollamaHealth?.isAvailable ? (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-zinc-100 text-black border border-zinc-300 text-[10px] font-medium font-mono">
              <span>Ollama Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-zinc-100 text-black border border-zinc-300 text-[10px] font-medium font-mono">
              <span>Free AI Active</span>
            </div>
          )}

          <button
            onClick={onOpenQuickConnect}
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-zinc-300 bg-white hover:border-black text-black text-[10px] font-medium font-mono transition-colors cursor-pointer"
          >
            <span>Model Gateway</span>
          </button>
        </div>

        {/* Center/Right Controls: Model Selector & Panel Toggles */}
        <div className="flex items-center gap-2.5">
          {/* Grouped Model Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              className="appearance-none bg-white border border-zinc-300 hover:border-black text-black text-xs rounded pl-2.5 pr-7 py-1 focus:outline-none focus:border-black cursor-pointer font-mono"
            >
              <optgroup label="Free Unlimited AI (0 Setup)">
                {freeModels.length > 0 ? (
                  freeModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="free-gpt-4o">Free GPT-4o (Unlimited)</option>
                    <option value="free-deepseek-r1">Free DeepSeek R1 (Reasoning)</option>
                    <option value="free-claude-3.5">Free Claude 3.5 Sonnet</option>
                    <option value="free-qwen-coder">Free Qwen 2.5 Coder</option>
                  </>
                )}
              </optgroup>

              <optgroup label="OmniRoute / OpenRouter">
                {openrouterModels.length > 0 ? (
                  openrouterModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="deepseek/deepseek-r1:free">DeepSeek R1 (Free)</option>
                    <option value="meta-llama/llama-3.3-70b-instruct:free">Llama 3.3 70B (Free)</option>
                    <option value="google/gemini-2.0-flash-lite-preview-02-05:free">Gemini 2.0 Flash Lite (Free)</option>
                    <option value="qwen/qwen-2.5-coder-32b-instruct:free">Qwen 2.5 Coder 32B (Free)</option>
                    <option value="openrouter/auto">OmniRoute Auto Router</option>
                  </>
                )}
              </optgroup>

              <optgroup label="ChatGPT / OpenAI">
                {openaiModels.length > 0 ? (
                  openaiModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="gpt-4o">GPT-4o (ChatGPT Flagship)</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="o3-mini">o3-mini (Reasoning)</option>
                    <option value="o1">o1 (Full Reasoning)</option>
                  </>
                )}
              </optgroup>

              {ollamaModels.length > 0 && (
                <optgroup label="Local Ollama Models">
                  {ollamaModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </optgroup>
              )}

              {geminiModels.length > 0 && (
                <optgroup label="Google Gemini">
                  {geminiModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </optgroup>
              )}

              {anthropicModels.length > 0 && (
                <optgroup label="Anthropic Claude">
                  {anthropicModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </optgroup>
              )}

              {localModels.length > 0 && (
                <optgroup label="Offline Engine">
                  {localModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <ChevronDown className="w-3 h-3 text-zinc-500 absolute right-2 top-2 pointer-events-none" />
          </div>

          {/* Mode Pill Toggle */}
          <div className="flex items-center bg-zinc-100 border border-zinc-300 rounded p-0.5 text-xs font-mono">
            {(['ASK', 'ASSIST', 'AUTONOMOUS'] as AgentMode[]).map((m) => (
              <button
                key={m}
                onClick={() => onModeChange(m)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  agentMode === m
                    ? 'bg-black text-white shadow-sm'
                    : 'text-zinc-600 hover:text-black'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-zinc-200" />

          {/* Quick Right Panel Switchers */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onToggleRightPanel('files')}
              className={`p-1.5 rounded transition-colors ${
                isRightPanelOpen && rightPanelTab === 'files'
                  ? 'bg-black text-white'
                  : 'text-zinc-500 hover:text-black hover:bg-zinc-100'
              }`}
              title="Toggle Project Files"
            >
              <FolderTree className="w-4 h-4" />
            </button>

            <button
              onClick={() => onToggleRightPanel('plan')}
              className={`p-1.5 rounded transition-colors ${
                isRightPanelOpen && rightPanelTab === 'plan'
                  ? 'bg-black text-white'
                  : 'text-zinc-500 hover:text-black hover:bg-zinc-100'
              }`}
              title="Toggle Task Plan"
            >
              <Layers className="w-4 h-4" />
            </button>

            <button
              onClick={() => onToggleRightPanel('diffs')}
              className={`p-1.5 rounded transition-colors ${
                isRightPanelOpen && rightPanelTab === 'diffs'
                  ? 'bg-black text-white'
                  : 'text-zinc-500 hover:text-black hover:bg-zinc-100'
              }`}
              title="Toggle Diffs"
            >
              <DiffIcon className="w-4 h-4" />
            </button>

            <button
              onClick={() => onToggleRightPanel('terminal')}
              className={`p-1.5 rounded transition-colors ${
                isRightPanelOpen && rightPanelTab === 'terminal'
                  ? 'bg-black text-white'
                  : 'text-zinc-500 hover:text-black hover:bg-zinc-100'
              }`}
              title="Toggle Terminal"
            >
              <Terminal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 md:px-8 space-y-6">
        {messages.length === 0 && !streamingState.isStreaming && (
          <div className="max-w-2xl mx-auto mt-10 text-center space-y-4">
            <div className="w-12 h-12 rounded bg-black text-white flex items-center justify-center mx-auto font-bold text-lg">
              A
            </div>
            <h1 className="text-xl font-bold text-black tracking-tight">
              AURA Assistant
            </h1>
            <p className="text-xs text-zinc-600 max-w-md mx-auto leading-relaxed">
              Autonomous reasoning, codebase navigation, patch generation, terminal execution, and persistent memory.
            </p>

            {/* Quick Connect ChatGPT Card if not connected */}
            {!isChatGPTConnected && (
              <div className="p-4 max-w-lg mx-auto rounded-xl border border-black bg-zinc-50 text-left space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-black font-semibold text-xs font-mono">
                    Connect ChatGPT / OpenAI
                  </div>
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-black underline flex items-center gap-1"
                  >
                    <span>Get API Key</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  Enter your OpenAI API key (<code className="font-mono bg-zinc-200 px-1 py-0.5 rounded">sk-...</code>) or OpenRouter key to activate ChatGPT.
                </p>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="password"
                      value={quickKeyInput}
                      onChange={(e) => setQuickKeyInput(e.target.value)}
                      placeholder="Paste sk-... or OpenRouter key here"
                      className="w-full bg-white border border-zinc-300 rounded pl-8 pr-3 py-2 text-black font-mono text-xs focus:outline-none focus:border-black"
                    />
                    <Key className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
                  </div>
                  <button
                    onClick={() => {
                      if (onOpenQuickConnect) onOpenQuickConnect();
                    }}
                    className="px-3.5 py-2 rounded bg-black hover:bg-zinc-800 text-white font-medium text-xs transition-all shrink-0"
                  >
                    Connect
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 max-w-lg mx-auto pt-2 text-left">
              {[
                { title: 'Inspect Codebase', cmd: 'Explain how authentication works in this project' },
                { title: 'Run Test Suite', cmd: 'Run tests and fix any failing test cases' },
                { title: 'Implement Feature', cmd: 'Build a secure JWT token verification middleware' },
                { title: 'Research Documentation', cmd: '/research latest React 19 patterns' }
              ].map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => setInputText(item.cmd)}
                  className="p-3 rounded border border-zinc-200 bg-white hover:border-black hover:bg-zinc-50 cursor-pointer transition-all text-xs"
                >
                  <span className="font-semibold text-black block">{item.title}</span>
                  <span className="text-[11px] text-zinc-500 block truncate mt-1">{item.cmd}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Existing Messages */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-zinc-500">
              <span className="font-semibold text-black">{msg.role === 'user' ? 'You' : 'AURA'}</span>
              <span>•</span>
              <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            <div
              className={`rounded-xl px-4 py-3 text-xs leading-relaxed max-w-3xl ${
                msg.role === 'user'
                  ? 'bg-zinc-100 text-black border border-zinc-300 rounded-tr-sm'
                  : 'bg-white text-black border border-zinc-200 rounded-tl-sm w-full'
              }`}
            >
              {renderFormattedContent(msg.content, onApplyCodeBlock)}
            </div>
          </div>
        ))}

        {/* Live Streaming Assistant Response */}
        {streamingState.isStreaming && (
          <div className="flex flex-col items-start w-full">
            <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-zinc-500">
              <span className="font-bold text-black">AURA</span>
              <span>•</span>
              <span className="text-zinc-600 font-mono">{streamingState.stage || 'Processing...'}</span>
            </div>

            <div className="w-full bg-white border border-zinc-300 rounded-xl rounded-tl-sm p-4 text-xs space-y-3">
              {/* Tool Execution Bubbles */}
              {streamingState.toolCalls.map((tc) => {
                const isExpanded = expandedTools[tc.id];
                return (
                  <div
                    key={tc.id}
                    className="border border-zinc-300 bg-zinc-50 rounded overflow-hidden text-xs"
                  >
                    <div
                      onClick={() => toggleToolExpand(tc.id)}
                      className="px-3 py-1.5 flex items-center justify-between cursor-pointer hover:bg-zinc-100 transition-colors"
                    >
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <Wrench className="w-3.5 h-3.5 text-black" />
                        <span className="text-black font-semibold">{tc.name}</span>
                        {Boolean(tc.input?.filePath) && (
                          <span className="text-zinc-600">{String(tc.input?.filePath)}</span>
                        )}
                        {Boolean(tc.input?.command) && (
                          <span className="text-black font-semibold">{String(tc.input?.command)}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {tc.status === 'pending' ? (
                          <span className="text-black flex items-center gap-1 text-[10px] font-mono">
                            <Clock className="w-3 h-3 animate-spin" /> Running
                          </span>
                        ) : tc.status === 'success' ? (
                          <span className="text-black flex items-center gap-1 text-[10px] font-mono">
                            <CheckCircle2 className="w-3 h-3" /> {tc.durationMs}ms
                          </span>
                        ) : (
                          <span className="text-black font-bold flex items-center gap-1 text-[10px] font-mono">
                            <AlertCircle className="w-3 h-3" /> Failed
                          </span>
                        )}
                      </div>
                    </div>

                    {Boolean(isExpanded && tc.output) && (
                      <div className="p-2.5 bg-white border-t border-zinc-300 text-[11px] font-mono text-zinc-800 max-h-48 overflow-y-auto">
                        <pre className="whitespace-pre-wrap">{JSON.stringify(tc.output, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Live Streaming Content */}
              {streamingState.streamedText && (
                <div className="leading-relaxed text-black">
                  {renderFormattedContent(streamingState.streamedText, onApplyCodeBlock)}
                </div>
              )}

              {/* Diffs Created During Stream */}
              {streamingState.activeDiffs && streamingState.activeDiffs.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-zinc-200">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Changed Files ({streamingState.activeDiffs.length})
                  </span>
                  {streamingState.activeDiffs.map((d) => (
                    <DiffViewer key={d.id} diff={d} onApply={onApplyDiff} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Slash Commands Dropdown Menu */}
      {showSlashMenu && (
        <div className="absolute bottom-20 left-4 md:left-8 right-4 md:right-8 bg-white border border-black rounded shadow-2xl p-1.5 z-30 max-w-md">
          <div className="px-2 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
            Commands
          </div>
          <div className="space-y-0.5">
            {SLASH_COMMANDS.map((item, index) => (
              <div
                key={item.command}
                onClick={() => {
                  setInputText(item.command + ' ');
                  setShowSlashMenu(false);
                  textareaRef.current?.focus();
                }}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs cursor-pointer ${
                  selectedSlashIndex === index
                    ? 'bg-black text-white font-medium'
                    : 'text-black hover:bg-zinc-100'
                }`}
              >
                <span className="font-mono font-semibold">{item.command}</span>
                <span className={`text-[11px] truncate ml-2 ${selectedSlashIndex === index ? 'text-zinc-200' : 'text-zinc-500'}`}>
                  {item.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat Input Bar */}
      <div className="p-3 md:px-8 border-t border-zinc-200 bg-white">
        <div className="max-w-4xl mx-auto rounded-xl border border-zinc-300 bg-white focus-within:border-black transition-all p-2">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask AURA anything, or type '/' for commands (/project, /test, /search)..."
            rows={2}
            className="w-full bg-white text-xs text-black placeholder-zinc-400 focus:outline-none resize-none leading-relaxed"
          />

          <div className="flex items-center justify-between pt-1 border-t border-zinc-200 mt-1">
            <div className="flex items-center gap-2 text-zinc-500 text-[11px]">
              <span className="font-mono">⌘ + Enter to send</span>
              <span>•</span>
              <span className="font-mono uppercase text-[10px] text-black font-semibold">{selectedModel}</span>
              <span>•</span>
              <span className="font-mono uppercase text-[10px] text-black font-semibold">{agentMode}</span>
            </div>

            <div className="flex items-center gap-2">
              {streamingState.isStreaming ? (
                <button
                  onClick={onStopStreaming}
                  className="flex items-center gap-1.5 px-3 py-1 rounded bg-white border border-black text-black hover:bg-zinc-100 text-xs font-medium transition-colors"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim()}
                  className="flex items-center gap-1.5 px-3 py-1 rounded bg-black hover:bg-zinc-800 disabled:opacity-30 text-white text-xs font-medium transition-all"
                >
                  <Send className="w-3 h-3" />
                  <span>Send</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Markdown & Code Block Parser Helper
function renderFormattedContent(
  text: string,
  onApply?: (filePath: string, code: string) => void
): React.ReactNode {
  if (!text) return null;

  // Split by code blocks ```lang ... ```
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)(?::([^\n]+))?\n([\s\S]*?)```/g;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const textBefore = text.substring(lastIndex, match.index);
    if (textBefore) {
      elements.push(<span key={`txt_${lastIndex}`} className="whitespace-pre-wrap">{textBefore}</span>);
    }

    const language = match[1] || 'typescript';
    const filePath = match[2]?.trim();
    const code = match[3];

    elements.push(
      <CodeBlock
        key={`code_${match.index}`}
        language={language}
        code={code}
        filePath={filePath}
        onApply={onApply}
      />
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    elements.push(
      <span key={`txt_${lastIndex}`} className="whitespace-pre-wrap">
        {text.substring(lastIndex)}
      </span>
    );
  }

  return <div>{elements}</div>;
}
