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
  ProviderHealth
} from '@aura/shared';

export type RightPanelTab = 'files' | 'plan' | 'diffs' | 'terminal' | 'memory' | 'sources';

export interface TerminalLog {
  id: string;
  command: string;
  output: string;
  type: 'stdout' | 'stderr' | 'info';
  timestamp: number;
}

export interface WebSource {
  title: string;
  url: string;
  snippet: string;
  source: string;
  date?: string;
}

export interface StreamingState {
  isStreaming: boolean;
  stage?: string;
  statusMessage?: string;
  currentThought?: string;
  streamedText: string;
  activePlan?: Task;
  activeSteps?: TaskStep[];
  activeDiffs?: FileDiff[];
  terminalLogs: TerminalLog[];
  sources: WebSource[];
  toolCalls: Array<{
    id: string;
    name: string;
    input?: Record<string, unknown>;
    output?: unknown;
    status: 'pending' | 'success' | 'error';
    durationMs?: number;
  }>;
}

export interface AppState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];
  projects: Project[];
  activeProjectId: string | null;
  activeProjectFiles: ProjectFile[];
  memories: Memory[];
  tasks: Task[];
  settings: UserSettings | null;
  models: ModelInfo[];
  providerHealth: ProviderHealth[];
  streamingState: StreamingState;
  rightPanelTab: RightPanelTab;
  isRightPanelOpen: boolean;
  isSettingsOpen: boolean;
  isDiagnosticsOpen: boolean;
  isCommandPaletteOpen: boolean;
  isOnboardingOpen: boolean;
}
