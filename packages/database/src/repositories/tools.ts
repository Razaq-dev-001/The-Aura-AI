import { DatabaseSync } from 'node:sqlite';
import { ToolExecution, generateId } from '@aura/shared';
import { getDatabase } from '../db.js';

export class ToolExecutionRepository {
  private db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db || getDatabase();
  }

  logExecution(params: {
    taskId?: string;
    conversationId?: string;
    toolName: string;
    input: Record<string, unknown>;
    output?: unknown;
    status: 'SUCCESS' | 'ERROR';
    durationMs: number;
    error?: string;
  }): ToolExecution {
    const execution: ToolExecution = {
      id: generateId('tool_exec'),
      taskId: params.taskId,
      conversationId: params.conversationId,
      toolName: params.toolName,
      inputJson: JSON.stringify(params.input),
      outputJson: params.output !== undefined ? JSON.stringify(params.output) : undefined,
      status: params.status,
      durationMs: params.durationMs,
      error: params.error,
      createdAt: Date.now()
    };

    const stmt = this.db.prepare(`
      INSERT INTO tool_executions (id, task_id, conversation_id, tool_name, input_json, output_json, status, duration_ms, error, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      execution.id,
      execution.taskId || null,
      execution.conversationId || null,
      execution.toolName,
      execution.inputJson,
      execution.outputJson || null,
      execution.status,
      execution.durationMs,
      execution.error || null,
      execution.createdAt
    );

    return execution;
  }

  listExecutions(options?: {
    taskId?: string;
    conversationId?: string;
    limit?: number;
  }): ToolExecution[] {
    let sql = 'SELECT * FROM tool_executions WHERE 1=1';
    const params: any[] = [];

    if (options?.taskId) {
      sql += ' AND task_id = ?';
      params.push(options.taskId);
    }

    if (options?.conversationId) {
      sql += ' AND conversation_id = ?';
      params.push(options.conversationId);
    }

    sql += ' ORDER BY created_at DESC';

    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((r) => ({
      id: r.id,
      taskId: r.task_id || undefined,
      conversationId: r.conversation_id || undefined,
      toolName: r.tool_name,
      inputJson: r.input_json,
      outputJson: r.output_json || undefined,
      status: r.status as 'SUCCESS' | 'ERROR',
      durationMs: Number(r.duration_ms),
      error: r.error || undefined,
      createdAt: Number(r.created_at)
    }));
  }

  getStats(): { totalCount: number; successCount: number; errorCount: number; avgDurationMs: number } {
    const row = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status = 'ERROR' THEN 1 ELSE 0 END) as error,
        AVG(duration_ms) as avg_duration
      FROM tool_executions
    `).get() as any;

    return {
      totalCount: Number(row?.total || 0),
      successCount: Number(row?.success || 0),
      errorCount: Number(row?.error || 0),
      avgDurationMs: Math.round(Number(row?.avg_duration || 0))
    };
  }
}
