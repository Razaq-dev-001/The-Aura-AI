import React, { useState, useEffect } from 'react';
import {
  Search,
  MessageSquare,
  FolderCode,
  FileCode,
  Terminal,
  Settings,
  Activity,
  Globe
} from 'lucide-react';
import { Conversation, ProjectFile, AgentMode } from '@aura/shared';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  projectFiles: ProjectFile[];
  onSelectConversation: (id: string) => void;
  onSelectFile: (file: ProjectFile) => void;
  onSetMode: (mode: AgentMode) => void;
  onOpenSettings: () => void;
  onOpenDiagnostics: () => void;
  onTriggerCommand: (cmd: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  conversations,
  projectFiles,
  onSelectConversation,
  onSelectFile,
  onSetMode,
  onOpenSettings,
  onOpenDiagnostics,
  onTriggerCommand
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          setQuery('');
          setSelectedIndex(0);
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Build searchable items
  const items: Array<{
    id: string;
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    action: () => void;
  }> = [];

  // 1. Core Actions
  items.push(
    {
      id: 'mode_autonomous',
      title: 'Switch Mode: AUTONOMOUS',
      subtitle: 'Multi-step planning, coding, and automated verification',
      icon: <Terminal className="w-4 h-4 text-black" />,
      action: () => {
        onSetMode('AUTONOMOUS');
        onClose();
      }
    },
    {
      id: 'mode_assist',
      title: 'Switch Mode: ASSIST',
      subtitle: 'Inspect files, propose diffs with approval required',
      icon: <MessageSquare className="w-4 h-4 text-black" />,
      action: () => {
        onSetMode('ASSIST');
        onClose();
      }
    },
    {
      id: 'mode_ask',
      title: 'Switch Mode: ASK',
      subtitle: 'Pure conversation and reasoning without modifying files',
      icon: <MessageSquare className="w-4 h-4 text-zinc-400" />,
      action: () => {
        onSetMode('ASK');
        onClose();
      }
    },
    {
      id: 'open_settings',
      title: 'Open Settings',
      subtitle: 'Configure AI Providers (ChatGPT, OpenAI, Ollama, Gemini)',
      icon: <Settings className="w-4 h-4 text-black" />,
      action: () => {
        onOpenSettings();
        onClose();
      }
    },
    {
      id: 'open_diagnostics',
      title: 'Open Diagnostics',
      subtitle: 'View system latency, token usage, tool health',
      icon: <Activity className="w-4 h-4 text-black" />,
      action: () => {
        onOpenDiagnostics();
        onClose();
      }
    }
  );

  // 2. Slash Commands
  items.push(
    {
      id: 'cmd_project',
      title: '/project',
      subtitle: 'Inspect current project architecture and stack',
      icon: <FolderCode className="w-4 h-4 text-black" />,
      action: () => {
        onTriggerCommand('/project');
        onClose();
      }
    },
    {
      id: 'cmd_test',
      title: '/test',
      subtitle: 'Run test suite and report results',
      icon: <Terminal className="w-4 h-4 text-black" />,
      action: () => {
        onTriggerCommand('/test');
        onClose();
      }
    },
    {
      id: 'cmd_research',
      title: '/research',
      subtitle: 'Perform documentation search',
      icon: <Globe className="w-4 h-4 text-black" />,
      action: () => {
        onTriggerCommand('/research ');
        onClose();
      }
    }
  );

  // 3. Conversations
  for (const c of conversations.slice(0, 5)) {
    items.push({
      id: `conv_${c.id}`,
      title: c.title,
      subtitle: 'Conversation',
      icon: <MessageSquare className="w-4 h-4 text-zinc-400" />,
      action: () => {
        onSelectConversation(c.id);
        onClose();
      }
    });
  }

  // 4. Project Files
  for (const f of projectFiles.slice(0, 10)) {
    items.push({
      id: `file_${f.id}`,
      title: f.relativePath,
      subtitle: `${f.lineCount} lines`,
      icon: <FileCode className="w-4 h-4 text-zinc-400" />,
      action: () => {
        onSelectFile(f);
        onClose();
      }
    });
  }

  const filtered = items.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.subtitle?.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-24 p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white text-black border border-black rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Search Header */}
        <div className="flex items-center px-4 py-3 border-b border-zinc-200 bg-white">
          <Search className="w-4 h-4 text-zinc-400 mr-3" />
          <input
            type="text"
            placeholder="Type a command, file name, or search chats..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-xs text-black placeholder-zinc-400 focus:outline-none"
            autoFocus
          />
          <span className="text-[10px] font-mono text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-300">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1 bg-white">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-zinc-400 text-xs">
              No matching commands or files found.
            </div>
          ) : (
            filtered.map((item, idx) => (
              <div
                key={item.id}
                onClick={item.action}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex items-center justify-between px-3 py-2 rounded text-xs cursor-pointer transition-colors ${
                  selectedIndex === idx
                    ? 'bg-black text-white font-medium'
                    : 'text-black hover:bg-zinc-100'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <span className={`shrink-0 ${selectedIndex === idx ? 'text-white' : 'text-black'}`}>
                    {item.icon}
                  </span>
                  <div className="truncate">
                    <span className="font-semibold block truncate">{item.title}</span>
                    {item.subtitle && (
                      <span className={`text-[11px] block truncate ${selectedIndex === idx ? 'text-zinc-200' : 'text-zinc-500'}`}>
                        {item.subtitle}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
