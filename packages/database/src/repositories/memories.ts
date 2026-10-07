import { DatabaseSync } from 'node:sqlite';
import { Memory, MemoryCategory, generateId } from '@aura/shared';
import { getDatabase } from '../db.js';

export class MemoryRepository {
  private db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db || getDatabase();
  }

  createMemory(params: {
    projectId?: string;
    category: MemoryCategory;
    content: string;
    tags?: string[];
    importance?: number;
  }): Memory {
    const now = Date.now();
    const memory: Memory = {
      id: generateId('mem'),
      projectId: params.projectId,
      category: params.category,
      content: params.content,
      tags: params.tags || [],
      importance: params.importance ?? 3,
      createdAt: now,
      updatedAt: now
    };

    const stmt = this.db.prepare(`
      INSERT INTO memories (id, project_id, category, content, tags_json, importance, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      memory.id,
      memory.projectId || null,
      memory.category,
      memory.content,
      JSON.stringify(memory.tags),
      memory.importance,
      memory.createdAt,
      memory.updatedAt
    );

    return memory;
  }

  getMemoryById(id: string): Memory | null {
    const row = this.db.prepare('SELECT * FROM memories WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.mapRow(row);
  }

  listMemories(options?: {
    projectId?: string;
    category?: MemoryCategory;
    search?: string;
    limit?: number;
  }): Memory[] {
    let sql = 'SELECT * FROM memories WHERE 1=1';
    const params: any[] = [];

    if (options?.projectId) {
      sql += ' AND (project_id = ? OR project_id IS NULL)';
      params.push(options.projectId);
    }

    if (options?.category) {
      sql += ' AND category = ?';
      params.push(options.category);
    }

    if (options?.search) {
      sql += ' AND (content LIKE ? OR tags_json LIKE ?)';
      params.push(`%${options.search}%`, `%${options.search}%`);
    }

    sql += ' ORDER BY importance DESC, updated_at DESC';

    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((r) => this.mapRow(r));
  }

  updateMemory(id: string, updates: Partial<Pick<Memory, 'content' | 'tags' | 'importance' | 'category'>>): Memory | null {
    const current = this.getMemoryById(id);
    if (!current) return null;

    const updated: Memory = {
      ...current,
      ...updates,
      updatedAt: Date.now()
    };

    const stmt = this.db.prepare(`
      UPDATE memories SET
        category = ?,
        content = ?,
        tags_json = ?,
        importance = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      updated.category,
      updated.content,
      JSON.stringify(updated.tags),
      updated.importance,
      updated.updatedAt,
      id
    );

    return updated;
  }

  deleteMemory(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM memories WHERE id = ?');
    stmt.run(id);
    return true;
  }

  clearAllMemories(projectId?: string): number {
    if (projectId) {
      const stmt = this.db.prepare('DELETE FROM memories WHERE project_id = ?');
      stmt.run(projectId);
    } else {
      this.db.exec('DELETE FROM memories');
    }
    return 1;
  }

  private mapRow(row: any): Memory {
    return {
      id: row.id,
      projectId: row.project_id || undefined,
      category: row.category as MemoryCategory,
      content: row.content,
      tags: JSON.parse(row.tags_json || '[]'),
      importance: Number(row.importance || 3),
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at)
    };
  }
}
