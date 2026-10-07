import React, { useState } from 'react';
import {
  FolderTree,
  ListTodo,
  FileDiff as DiffIcon,
  Terminal as TerminalIcon,
  Bookmark,
  Globe,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Copy,
  Trash2,
  ExternalLink,
  Plus,
  RefreshCw,
  FileText
} from 'lucide-react';
import { ProjectFile, Task, TaskStep, Memory, FileDiff } from '@aura/shared';
import { RightPanelTab, TerminalLog, WebSource } from '../types.js';
import { DiffViewer } from './DiffViewer.js';

interface RightPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: RightPanelTab;
  onTabChange: (tab: RightPanelTab) => void;
  projectFiles: ProjectFile[];
  activeTask?: Task;
  activeSteps?: TaskStep[];
  diffs: FileDiff[];
  terminalLogs: TerminalLog[];
  memories: Memory[];
  sources: WebSource[];
  onApplyDiff?: (id: string) => void;
  onRejectDiff?: (id: string) => void;
  onRevertDiff?: (id: string) => void;
  onAddMemory?: (category: string, content: string) => void;
  onDeleteMemory?: (id: string) => void;
  onSelectFile?: (file: ProjectFile) => void;
  onCancelTask?: (taskId: string) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  projectFiles,
  activeTask,
  activeSteps = [],
  diffs,
  terminalLogs,
  memories,
  sources,
  onApplyDiff,
  onRejectDiff,
  onRevertDiff,
  onAddMemory,
  onDeleteMemory,
  onSelectFile,
  onCancelTask
}) => {
  const [fileSearch, setFileSearch] = useState('');
  const [newMemContent, setNewMemContent] = useState('');
  const [newMemCategory, setNewMemCategory] = useState('PROJECT_CONTEXT');
  const [showAddMemModal, setShowAddMemModal] = useState(false);

  if (!isOpen) return null;

  const filteredFiles = projectFiles.filter((f) =>
    f.relativePath.toLowerCase().includes(fileSearch.toLowerCase())
  );

  return (
    <aside className="w-96 border-l border-zinc-200 bg-white text-black flex flex-col h-full z-20 shadow-xl">
      {/* Panel Header & Tabs */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 bg-white">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
          <button
            onClick={() => onTabChange('files')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              activeTab === 'files'
                ? 'bg-black text-white'
                : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
            }`}
            title="Project Files"
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Files</span>
          </button>

          <button
            onClick={() => onTabChange('plan')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              activeTab === 'plan'
                ? 'bg-black text-white'
                : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
            }`}
            title="Active Task Plan"
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>Plan</span>
            {activeSteps.length > 0 && (
              <span className="ml-0.5 px-1 py-0.2 text-[10px] rounded bg-zinc-200 text-black font-mono">
                {activeSteps.filter((s) => s.status === 'COMPLETED').length}/{activeSteps.length}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange('diffs')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              activeTab === 'diffs'
                ? 'bg-black text-white'
                : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
            }`}
            title="Changed Diffs"
          >
            <DiffIcon className="w-3.5 h-3.5" />
            <span>Diffs</span>
            {diffs.length > 0 && (
              <span className="ml-0.5 px-1 py-0.2 text-[10px] rounded bg-zinc-200 text-black font-mono">
                {diffs.length}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange('terminal')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              activeTab === 'terminal'
                ? 'bg-black text-white'
                : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
            }`}
            title="Terminal Output"
          >
            <TerminalIcon className="w-3.5 h-3.5" />
            <span>Terminal</span>
          </button>

          <button
            onClick={() => onTabChange('memory')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              activeTab === 'memory'
                ? 'bg-black text-white'
                : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
            }`}
            title="Persistent Memory"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Memory</span>
          </button>

          <button
            onClick={() => onTabChange('sources')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              activeTab === 'sources'
                ? 'bg-black text-white'
                : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
            }`}
            title="Web Research"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Web</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded text-zinc-500 hover:text-black hover:bg-zinc-100 transition-colors ml-1"
          title="Close Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 overflow-y-auto p-3 text-sm bg-white">
        {/* 1. FILES TAB */}
        {activeTab === 'files' && (
          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Filter files..."
                value={fileSearch}
                onChange={(e) => setFileSearch(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-300 rounded px-2.5 py-1.5 text-xs text-black placeholder-zinc-400 focus:outline-none focus:border-black"
              />
            </div>

            <div className="space-y-1">
              {filteredFiles.length === 0 ? (
                <div className="text-center py-8 text-zinc-400 text-xs">
                  {projectFiles.length === 0
                    ? 'No project opened. Open a project to explore files.'
                    : 'No matching files found.'}
                </div>
              ) : (
                filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => onSelectFile?.(file)}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-zinc-100 text-xs font-mono text-black cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-3.5 h-3.5 text-zinc-500 group-hover:text-black shrink-0" />
                      <span className="truncate">{file.relativePath}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-sans shrink-0 ml-2">
                      {file.lineCount > 0 ? `${file.lineCount} lines` : `${(file.size / 1024).toFixed(1)}k`}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 2. PLAN TAB */}
        {activeTab === 'plan' && (
          <div className="space-y-4">
            {activeTask ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xs font-semibold text-black">{activeTask.title}</h3>
                    <p className="text-[11px] text-zinc-600 mt-0.5">{activeTask.description}</p>
                  </div>
                  {activeTask.status === 'IN_PROGRESS' && onCancelTask && (
                    <button
                      onClick={() => onCancelTask(activeTask.id)}
                      className="px-2 py-0.5 rounded text-[11px] bg-white text-black border border-black hover:bg-zinc-100 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {activeSteps.map((step) => {
                    const isRunning = step.status === 'RUNNING';
                    const isDone = step.status === 'COMPLETED';
                    const isFailed = step.status === 'FAILED';

                    return (
                      <div
                        key={step.id}
                        className={`p-2.5 rounded border text-xs transition-all ${
                          isRunning
                            ? 'bg-zinc-100 border-black text-black'
                            : isDone
                            ? 'bg-white border-zinc-300 text-black'
                            : isFailed
                            ? 'bg-zinc-50 border-black text-black font-semibold'
                            : 'bg-white border-zinc-200 text-zinc-500'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5 shrink-0">
                            {isRunning ? (
                              <RefreshCw className="w-3.5 h-3.5 text-black animate-spin" />
                            ) : isDone ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                            ) : isFailed ? (
                              <AlertCircle className="w-3.5 h-3.5 text-black" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-zinc-400" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-black">
                                {step.stepNumber}. {step.title}
                              </span>
                              {step.toolName && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 text-black border border-zinc-300">
                                  {step.toolName}
                                </span>
                              )}
                            </div>
                            {step.description && (
                              <p className="text-[11px] text-zinc-600 mt-1">{step.description}</p>
                            )}
                            {step.error && (
                              <p className="text-[11px] text-black mt-1 font-mono bg-zinc-100 p-1.5 rounded border border-zinc-300">
                                {step.error}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-zinc-400 text-xs">
                No active task plan running. Send a prompt to trigger planning.
              </div>
            )}
          </div>
        )}

        {/* 3. DIFFS TAB */}
        {activeTab === 'diffs' && (
          <div className="space-y-3">
            {diffs.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 text-xs">
                No file diffs recorded yet.
              </div>
            ) : (
              diffs.map((diff) => (
                <DiffViewer
                  key={diff.id}
                  diff={diff}
                  onApply={onApplyDiff}
                  onReject={onRejectDiff}
                  onRevert={onRevertDiff}
                />
              ))
            )}
          </div>
        )}

        {/* 4. TERMINAL TAB */}
        {activeTab === 'terminal' && (
          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between text-zinc-600 pb-2 border-b border-zinc-200">
              <span className="text-[11px] font-semibold text-black">Execution Terminal</span>
              <button
                onClick={() => {
                  const fullText = terminalLogs.map((l) => `$ ${l.command}\n${l.output}`).join('\n\n');
                  navigator.clipboard.writeText(fullText);
                }}
                className="flex items-center gap-1 text-[11px] text-black hover:underline"
              >
                <Copy className="w-3 h-3" />
                <span>Copy Log</span>
              </button>
            </div>

            {terminalLogs.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 text-xs font-sans">
                No terminal commands executed yet.
              </div>
            ) : (
              <div className="space-y-3 bg-zinc-50 p-3 rounded border border-zinc-300 max-h-[500px] overflow-y-auto">
                {terminalLogs.map((log) => (
                  <div key={log.id} className="space-y-1">
                    <div className="flex items-center gap-1.5 text-black font-semibold text-[11px]">
                      <span className="text-zinc-400">$</span>
                      <span>{log.command}</span>
                    </div>
                    <pre className="text-black whitespace-pre-wrap leading-relaxed text-[11px] pl-3 border-l border-zinc-300">
                      {log.output}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. MEMORY TAB */}
        {activeTab === 'memory' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
              <span className="text-xs font-semibold text-black">Stored Knowledge</span>
              <button
                onClick={() => setShowAddMemModal(true)}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-black text-white hover:bg-zinc-800 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Add Rule</span>
              </button>
            </div>

            {showAddMemModal && (
              <div className="p-3 bg-zinc-50 rounded border border-zinc-300 space-y-2.5">
                <select
                  value={newMemCategory}
                  onChange={(e) => setNewMemCategory(e.target.value)}
                  className="w-full bg-white border border-zinc-300 rounded px-2 py-1 text-xs text-black"
                >
                  <option value="PROJECT_CONTEXT">PROJECT_CONTEXT</option>
                  <option value="USER_PREFERENCE">USER_PREFERENCE</option>
                  <option value="IMPORTANT_DECISION">IMPORTANT_DECISION</option>
                  <option value="WORKFLOW">WORKFLOW</option>
                  <option value="FACT">FACT</option>
                </select>
                <textarea
                  placeholder="e.g. Leave calculation logic must not be modified..."
                  value={newMemContent}
                  onChange={(e) => setNewMemContent(e.target.value)}
                  rows={2}
                  className="w-full bg-white border border-zinc-300 rounded p-2 text-xs text-black placeholder-zinc-400 focus:outline-none focus:border-black"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowAddMemModal(false)}
                    className="px-2 py-1 text-xs text-zinc-600 hover:text-black"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (newMemContent.trim() && onAddMemory) {
                        onAddMemory(newMemCategory, newMemContent);
                        setNewMemContent('');
                        setShowAddMemModal(false);
                      }
                    }}
                    className="px-2.5 py-1 text-xs bg-black hover:bg-zinc-800 text-white rounded font-medium transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {memories.length === 0 ? (
                <div className="text-center py-10 text-zinc-400 text-xs">
                  No memories stored yet. AURA saves key rules automatically.
                </div>
              ) : (
                memories.map((m) => (
                  <div
                    key={m.id}
                    className="p-2.5 rounded border border-zinc-200 bg-white text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono uppercase tracking-wider bg-zinc-100 text-black border border-zinc-300">
                        {m.category}
                      </span>
                      {onDeleteMemory && (
                        <button
                          onClick={() => onDeleteMemory(m.id)}
                          className="text-zinc-400 hover:text-black transition-colors"
                          title="Delete memory"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-black leading-relaxed">{m.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 6. SOURCES TAB */}
        {activeTab === 'sources' && (
          <div className="space-y-3">
            <span className="text-xs font-semibold text-black block pb-2 border-b border-zinc-200">
              Web Research Sources
            </span>

            {sources.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 text-xs">
                No web searches executed. Ask AURA to research documentation online.
              </div>
            ) : (
              sources.map((src, i) => (
                <div
                  key={i}
                  className="p-3 rounded border border-zinc-200 bg-white text-xs space-y-1.5"
                >
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-black hover:underline flex items-center gap-1 leading-snug"
                  >
                    <span>{src.title}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                  <p className="text-zinc-600 text-[11px] leading-relaxed">{src.snippet}</p>
                  <div className="text-[10px] text-zinc-400 font-mono">{src.source}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
