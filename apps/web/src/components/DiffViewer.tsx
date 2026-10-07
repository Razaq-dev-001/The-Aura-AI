import React from 'react';
import { Check, X, RotateCcw, FileDiff as FileDiffIcon } from 'lucide-react';
import { FileDiff } from '@aura/shared';

interface DiffViewerProps {
  diff: FileDiff;
  onApply?: (id: string) => void;
  onReject?: (id: string) => void;
  onRevert?: (id: string) => void;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  diff,
  onApply,
  onReject,
  onRevert
}) => {
  const lines = diff.diffPatch.split('\n');

  let additions = 0;
  let deletions = 0;
  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) additions++;
    if (line.startsWith('-') && !line.startsWith('---')) deletions++;
  }

  return (
    <div className="rounded border border-zinc-300 bg-white overflow-hidden my-3 shadow-sm">
      {/* Diff Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-zinc-300 text-xs">
        <div className="flex items-center gap-2 font-mono">
          <FileDiffIcon className="w-3.5 h-3.5 text-black" />
          <span className="text-black font-semibold">{diff.filePath}</span>
          <div className="flex items-center gap-1.5 ml-2 text-[11px] font-mono">
            <span className="text-black">+{additions}</span>
            <span className="text-zinc-500">-{deletions}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-zinc-100 text-black border border-zinc-300">
            {diff.status}
          </span>

          {diff.status === 'PENDING' && onApply && (
            <button
              onClick={() => onApply(diff.id)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-black hover:bg-zinc-800 text-white font-medium transition-colors"
            >
              <Check className="w-3 h-3" />
              <span>Apply</span>
            </button>
          )}

          {diff.status === 'PENDING' && onReject && (
            <button
              onClick={() => onReject(diff.id)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-white hover:bg-zinc-100 text-black border border-zinc-300 transition-colors"
            >
              <X className="w-3 h-3" />
              <span>Reject</span>
            </button>
          )}

          {diff.status === 'APPLIED' && onRevert && (
            <button
              onClick={() => onRevert(diff.id)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-white hover:bg-zinc-100 text-black border border-zinc-300 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Revert</span>
            </button>
          )}
        </div>
      </div>

      {/* Diff Code Viewer */}
      <div className="p-2 overflow-x-auto text-xs font-mono leading-5 text-black max-h-96 bg-zinc-50">
        {lines.map((line, idx) => {
          const isAdd = line.startsWith('+') && !line.startsWith('+++');
          const isDel = line.startsWith('-') && !line.startsWith('---');
          const isHeader = line.startsWith('---') || line.startsWith('+++') || line.startsWith('@@');

          return (
            <div
              key={idx}
              className={`flex items-start px-2 py-0.5 rounded ${
                isAdd
                  ? 'bg-zinc-100 text-black border-l-2 border-black font-medium'
                  : isDel
                  ? 'bg-white text-zinc-500 border-l-2 border-zinc-300 line-through'
                  : isHeader
                  ? 'text-zinc-500 font-semibold text-[11px]'
                  : 'text-black'
              }`}
            >
              <span className="w-4 select-none text-zinc-400 mr-2 text-center text-[10px]">
                {isAdd ? '+' : isDel ? '-' : ' '}
              </span>
              <span className="whitespace-pre overflow-visible">{line.substring(1) || ' '}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
