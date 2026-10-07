import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { CREATE_TABLES_SQL } from './schema.js';

let dbInstance: DatabaseSync | null = null;

export function getDatabase(dbPath?: string, forceNew = false): DatabaseSync {
  if (dbInstance && !forceNew && !dbPath) {
    return dbInstance;
  }

  const resolvedPath =
    dbPath ||
    process.env.DATABASE_PATH ||
    path.resolve(process.cwd(), 'data', 'aura.db');

  if (resolvedPath !== ':memory:') {
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const instance = new DatabaseSync(resolvedPath);

  if (resolvedPath !== ':memory:') {
    try {
      instance.exec('PRAGMA journal_mode = WAL;');
    } catch {}
  }
  instance.exec('PRAGMA foreign_keys = ON;');

  // Run schema migration
  instance.exec(CREATE_TABLES_SQL);

  // Safe migrations for newly added columns
  try {
    instance.exec("ALTER TABLE user_settings ADD COLUMN openai_base_url TEXT DEFAULT 'https://api.openai.com/v1';");
  } catch {}
  try {
    instance.exec("ALTER TABLE user_settings ADD COLUMN openrouter_api_key TEXT;");
  } catch {}

  // Seed default settings if empty
  seedDefaultSettings(instance);

  if (!dbPath || dbPath === process.env.DATABASE_PATH) {
    dbInstance = instance;
  }

  return instance;
}

function seedDefaultSettings(db: DatabaseSync): void {
  try {
    const row = db.prepare('SELECT id FROM user_settings LIMIT 1').get();
    if (!row) {
      const now = Date.now();
      const insert = db.prepare(`
        INSERT INTO user_settings (
          id, default_provider, default_model, ollama_base_url,
          agent_mode, auto_approve_safe_commands, max_iterations,
          command_timeout_ms, default_projects_dir, memory_enabled,
          theme, created_at, updated_at
        ) VALUES (
          'default', 'ollama', 'qwen2.5-coder:latest', 'http://localhost:11434',
          'ASSIST', 1, 15, 60000, './projects', 1, 'dark', ?, ?
        )
      `);
      insert.run(now, now);
    }
  } catch {}
}

export function closeDatabase(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {}
    dbInstance = null;
  }
}
