import { z } from 'zod';

export type ToolPermissionLevel = 'SAFE' | 'REQUIRES_CONFIRMATION' | 'BLOCKED';

export interface ToolDefinition<TParams extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  parameters: TParams;
  permissionLevel: ToolPermissionLevel;
  category: 'file' | 'terminal' | 'git' | 'project' | 'memory' | 'research' | 'document';
}

export interface ToolExecutionContext {
  conversationId?: string;
  taskId?: string;
  projectId?: string;
  projectPath?: string;
  autoApprove?: boolean;
  abortSignal?: AbortSignal;
  onProgress?: (data: { message: string; percentage?: number }) => void;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  durationMs: number;
  metadata?: Record<string, unknown>;
}

export interface ExecutableTool<TParams extends z.ZodTypeAny = z.ZodTypeAny, TResult = unknown>
  extends ToolDefinition<TParams> {
  execute: (
    params: z.infer<TParams>,
    context: ToolExecutionContext
  ) => Promise<ToolResult<TResult>>;
}
