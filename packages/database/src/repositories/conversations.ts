import { DatabaseSync } from 'node:sqlite';
import { Conversation, AgentMode, generateId } from '@aura/shared';
import { getDatabase } from '../db.js';

export class ConversationRepository {
  private db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db || getDatabase();
  }

  createConversation(params: {
    title?: string;
    projectId?: string;
    mode?: AgentMode;
  }): Conversation {
    const now = Date.now();
    const conv: Conversation = {
      id: generateId('conv'),
      title: params.title || 'New Conversation',
      projectId: params.projectId,
      mode: params.mode || 'ASSIST',
      isArchived: false,
      createdAt: now,
      updatedAt: now
    };

    const stmt = this.db.prepare(`
      INSERT INTO conversations (id, title, summary, project_id, mode, is_archived, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      conv.id,
      conv.title,
      conv.summary || null,
      conv.projectId || null,
      conv.mode,
      conv.isArchived ? 1 : 0,
      conv.createdAt,
      conv.updatedAt
    );

    return conv;
  }

  getConversationById(id: string): Conversation | null {
    const row = this.db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.mapRow(row);
  }

  listConversations(options?: {
    projectId?: string;
    includeArchived?: boolean;
    limit?: number;
    search?: string;
  }): Conversation[] {
    let sql = 'SELECT * FROM conversations WHERE 1=1';
    const params: any[] = [];

    if (!options?.includeArchived) {
      sql += ' AND is_archived = 0';
    }

    if (options?.projectId) {
      sql += ' AND project_id = ?';
      params.push(options.projectId);
    }

    if (options?.search) {
      sql += ' AND (title LIKE ? OR summary LIKE ?)';
      params.push(`%${options.search}%`, `%${options.search}%`);
    }

    sql += ' ORDER BY updated_at DESC';

    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((r) => this.mapRow(r));
  }

  updateConversation(
    id: string,
    updates: Partial<Pick<Conversation, 'title' | 'summary' | 'projectId' | 'mode' | 'isArchived'>>
  ): Conversation | null {
    const current = this.getConversationById(id);
    if (!current) return null;

    const updated: Conversation = {
      ...current,
      ...updates,
      updatedAt: Date.now()
    };

    const stmt = this.db.prepare(`
      UPDATE conversations SET
        title = ?,
        summary = ?,
        project_id = ?,
        mode = ?,
        is_archived = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      updated.title,
      updated.summary || null,
      updated.projectId || null,
      updated.mode,
      updated.isArchived ? 1 : 0,
      updated.updatedAt,
      id
    );

    return updated;
  }

  deleteConversation(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM conversations WHERE id = ?');
    stmt.run(id);
    return true;
  }

  private mapRow(row: any): Conversation {
    return {
      id: row.id,
      title: row.title,
      summary: row.summary || undefined,
      projectId: row.project_id || undefined,
      mode: row.mode as AgentMode,
      isArchived: Boolean(row.is_archived),
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at)
    };
  }
}
