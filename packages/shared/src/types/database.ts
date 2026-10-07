import { AgentMode, TaskStatus, StepStatus } from './agent.js';

export interface UserSettings {
  id: string;
  defaultProvider: string;
  defaultModel: string;
  ollamaBaseUrl: string;
  openaiBaseUrl?: string;
  geminiApiKey?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  openrouterApiKey?: string;
  agentMode: AgentMode;
  autoApproveSafeCommands: boolean;
  maxIterations: number;
  commandTimeoutMs: number;
  defaultProjectsDir: string;
  memoryEnabled: boolean;
  theme: 'dark' | 'light' | 'system';
  createdAt: number;
  updatedAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  summary?: string;
  projectId?: string;
  mode: AgentMode;
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface MessageAttachment {
  name: string;
  path?: string;
  type: string;
  size: number;
  content?: string;
}

export interface ToolCallRecord {
  id: string;
  name: string;
  args: Record<string, unknown>;
  output?: unknown;
  error?: string;
  durationMs?: number;
  status: 'pending' | 'success' | 'error';
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: ToolCallRecord[];
  attachments?: MessageAttachment[];
  tokens?: number;
  createdAt: number;
}

export interface ProjectPermissions {
  readFiles: boolean;
  modifyFiles: boolean;
  runCommands: boolean;
  allowedCommandsPattern?: string;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  description?: string;
  stack: string[];
  framework?: string;
  languages: string[];
  packageManager?: string;
  entryPoints: string[];
  permissions: ProjectPermissions;
  fileCount: number;
  lastIndexedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectFile {
  id: string;
  projectId: string;
  path: string;
  relativePath: string;
  fileType: string;
  size: number;
  lineCount: number;
  summary?: string;
  lastModified: number;
}

export interface Task {
  id: string;
  conversationId: string;
  projectId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  planJson?: string;
  currentStepIndex: number;
  createdAt: number;
  completedAt?: number;
}

export interface TaskStep {
  id: string;
  taskId: string;
  stepNumber: number;
  title: string;
  description?: string;
  status: StepStatus;
  toolName?: string;
  toolInputJson?: string;
  toolOutputJson?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export type MemoryCategory =
  | 'USER_PREFERENCE'
  | 'PROJECT_CONTEXT'
  | 'IMPORTANT_DECISION'
  | 'WORKFLOW'
  | 'FACT'
  | 'CONVERSATION_SUMMARY';

export interface Memory {
  id: string;
  projectId?: string;
  category: MemoryCategory;
  content: string;
  tags: string[];
  importance: number; // 1-5
  createdAt: number;
  updatedAt: number;
}

export interface ToolExecution {
  id: string;
  taskId?: string;
  conversationId?: string;
  toolName: string;
  inputJson: string;
  outputJson?: string;
  status: 'SUCCESS' | 'ERROR';
  durationMs: number;
  error?: string;
  createdAt: number;
}

export interface FileDiff {
  id: string;
  taskId?: string;
  projectId?: string;
  filePath: string;
  originalContent: string;
  modifiedContent: string;
  diffPatch: string;
  status: 'PENDING' | 'APPLIED' | 'REJECTED' | 'REVERTED';
  createdAt: number;
}
