export type AgentMode = 'ASK' | 'ASSIST' | 'AUTONOMOUS';

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type StepStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED' | 'WAITING_CONFIRMATION';

export interface TaskPlanStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  status: StepStatus;
  output?: string;
  error?: string;
}

export interface TaskPlan {
  id: string;
  title: string;
  summary: string;
  steps: TaskPlanStep[];
  currentStepIndex: number;
  status: TaskStatus;
}

export type TaskType =
  | 'CONVERSATION'
  | 'REASONING'
  | 'CODING'
  | 'DEBUGGING'
  | 'REFACTORING'
  | 'RESEARCH'
  | 'PROJECT_ANALYSIS'
  | 'FILE_TASK'
  | 'TESTING'
  | 'UI'
  | 'DOCUMENT'
  | 'GENERAL';

export interface AgentContext {
  conversationId: string;
  projectId?: string;
  projectPath?: string;
  mode: AgentMode;
  userPrompt: string;
  model?: string;
  providerId?: string;
  filesReferenced?: string[];
  systemPromptOverrides?: string;
  maxIterations?: number;
  abortSignal?: AbortSignal;
}

export interface AgentRunResult {
  response: string;
  taskId?: string;
  taskStatus: TaskStatus;
  stepsExecuted: number;
  toolCallsCount: number;
  changedFiles: string[];
  verificationResults?: {
    passed: boolean;
    details: string;
  };
  durationMs: number;
}
