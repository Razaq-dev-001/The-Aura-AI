import React, { useState } from 'react';
import {
  MessageSquarePlus,
  FolderPlus,
  FolderCode,
  Search,
  Settings,
  Activity,
  Trash2,
  Edit2,
  Check,
  X,
  ChevronRight
} from 'lucide-react';
import { Conversation, Project, AgentMode } from '@aura/shared';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (id: string) => void;
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  onOpenProjectModal: () => void;
  onOpenSettings: () => void;
  onOpenDiagnostics: () => void;
  agentMode: AgentMode;
  onModeChange: (mode: AgentMode) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onDeleteConversation,
  projects,
  activeProjectId,
  onSelectProject,
  onOpenProjectModal,
  onOpenSettings,
  onOpenDiagnostics,
  agentMode,
  onModeChange
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  const todayConvs: Conversation[] = [];
  const yesterdayConvs: Conversation[] = [];
  const olderConvs: Conversation[] = [];

  for (const c of filteredConversations) {
    const age = now - c.updatedAt;
    if (age < ONE_DAY) {
      todayConvs.push(c);
    } else if (age < 2 * ONE_DAY) {
      yesterdayConvs.push(c);
    } else {
      olderConvs.push(c);
    }
  }

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const startEditing = (c: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const saveEditing = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <aside className="w-64 border-r border-zinc-200 bg-white text-black flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className="p-3.5 border-b border-zinc-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-black text-white flex items-center justify-center font-bold text-xs tracking-wider">
            A
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold tracking-wider text-xs text-black uppercase">
                AURA
              </span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-zinc-100 text-black font-mono border border-zinc-300">
                v1.0
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 block">Personal Assistant</span>
          </div>
        </div>

        {/* Mode Selector Pill */}
        <button
          onClick={() => {
            const nextMode: AgentMode =
              agentMode === 'ASK' ? 'ASSIST' : agentMode === 'ASSIST' ? 'AUTONOMOUS' : 'ASK';
            onModeChange(nextMode);
          }}
          className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wider transition-all border border-black bg-black text-white hover:bg-zinc-800"
          title="Click to toggle execution mode"
        >
          {agentMode}
        </button>
      </div>

      {/* Primary Actions */}
      <div className="p-3 space-y-2 border-b border-zinc-200">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-black hover:bg-zinc-800 text-white text-xs font-medium transition-all shadow-sm group"
        >
          <MessageSquarePlus className="w-3.5 h-3.5 text-white" />
          <span>New Conversation</span>
        </button>

        {/* Active Project Card / Switcher */}
        <div className="pt-1">
          {activeProject ? (
            <div className="p-2 rounded-lg bg-zinc-50 border border-zinc-300 text-xs flex items-center justify-between group">
              <div className="flex items-center gap-2 truncate min-w-0">
                <FolderCode className="w-4 h-4 text-black shrink-0" />
                <div className="truncate">
                  <span className="font-medium text-black block truncate">{activeProject.name}</span>
                  <span className="text-[10px] text-zinc-500 block truncate font-mono">
                    {activeProject.framework || activeProject.languages[0] || 'Project'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => onSelectProject(null)}
                className="text-zinc-500 hover:text-black p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Unlink project"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenProjectModal}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-dashed border-zinc-300 hover:border-black hover:bg-zinc-50 text-zinc-600 hover:text-black text-xs transition-colors"
            >
              <div className="flex items-center gap-2">
                <FolderPlus className="w-3.5 h-3.5 text-zinc-500" />
                <span>Open Project Folder</span>
              </div>
              <ChevronRight className="w-3 h-3 text-zinc-400" />
            </button>
          )}
        </div>
      </div>

      {/* Search Conversations */}
      <div className="px-3 pt-2.5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-300 rounded-md pl-8 pr-2.5 py-1.5 text-xs text-black placeholder-zinc-400 focus:outline-none focus:border-black"
          />
        </div>
      </div>

      {/* Conversations History */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 text-xs">
        {todayConvs.length > 0 && (
          <div>
            <span className="px-2 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
              Today
            </span>
            <div className="space-y-0.5">
              {todayConvs.map((c) => renderConvItem(c))}
            </div>
          </div>
        )}

        {yesterdayConvs.length > 0 && (
          <div>
            <span className="px-2 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
              Yesterday
            </span>
            <div className="space-y-0.5">
              {yesterdayConvs.map((c) => renderConvItem(c))}
            </div>
          </div>
        )}

        {olderConvs.length > 0 && (
          <div>
            <span className="px-2 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
              Previous 7 Days
            </span>
            <div className="space-y-0.5">
              {olderConvs.map((c) => renderConvItem(c))}
            </div>
          </div>
        )}

        {filteredConversations.length === 0 && (
          <div className="text-center py-8 text-zinc-400 text-xs">
            {searchQuery ? 'No matching chats' : 'No conversations yet'}
          </div>
        )}
      </div>

      {/* Bottom Utility Bar */}
      <div className="p-2 border-t border-zinc-200 bg-white flex items-center justify-between text-xs text-zinc-600">
        <button
          onClick={onOpenDiagnostics}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-zinc-100 hover:text-black transition-colors"
          title="Diagnostics & Observability"
        >
          <Activity className="w-3.5 h-3.5 text-black" />
          <span>Diagnostics</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-zinc-100 hover:text-black transition-colors"
          title="Settings & Providers"
        >
          <Settings className="w-3.5 h-3.5 text-zinc-600" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );

  function renderConvItem(c: Conversation) {
    const isActive = c.id === activeConversationId;
    const isEditing = editingId === c.id;

    return (
      <div
        key={c.id}
        onClick={() => onSelectConversation(c.id)}
        className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
          isActive
            ? 'bg-zinc-100 text-black font-semibold border-l-2 border-black'
            : 'text-zinc-600 hover:text-black hover:bg-zinc-50'
        }`}
      >
        {isEditing ? (
          <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full bg-white border border-black rounded px-1.5 py-0.5 text-xs text-black focus:outline-none"
              autoFocus
            />
            <button onClick={(e) => saveEditing(c.id, e)} className="text-black p-0.5">
              <Check className="w-3 h-3" />
            </button>
            <button onClick={() => setEditingId(null)} className="text-zinc-400 p-0.5">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <>
            <span className="truncate flex-1 text-xs">{c.title}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
              <button
                onClick={(e) => startEditing(c, e)}
                className="text-zinc-400 hover:text-black p-0.5"
                title="Rename"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConversation(c.id);
                }}
                className="text-zinc-400 hover:text-black p-0.5"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </>
        )}
      </div>
    );
  }
};
