import { DatabaseSync } from 'node:sqlite';
import { UserSettings, AgentMode } from '@aura/shared';
import { getDatabase } from '../db.js';

export class UserSettingsRepository {
  private db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db || getDatabase();
  }

  getSettings(): UserSettings {
    const row = this.db.prepare('SELECT * FROM user_settings WHERE id = ?').get('default') as any;
    if (!row) {
      throw new Error('UserSettings not initialized');
    }
    return this.mapRowToSettings(row);
  }

  updateSettings(partial: Partial<Omit<UserSettings, 'id' | 'createdAt' | 'updatedAt'>>): UserSettings {
    const current = this.getSettings();
    const updated: UserSettings = {
      ...current,
      ...partial,
      updatedAt: Date.now()
    };

    const stmt = this.db.prepare(`
      UPDATE user_settings SET
        default_provider = ?,
        default_model = ?,
        ollama_base_url = ?,
        openai_base_url = ?,
        gemini_api_key = ?,
        openai_api_key = ?,
        anthropic_api_key = ?,
        openrouter_api_key = ?,
        agent_mode = ?,
        auto_approve_safe_commands = ?,
        max_iterations = ?,
        command_timeout_ms = ?,
        default_projects_dir = ?,
        memory_enabled = ?,
        theme = ?,
        updated_at = ?
      WHERE id = 'default'
    `);

    stmt.run(
      updated.defaultProvider,
      updated.defaultModel,
      updated.ollamaBaseUrl,
      updated.openaiBaseUrl || 'https://api.openai.com/v1',
      updated.geminiApiKey || null,
      updated.openaiApiKey || null,
      updated.anthropicApiKey || null,
      updated.openrouterApiKey || null,
      updated.agentMode,
      updated.autoApproveSafeCommands ? 1 : 0,
      updated.maxIterations,
      updated.commandTimeoutMs,
      updated.defaultProjectsDir,
      updated.memoryEnabled ? 1 : 0,
      updated.theme,
      updated.updatedAt
    );

    return updated;
  }

  private mapRowToSettings(row: any): UserSettings {
    return {
      id: row.id,
      defaultProvider: row.default_provider,
      defaultModel: row.default_model,
      ollamaBaseUrl: row.ollama_base_url,
      openaiBaseUrl: row.openai_base_url || 'https://api.openai.com/v1',
      geminiApiKey: row.gemini_api_key || undefined,
      openaiApiKey: row.openai_api_key || undefined,
      anthropicApiKey: row.anthropic_api_key || undefined,
      openrouterApiKey: row.openrouter_api_key || undefined,
      agentMode: row.agent_mode as AgentMode,
      autoApproveSafeCommands: Boolean(row.auto_approve_safe_commands),
      maxIterations: Number(row.max_iterations),
      commandTimeoutMs: Number(row.command_timeout_ms),
      defaultProjectsDir: row.default_projects_dir,
      memoryEnabled: Boolean(row.memory_enabled),
      theme: row.theme,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at)
    };
  }
}
