import { DatabaseSync } from 'node:sqlite';
import { Message, generateId } from '@aura/shared';
import { getDatabase } from '../db.js';

export class MessageRepository {
  private db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db || getDatabase();
  }

  createMessage(params: {
    conversationId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    toolCalls?: any[];
    attachments?: any[];
    tokens?: number;
  }): Message {
    const now = Date.now();
    const msg: Message = {
      id: generateId('msg'),
      conversationId: params.conversationId,
      role: params.role,
      content: params.content,
      toolCalls: params.toolCalls,
      attachments: params.attachments,
      tokens: params.tokens || 0,
      createdAt: now
    };

    const stmt = this.db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, tool_calls_json, attachments_json, tokens, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      msg.id,
      msg.conversationId,
      msg.role,
      msg.content,
      msg.toolCalls ? JSON.stringify(msg.toolCalls) : null,
      msg.attachments ? JSON.stringify(msg.attachments) : null,
      msg.tokens || 0,
      msg.createdAt
    );

    // Update parent conversation updated_at
    const updateConv = this.db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?');
    updateConv.run(now, msg.conversationId);

    return msg;
  }

  getMessagesByConversationId(conversationId: string, limit?: number): Message[] {
    let sql = 'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC';
    const params: any[] = [conversationId];

    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);
    }

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((r) => this.mapRow(r));
  }

  updateMessageContent(id: string, content: string, toolCalls?: any[], tokens?: number): boolean {
    const stmt = this.db.prepare(`
      UPDATE messages SET
        content = ?,
        tool_calls_json = COALESCE(?, tool_calls_json),
        tokens = COALESCE(?, tokens)
      WHERE id = ?
    `);

    stmt.run(
      content,
      toolCalls ? JSON.stringify(toolCalls) : null,
      tokens || null,
      id
    );
    return true;
  }

  deleteMessage(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM messages WHERE id = ?');
    stmt.run(id);
    return true;
  }

  private mapRow(row: any): Message {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      role: row.role as 'user' | 'assistant' | 'system',
      content: row.content,
      toolCalls: row.tool_calls_json ? JSON.parse(row.tool_calls_json) : undefined,
      attachments: row.attachments_json ? JSON.parse(row.attachments_json) : undefined,
      tokens: Number(row.tokens || 0),
      createdAt: Number(row.created_at)
    };
  }
}
