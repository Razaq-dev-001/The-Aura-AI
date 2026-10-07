import React from 'react';
import { X, Activity, Server, Database, Wrench, CheckCircle2, AlertCircle } from 'lucide-react';

interface DiagnosticsViewProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
}

export const DiagnosticsView: React.FC<DiagnosticsViewProps> = ({
  isOpen,
  onClose,
  data
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-white text-black border border-black rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-white">
          <div className="flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-black" />
            <div>
              <h2 className="text-sm font-bold text-black">AURA Diagnostics & Observability</h2>
              <p className="text-xs text-zinc-500">Local system, database, and tool metrics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-black hover:bg-zinc-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs bg-white">
          {/* System & Hardware */}
          <div>
            <div className="flex items-center gap-2 font-semibold text-black mb-2.5">
              <Server className="w-3.5 h-3.5 text-black" />
              <span>Host Machine & Runtime</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-zinc-50 border border-zinc-300 rounded">
                <span className="text-[11px] text-zinc-500 block">Platform</span>
                <span className="font-mono text-black font-semibold text-xs mt-1 block">
                  {data?.system?.platform || 'darwin'} ({data?.system?.arch || 'arm64'})
                </span>
              </div>
              <div className="p-3 bg-zinc-50 border border-zinc-300 rounded">
                <span className="text-[11px] text-zinc-500 block">Node.js</span>
                <span className="font-mono text-black font-semibold text-xs mt-1 block">
                  {data?.system?.nodeVersion || 'v26.7.0'}
                </span>
              </div>
              <div className="p-3 bg-zinc-50 border border-zinc-300 rounded">
                <span className="text-[11px] text-zinc-500 block">Process RAM</span>
                <span className="font-mono text-black font-semibold text-xs mt-1 block">
                  {data?.system?.processMemoryMb || 45} MB
                </span>
              </div>
              <div className="p-3 bg-zinc-50 border border-zinc-300 rounded">
                <span className="text-[11px] text-zinc-500 block">System RAM</span>
                <span className="font-mono text-black font-semibold text-xs mt-1 block">
                  {data?.system?.freeMemoryMb || 8192} / {data?.system?.totalMemoryMb || 16384} MB
                </span>
              </div>
            </div>
          </div>

          {/* Database Entities */}
          <div>
            <div className="flex items-center gap-2 font-semibold text-black mb-2.5">
              <Database className="w-3.5 h-3.5 text-black" />
              <span>Local SQLite Store</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-zinc-50 border border-zinc-300 rounded">
                <span className="text-[11px] text-zinc-500 block">Projects</span>
                <span className="font-mono text-black font-semibold text-xs mt-1 block">
                  {data?.database?.projectsCount ?? 0}
                </span>
              </div>
              <div className="p-3 bg-zinc-50 border border-zinc-300 rounded">
                <span className="text-[11px] text-zinc-500 block">Conversations</span>
                <span className="font-mono text-black font-semibold text-xs mt-1 block">
                  {data?.database?.conversationsCount ?? 0}
                </span>
              </div>
              <div className="p-3 bg-zinc-50 border border-zinc-300 rounded">
                <span className="text-[11px] text-zinc-500 block">Memories</span>
                <span className="font-mono text-black font-semibold text-xs mt-1 block">
                  {data?.database?.memoriesCount ?? 0}
                </span>
              </div>
              <div className="p-3 bg-zinc-50 border border-zinc-300 rounded">
                <span className="text-[11px] text-zinc-500 block">Tool Logs</span>
                <span className="font-mono text-black font-semibold text-xs mt-1 block">
                  {data?.database?.toolExecutionsCount ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* Tool Execution Stats */}
          <div>
            <div className="flex items-center gap-2 font-semibold text-black mb-2.5">
              <Wrench className="w-3.5 h-3.5 text-black" />
              <span>Tool Execution Statistics</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-zinc-50 border border-zinc-300 rounded">
                <span className="text-[11px] text-zinc-500 block">Total Invocations</span>
                <span className="font-mono text-black font-semibold text-xs mt-1 block">
                  {data?.tools?.totalExecuted ?? 0}
                </span>
              </div>
              <div className="p-3 bg-zinc-50 border border-zinc-300 rounded">
                <span className="text-[11px] text-zinc-500 block">Successful</span>
                <span className="font-mono text-black font-semibold text-xs mt-1 block">
                  {data?.tools?.successful ?? 0}
                </span>
              </div>
              <div className="p-3 bg-zinc-50 border border-zinc-300 rounded">
                <span className="text-[11px] text-zinc-500 block">Failed</span>
                <span className="font-mono text-black font-semibold text-xs mt-1 block">
                  {data?.tools?.errors ?? 0}
                </span>
              </div>
              <div className="p-3 bg-zinc-50 border border-zinc-300 rounded">
                <span className="text-[11px] text-zinc-500 block">Avg Duration</span>
                <span className="font-mono text-black font-semibold text-xs mt-1 block">
                  {data?.tools?.avgDurationMs ?? 0} ms
                </span>
              </div>
            </div>
          </div>

          {/* AI Providers Status */}
          <div>
            <div className="flex items-center gap-2 font-semibold text-black mb-2.5">
              <Activity className="w-3.5 h-3.5 text-black" />
              <span>Configured AI Providers</span>
            </div>
            <div className="space-y-2">
              {(data?.providers || []).map((prov: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-300 rounded font-mono text-xs"
                >
                  <div className="flex items-center gap-2">
                    {prov.isAvailable ? (
                      <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-zinc-400 shrink-0" />
                    )}
                    <span className="text-black font-semibold uppercase">{prov.provider}</span>
                  </div>
                  <span className="text-zinc-600 text-[11px]">{prov.statusMessage}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
