import { TaskPlan, StepStatus, AgentMode } from './agent.js';
import { FileDiff } from './database.js';

export type SSEEventType =
  | 'start'
  | 'token'
  | 'thought'
  | 'status'
  | 'plan_created'
  | 'plan_updated'
  | 'step_started'
  | 'step_progress'
  | 'step_completed'
  | 'step_failed'
  | 'tool_started'
  | 'tool_progress'
  | 'tool_completed'
  | 'tool_failed'
  | 'diff_created'
  | 'diff_applied'
  | 'terminal_output'
  | 'research_result'
  | 'verification_started'
  | 'verification_completed'
  | 'error'
  | 'done';

export interface SSEEvent<T = unknown> {
  event: SSEEventType;
  data: T;
  timestamp: number;
}

export interface StreamStartData {
  conversationId: string;
  messageId: string;
  model: string;
  mode: AgentMode;
}

export interface StreamTokenData {
  token: string;
}

export interface StreamThoughtData {
  thought: string;
}

export interface StreamStatusData {
  stage: string;
  message: string;
}

export interface ToolEventData {
  toolCallId: string;
  toolName: string;
  input?: Record<string, unknown>;
  output?: unknown;
  error?: string;
  durationMs?: number;
}

export interface StepEventData {
  taskId: string;
  stepId: string;
  stepNumber: number;
  title: string;
  status: StepStatus;
  toolName?: string;
  output?: string;
  error?: string;
}

export interface TerminalOutputData {
  command: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
}

export interface ResearchResultData {
  query: string;
  results: Array<{
    title: string;
    url: string;
    snippet: string;
    source: string;
    date?: string;
  }>;
}

export interface StreamDoneData {
  messageId: string;
  content: string;
  taskId?: string;
  diffs?: FileDiff[];
  stats?: {
    durationMs: number;
    toolCallsCount: number;
    tokens?: number;
  };
}
