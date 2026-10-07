import { DatabaseSync } from 'node:sqlite';
import { Task, TaskStep, TaskStatus, StepStatus, generateId } from '@aura/shared';
import { getDatabase } from '../db.js';

export class TaskRepository {
  private db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db || getDatabase();
  }

  createTask(params: {
    conversationId: string;
    projectId?: string;
    title: string;
    description?: string;
    planJson?: string;
  }): Task {
    const now = Date.now();
    const task: Task = {
      id: generateId('task'),
      conversationId: params.conversationId,
      projectId: params.projectId,
      title: params.title,
      description: params.description,
      status: 'PENDING',
      planJson: params.planJson,
      currentStepIndex: 0,
      createdAt: now
    };

    const stmt = this.db.prepare(`
      INSERT INTO tasks (id, conversation_id, project_id, title, description, status, plan_json, current_step_index, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      task.id,
      task.conversationId,
      task.projectId || null,
      task.title,
      task.description || null,
      task.status,
      task.planJson || null,
      task.currentStepIndex,
      task.createdAt
    );

    return task;
  }

  getTaskById(id: string): Task | null {
    const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.mapTask(row);
  }

  listTasks(conversationId?: string): Task[] {
    let sql = 'SELECT * FROM tasks';
    const params: any[] = [];
    if (conversationId) {
      sql += ' WHERE conversation_id = ?';
      params.push(conversationId);
    }
    sql += ' ORDER BY created_at DESC';

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((r) => this.mapTask(r));
  }

  updateTaskStatus(id: string, status: TaskStatus, currentStepIndex?: number): boolean {
    const now = Date.now();
    const completedAt = ['COMPLETED', 'FAILED', 'CANCELLED'].includes(status) ? now : null;

    const stmt = this.db.prepare(`
      UPDATE tasks SET
        status = ?,
        current_step_index = COALESCE(?, current_step_index),
        completed_at = COALESCE(?, completed_at)
      WHERE id = ?
    `);

    stmt.run(status, currentStepIndex ?? null, completedAt, id);
    return true;
  }

  // Task Steps
  createStep(params: {
    taskId: string;
    stepNumber: number;
    title: string;
    description?: string;
    toolName?: string;
    toolInputJson?: string;
  }): TaskStep {
    const now = Date.now();
    const step: TaskStep = {
      id: generateId('step'),
      taskId: params.taskId,
      stepNumber: params.stepNumber,
      title: params.title,
      description: params.description,
      status: 'PENDING',
      toolName: params.toolName,
      toolInputJson: params.toolInputJson,
      createdAt: now,
      updatedAt: now
    };

    const stmt = this.db.prepare(`
      INSERT INTO task_steps (id, task_id, step_number, title, description, status, tool_name, tool_input_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      step.id,
      step.taskId,
      step.stepNumber,
      step.title,
      step.description || null,
      step.status,
      step.toolName || null,
      step.toolInputJson || null,
      step.createdAt,
      step.updatedAt
    );

    return step;
  }

  getStepsByTaskId(taskId: string): TaskStep[] {
    const rows = this.db.prepare('SELECT * FROM task_steps WHERE task_id = ? ORDER BY step_number ASC').all(taskId) as any[];
    return rows.map((r) => this.mapStep(r));
  }

  updateStep(
    id: string,
    updates: Partial<Pick<TaskStep, 'status' | 'toolOutputJson' | 'error' | 'toolName' | 'toolInputJson'>>
  ): boolean {
    const now = Date.now();
    const stmt = this.db.prepare(`
      UPDATE task_steps SET
        status = COALESCE(?, status),
        tool_name = COALESCE(?, tool_name),
        tool_input_json = COALESCE(?, tool_input_json),
        tool_output_json = COALESCE(?, tool_output_json),
        error = COALESCE(?, error),
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      updates.status || null,
      updates.toolName || null,
      updates.toolInputJson || null,
      updates.toolOutputJson || null,
      updates.error || null,
      now,
      id
    );

    return true;
  }

  private mapTask(row: any): Task {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      projectId: row.project_id || undefined,
      title: row.title,
      description: row.description || undefined,
      status: row.status as TaskStatus,
      planJson: row.plan_json || undefined,
      currentStepIndex: Number(row.current_step_index || 0),
      createdAt: Number(row.created_at),
      completedAt: row.completed_at ? Number(row.completed_at) : undefined
    };
  }

  private mapStep(row: any): TaskStep {
    return {
      id: row.id,
      taskId: row.task_id,
      stepNumber: Number(row.step_number),
      title: row.title,
      description: row.description || undefined,
      status: row.status as StepStatus,
      toolName: row.tool_name || undefined,
      toolInputJson: row.tool_input_json || undefined,
      toolOutputJson: row.tool_output_json || undefined,
      error: row.error || undefined,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at)
    };
  }
}
