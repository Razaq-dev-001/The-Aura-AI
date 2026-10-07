import { DatabaseSync } from 'node:sqlite';
import { FileDiff, generateId } from '@aura/shared';
import { getDatabase } from '../db.js';

export class FileDiffRepository {
  private db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db || getDatabase();
  }

  createDiff(params: {
    taskId?: string;
    projectId?: string;
    filePath: string;
    originalContent: string;
    modifiedContent: string;
    diffPatch: string;
    status?: 'PENDING' | 'APPLIED' | 'REJECTED' | 'REVERTED';
  }): FileDiff {
    const diff: FileDiff = {
      id: generateId('diff'),
      taskId: params.taskId,
      projectId: params.projectId,
      filePath: params.filePath,
      originalContent: params.originalContent,
      modifiedContent: params.modifiedContent,
      diffPatch: params.diffPatch,
      status: params.status || 'PENDING',
      createdAt: Date.now()
    };

    const stmt = this.db.prepare(`
      INSERT INTO file_diffs (id, task_id, project_id, file_path, original_content, modified_content, diff_patch, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      diff.id,
      diff.taskId || null,
      diff.projectId || null,
      diff.filePath,
      diff.originalContent,
      diff.modifiedContent,
      diff.diffPatch,
      diff.status,
      diff.createdAt
    );

    return diff;
  }

  getDiffById(id: string): FileDiff | null {
    const row = this.db.prepare('SELECT * FROM file_diffs WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.mapRow(row);
  }

  listDiffsByTaskId(taskId: string): FileDiff[] {
    const rows = this.db.prepare('SELECT * FROM file_diffs WHERE task_id = ? ORDER BY created_at DESC').all(taskId) as any[];
    return rows.map((r) => this.mapRow(r));
  }

  listDiffsByProjectId(projectId: string): FileDiff[] {
    const rows = this.db.prepare('SELECT * FROM file_diffs WHERE project_id = ? ORDER BY created_at DESC LIMIT 50').all(projectId) as any[];
    return rows.map((r) => this.mapRow(r));
  }

  updateDiffStatus(id: string, status: 'PENDING' | 'APPLIED' | 'REJECTED' | 'REVERTED'): boolean {
    const stmt = this.db.prepare('UPDATE file_diffs SET status = ? WHERE id = ?');
    stmt.run(status, id);
    return true;
  }

  private mapRow(row: any): FileDiff {
    return {
      id: row.id,
      taskId: row.task_id || undefined,
      projectId: row.project_id || undefined,
      filePath: row.file_path,
      originalContent: row.original_content,
      modifiedContent: row.modified_content,
      diffPatch: row.diff_patch,
      status: row.status as 'PENDING' | 'APPLIED' | 'REJECTED' | 'REVERTED',
      createdAt: Number(row.created_at)
    };
  }
}
