import { useState, useEffect, useRef } from 'react';
import {
  Conversation,
  Message,
  Project,
  ProjectFile,
  Task,
  TaskStep,
  Memory,
  FileDiff,
  UserSettings,
  ModelInfo,
  ProviderHealth,
  AgentMode,
  SSEEvent
} from '@aura/shared';
import { api } from './services/api.js';
import { StreamingState, RightPanelTab, TerminalLog } from './types.js';
import { Sidebar } from './components/Sidebar.js';
import { ChatArea } from './components/ChatArea.js';
import { RightPanel } from './components/RightPanel.js';
import { CommandPalette } from './components/CommandPalette.js';
import { SettingsModal } from './components/SettingsModal.js';
import { QuickConnectModal } from './components/QuickConnectModal.js';
import { DiagnosticsView } from './components/DiagnosticsView.js';
import { OnboardingModal } from './components/OnboardingModal.js';
import { OpenProjectModal } from './components/OpenProjectModal.js';

export function App() {
  // Application Data State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeProjectFiles, setActiveProjectFiles] = useState<ProjectFile[]>([]);

  const [memories, setMemories] = useState<Memory[]>([]);
  const [diffs, setDiffs] = useState<FileDiff[]>([]);
  const [activeTask, setActiveTask] = useState<Task | undefined>(undefined);
  const [activeSteps, setActiveSteps] = useState<TaskStep[]>([]);

  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [providerHealth, setProviderHealth] = useState<ProviderHealth[]>([]);
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [agentMode, setAgentMode] = useState<AgentMode>('ASSIST');

  // Streaming state
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    streamedText: '',
    terminalLogs: [],
    sources: [],
    toolCalls: []
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // UI Panels state
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('files');
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQuickConnectOpen, setIsQuickConnectOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isOpenProjectOpen, setIsOpenProjectOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [diagnosticsData, setDiagnosticsData] = useState<any>(null);

  // 1. Initial Data Loading
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [convsData, projsData, settingsData, providersData, memsData] = await Promise.all([
        api.getConversations(),
        api.getProjects(),
        api.getSettings(),
        api.getProviders(),
        api.getMemories()
      ]);

      setConversations(convsData);
      setProjects(projsData);
      setSettings(settingsData);
      setMemories(memsData);
      setModels(providersData.models || []);
      setProviderHealth(providersData.health || []);

      if (settingsData) {
        setAgentMode(settingsData.agentMode || 'ASSIST');
        setSelectedModel(settingsData.defaultModel || 'gpt-4o');
      }

      // Check first-time onboarding
      if (!localStorage.getItem('aura_onboarded_v1')) {
        setIsOnboardingOpen(true);
      }

      // Auto-select latest conversation or create one
      if (convsData.length > 0) {
        selectConversation(convsData[0].id);
      } else {
        createNewChat();
      }

      // Auto-select first project if available
      if (projsData.length > 0) {
        selectProject(projsData[0].id);
      }
    } catch (err) {
      console.error('Initial data load error:', err);
    }
  };

  // 2. Select & Load Conversation
  const selectConversation = async (id: string) => {
    setActiveConversationId(id);
    try {
      const data = await api.getConversation(id);
      setActiveConversation(data.conversation);
      setMessages(data.messages || []);
      if (data.conversation.projectId) {
        selectProject(data.conversation.projectId);
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  };

  const createNewChat = async () => {
    try {
      const newConv = await api.createConversation({
        title: 'New Conversation',
        projectId: activeProjectId || undefined,
        mode: agentMode
      });
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      setActiveConversation(newConv);
      setMessages([]);
    } catch (err) {
      console.error('Failed to create new chat:', err);
    }
  };

  const handleRenameConversation = async (id: string, title: string) => {
    try {
      const updated = await api.updateConversation(id, { title });
      setConversations((prev) => prev.map((c) => (c.id === id ? updated : c)));
      if (activeConversationId === id) {
        setActiveConversation(updated);
      }
    } catch (err) {
      console.error('Rename conversation failed:', err);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await api.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        const remaining = conversations.filter((c) => c.id !== id);
        if (remaining.length > 0) {
          selectConversation(remaining[0].id);
        } else {
          createNewChat();
        }
      }
    } catch (err) {
      console.error('Delete conversation failed:', err);
    }
  };

  // 3. Project Selection & File Explorer
  const selectProject = async (id: string | null) => {
    setActiveProjectId(id);
    if (!id) {
      setActiveProjectFiles([]);
      return;
    }
    try {
      const files = await api.getProjectFiles(id);
      setActiveProjectFiles(files);
      const projDiffs = await api.getDiffs({ projectId: id });
      setDiffs(projDiffs);
    } catch (err) {
      console.error('Failed to load project files:', err);
    }
  };

  const handleOpenProject = async (projectPath: string, name?: string) => {
    const res = await api.openProject(projectPath, name);
    setProjects((prev) => {
      const filtered = prev.filter((p) => p.id !== res.project.id);
      return [res.project, ...filtered];
    });
    selectProject(res.project.id);
    setIsRightPanelOpen(true);
    setRightPanelTab('files');
  };

  // 4. Send Message & SSE Streaming
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || streamingState.isStreaming) return;

    let targetConvId = activeConversationId;
    if (!targetConvId) {
      const newConv = await api.createConversation({
        title: text.substring(0, 40),
        projectId: activeProjectId || undefined,
        mode: agentMode
      });
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      setActiveConversation(newConv);
      targetConvId = newConv.id;
    }

    // Append User Message to UI
    const tempUserMsg: Message = {
      id: `usr_${Date.now()}`,
      conversationId: targetConvId,
      role: 'user',
      content: text,
      createdAt: Date.now()
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    // Reset Streaming State
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setStreamingState({
      isStreaming: true,
      stage: 'Understanding',
      statusMessage: 'Analyzing intent...',
      streamedText: '',
      terminalLogs: [],
      sources: [],
      toolCalls: []
    });

    try {
      await api.streamChat(
        {
          conversationId: targetConvId,
          message: text,
          projectId: activeProjectId || undefined,
          mode: agentMode,
          model: selectedModel
        },
        (sseEvent: SSEEvent) => {
          handleSSEEvent(sseEvent);
        },
        abortController.signal
      );
    } catch (err: any) {
      if (!abortController.signal.aborted) {
        console.error('Chat streaming error:', err);
      }
    } finally {
      // Reload full conversation history from server
      if (targetConvId) {
        const fullConv = await api.getConversation(targetConvId);
        setMessages(fullConv.messages || []);
      }
      setStreamingState((prev) => ({ ...prev, isStreaming: false }));
      abortControllerRef.current = null;
    }
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setStreamingState((prev) => ({ ...prev, isStreaming: false }));
    }
  };

  // Handle live SSE events
  const handleSSEEvent = (e: SSEEvent) => {
    switch (e.event) {
      case 'token': {
        const token = (e.data as any)?.token || '';
        setStreamingState((prev) => ({
          ...prev,
          streamedText: prev.streamedText + token
        }));
        break;
      }
      case 'status': {
        const statusData = e.data as any;
        setStreamingState((prev) => ({
          ...prev,
          stage: statusData.stage,
          statusMessage: statusData.message
        }));
        break;
      }
      case 'plan_created': {
        const plan = e.data as any;
        setActiveTask(plan);
        setActiveSteps(plan.steps || []);
        setIsRightPanelOpen(true);
        setRightPanelTab('plan');
        break;
      }
      case 'step_started': {
        const stepData = e.data as any;
        setActiveSteps((prev) =>
          prev.map((s) => (s.id === stepData.stepId ? { ...s, status: 'RUNNING' } : s))
        );
        break;
      }
      case 'step_completed': {
        const stepData = e.data as any;
        setActiveSteps((prev) =>
          prev.map((s) =>
            s.id === stepData.stepId
              ? { ...s, status: 'COMPLETED', output: stepData.output }
              : s
          )
        );
        break;
      }
      case 'step_failed': {
        const stepData = e.data as any;
        setActiveSteps((prev) =>
          prev.map((s) =>
            s.id === stepData.stepId
              ? { ...s, status: 'FAILED', error: stepData.error }
              : s
          )
        );
        break;
      }
      case 'tool_started': {
        const toolData = e.data as any;
        setStreamingState((prev) => ({
          ...prev,
          toolCalls: [
            ...prev.toolCalls,
            {
              id: toolData.toolCallId,
              name: toolData.toolName,
              input: toolData.input,
              status: 'pending'
            }
          ]
        }));
        break;
      }
      case 'tool_completed': {
        const toolData = e.data as any;
        setStreamingState((prev) => ({
          ...prev,
          toolCalls: prev.toolCalls.map((tc) =>
            tc.id === toolData.toolCallId
              ? {
                  ...tc,
                  status: 'success',
                  output: toolData.output,
                  durationMs: toolData.durationMs
                }
              : tc
          )
        }));
        break;
      }
      case 'diff_created': {
        const diffData = e.data as any;
        const newDiff: FileDiff = {
          id: `diff_${Date.now()}`,
          filePath: diffData.filePath,
          originalContent: '',
          modifiedContent: '',
          diffPatch: diffData.diffPatch,
          status: 'APPLIED',
          createdAt: Date.now()
        };
        setDiffs((prev) => [newDiff, ...prev]);
        setStreamingState((prev) => ({
          ...prev,
          activeDiffs: [...(prev.activeDiffs || []), newDiff]
        }));
        break;
      }
      case 'terminal_output': {
        const termData = e.data as any;
        const newLog: TerminalLog = {
          id: `term_${Date.now()}`,
          command: termData.command,
          output: termData.stdout || termData.stderr || '',
          type: termData.stderr ? 'stderr' : 'stdout',
          timestamp: Date.now()
        };
        setStreamingState((prev) => ({
          ...prev,
          terminalLogs: [...prev.terminalLogs, newLog]
        }));
        break;
      }
      case 'research_result': {
        const resData = e.data as any;
        setStreamingState((prev) => ({
          ...prev,
          sources: [...prev.sources, ...(resData.results || [])]
        }));
        break;
      }
    }
  };

  // 5. Diff Actions
  const handleApplyDiff = async (diffId: string) => {
    await api.applyDiff(diffId);
    setDiffs((prev) =>
      prev.map((d) => (d.id === diffId ? { ...d, status: 'APPLIED' } : d))
    );
  };

  const handleRejectDiff = async (diffId: string) => {
    setDiffs((prev) =>
      prev.map((d) => (d.id === diffId ? { ...d, status: 'REJECTED' } : d))
    );
  };

  const handleRevertDiff = async (diffId: string) => {
    await api.revertDiff(diffId);
    setDiffs((prev) =>
      prev.map((d) => (d.id === diffId ? { ...d, status: 'REVERTED' } : d))
    );
  };

  // 6. Memory Actions
  const handleAddMemory = async (category: string, content: string) => {
    const mem = await api.saveMemory({
      projectId: activeProjectId || undefined,
      category: category as any,
      content
    });
    setMemories((prev) => [mem, ...prev]);
  };

  const handleDeleteMemory = async (id: string) => {
    await api.deleteMemory(id);
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  const handleClearMemory = async () => {
    await fetch('/api/memory', { method: 'DELETE' });
    setMemories([]);
  };

  // 7. Diagnostics & Settings
  const handleOpenDiagnostics = async () => {
    try {
      const data = await api.getDiagnostics();
      setDiagnosticsData(data);
      setIsDiagnosticsOpen(true);
    } catch (err) {
      console.error('Failed to load diagnostics:', err);
    }
  };

  const handleSaveSettings = async (newSettings: Partial<UserSettings>) => {
    const updated = await api.updateSettings(newSettings);
    setSettings(updated);
    if (updated.agentMode) setAgentMode(updated.agentMode);
    if (updated.defaultModel) setSelectedModel(updated.defaultModel);

    // Refresh providers health & model list
    const providersData = await api.getProviders();
    setModels(providersData.models || []);
    setProviderHealth(providersData.health || []);
  };

  const handleConnectGateway = async (params: {
    apiKey: string;
    baseUrl?: string;
    defaultModel?: string;
    providerId?: string;
  }) => {
    if (params.providerId === 'free-ai') {
      await handleSaveSettings({
        defaultProvider: 'free-ai',
        defaultModel: params.defaultModel || 'free-gpt-4o'
      });
      setSelectedModel(params.defaultModel || 'free-gpt-4o');
    } else if (params.providerId === 'openrouter') {
      const res = await api.connectOmniRoute({
        apiKey: params.apiKey,
        defaultModel: params.defaultModel || 'deepseek/deepseek-r1:free'
      });
      setSettings(res.settings);
      setSelectedModel(params.defaultModel || 'deepseek/deepseek-r1:free');
    } else {
      const res = await api.connectChatGPT(params);
      setSettings(res.settings);
      setSelectedModel(params.defaultModel || 'gpt-4o');
    }

    // Refresh providers list
    const providersData = await api.getProviders();
    setModels(providersData.models || []);
    setProviderHealth(providersData.health || []);
  };

  const handleTestProvider = async (providerId: string) => {
    const res = await fetch('/api/providers/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId })
    });
    const data = await res.json();
    setProviderHealth((prev) => [
      ...prev.filter((p) => p.provider !== providerId),
      data.health
    ]);
  };

  const handleFinishOnboarding = async (cfg: { provider: string; projectsDir: string }) => {
    localStorage.setItem('aura_onboarded_v1', 'true');
    await handleSaveSettings({
      defaultProvider: cfg.provider,
      defaultProjectsDir: cfg.projectsDir
    });
    setIsOnboardingOpen(false);
  };

  const activeProject = projects.find((p) => p.id === activeProjectId) || null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-black font-sans">
      {/* 1. Left Navigation Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={selectConversation}
        onNewChat={createNewChat}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={selectProject}
        onOpenProjectModal={() => setIsOpenProjectOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDiagnostics={handleOpenDiagnostics}
        agentMode={agentMode}
        onModeChange={(mode) => {
          setAgentMode(mode);
          handleSaveSettings({ agentMode: mode });
        }}
      />

      {/* 2. Center Workspace & Chat Area */}
      <ChatArea
        conversation={activeConversation}
        messages={messages}
        streamingState={streamingState}
        models={models}
        providerHealth={providerHealth}
        selectedModel={selectedModel}
        onModelChange={(m) => {
          setSelectedModel(m);
          handleSaveSettings({ defaultModel: m });
        }}
        agentMode={agentMode}
        onModeChange={(mode) => {
          setAgentMode(mode);
          handleSaveSettings({ agentMode: mode });
        }}
        activeProject={activeProject}
        rightPanelTab={rightPanelTab}
        isRightPanelOpen={isRightPanelOpen}
        onToggleRightPanel={(tab) => {
          if (tab) setRightPanelTab(tab);
          setIsRightPanelOpen((prev) => (tab && tab !== rightPanelTab ? true : !prev));
        }}
        onSendMessage={handleSendMessage}
        onStopStreaming={handleStopStreaming}
        onOpenQuickConnect={() => setIsQuickConnectOpen(true)}
        onApplyDiff={handleApplyDiff}
      />

      {/* 3. Contextual Right Panel */}
      <RightPanel
        isOpen={isRightPanelOpen}
        onClose={() => setIsRightPanelOpen(false)}
        activeTab={rightPanelTab}
        onTabChange={setRightPanelTab}
        projectFiles={activeProjectFiles}
        activeTask={activeTask}
        activeSteps={activeSteps}
        diffs={diffs}
        terminalLogs={streamingState.terminalLogs}
        memories={memories}
        sources={streamingState.sources}
        onApplyDiff={handleApplyDiff}
        onRejectDiff={handleRejectDiff}
        onRevertDiff={handleRevertDiff}
        onAddMemory={handleAddMemory}
        onDeleteMemory={handleDeleteMemory}
        onCancelTask={() => handleStopStreaming()}
      />

      {/* 4. Global Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        conversations={conversations}
        projectFiles={activeProjectFiles}
        onSelectConversation={selectConversation}
        onSelectFile={(_f) => {
          setIsRightPanelOpen(true);
          setRightPanelTab('files');
        }}
        onSetMode={(m) => {
          setAgentMode(m);
          handleSaveSettings({ agentMode: m });
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDiagnostics={handleOpenDiagnostics}
        onTriggerCommand={(cmd) => handleSendMessage(cmd)}
      />

      {/* 5. Modals */}
      <QuickConnectModal
        isOpen={isQuickConnectOpen}
        onClose={() => setIsQuickConnectOpen(false)}
        onConnect={handleConnectGateway}
        settings={settings}
        providerHealth={providerHealth}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        providerHealth={providerHealth}
        onSaveSettings={handleSaveSettings}
        onTestProvider={handleTestProvider}
        onClearMemory={handleClearMemory}
      />

      <DiagnosticsView
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        data={diagnosticsData}
      />

      <OpenProjectModal
        isOpen={isOpenProjectOpen}
        onClose={() => setIsOpenProjectOpen(false)}
        onOpenProject={handleOpenProject}
      />

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onFinish={handleFinishOnboarding}
      />
    </div>
  );
}
