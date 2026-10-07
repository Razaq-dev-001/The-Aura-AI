import React, { useState } from 'react';
import { X, FolderOpen, ArrowRight, Loader2 } from 'lucide-react';

interface OpenProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProject: (path: string, name?: string) => Promise<void>;
}

export const OpenProjectModal: React.FC<OpenProjectModalProps> = ({
  isOpen,
  onClose,
  onOpenProject
}) => {
  const [projectPath, setProjectPath] = useState('');
  const [projectName, setProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectPath.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      await onOpenProject(projectPath.trim(), projectName.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to open project directory');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white text-black border border-black rounded-xl shadow-2xl overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-black" />
            <h2 className="text-sm font-bold text-black">Open Local Project</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-black hover:bg-zinc-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs bg-white">
          <div>
            <label className="block text-black font-semibold mb-1">
              Project Folder Path (Mac / Local)
            </label>
            <input
              type="text"
              placeholder="/Users/username/my-project or ."
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
              className="w-full bg-white border border-zinc-300 rounded px-3 py-2 text-black font-mono focus:outline-none focus:border-black"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-black font-semibold mb-1">
              Project Display Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. My App"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full bg-white border border-zinc-300 rounded px-3 py-2 text-black focus:outline-none focus:border-black"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded border border-black bg-zinc-50 text-black text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded text-zinc-600 hover:text-black"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !projectPath.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-black hover:bg-zinc-800 disabled:opacity-30 text-white rounded font-medium transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Indexing...</span>
                </>
              ) : (
                <>
                  <span>Index & Open</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
