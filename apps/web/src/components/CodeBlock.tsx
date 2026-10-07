import React, { useState } from 'react';
import { Check, Copy, FileCode, Play } from 'lucide-react';

interface CodeBlockProps {
  language: string;
  code: string;
  filePath?: string;
  onApply?: (filePath: string, code: string) => void;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  language,
  code,
  filePath,
  onApply
}) => {
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (filePath && onApply) {
      onApply(filePath, code);
      setApplied(true);
      setTimeout(() => setApplied(false), 2500);
    }
  };

  const lines = code.trim().split('\n');

  return (
    <div className="my-3 rounded border border-zinc-300 bg-zinc-50 overflow-hidden shadow-sm">
      {/* Code Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b border-zinc-300 text-xs text-black">
        <div className="flex items-center gap-2 font-mono">
          <FileCode className="w-3.5 h-3.5 text-black" />
          <span className="font-semibold text-black">{filePath || language || 'code'}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {filePath && onApply && (
            <button
              onClick={handleApply}
              disabled={applied}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                applied
                  ? 'bg-black text-white'
                  : 'bg-white hover:bg-zinc-100 text-black border border-zinc-300'
              }`}
            >
              {applied ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>Applied</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 text-black" />
                  <span>Apply</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-white hover:bg-zinc-100 text-black border border-zinc-300 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-black" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Content */}
      <div className="p-3 overflow-x-auto text-xs font-mono leading-relaxed text-black bg-zinc-50">
        <pre className="grid grid-cols-[auto_1fr] gap-x-4">
          <span className="select-none text-right text-zinc-400 space-y-0.5">
            {lines.map((_, i) => (
              <span key={i} className="block text-[11px] leading-5">
                {i + 1}
              </span>
            ))}
          </span>
          <code className="block space-y-0.5 overflow-visible whitespace-pre text-black">
            {lines.map((line, i) => (
              <span key={i} className="block leading-5">
                {line || ' '}
              </span>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
};
