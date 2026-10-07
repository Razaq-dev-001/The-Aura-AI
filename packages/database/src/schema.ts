export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS user_settings (
  id TEXT PRIMARY KEY,
  default_provider TEXT NOT NULL DEFAULT 'ollama',
  default_model TEXT NOT NULL DEFAULT 'qwen2.5-coder:latest',
  ollama_base_url TEXT NOT NULL DEFAULT 'http://localhost:11434',
  openai_base_url TEXT DEFAULT 'https://api.openai.com/v1',
  gemini_api_key TEXT,
  openai_api_key TEXT,
  anthropic_api_key TEXT,
  openrouter_api_key TEXT,
  agent_mode TEXT NOT NULL DEFAULT 'ASSIST',
  auto_approve_safe_commands INTEGER NOT NULL DEFAULT 1,
  max_iterations INTEGER NOT NULL DEFAULT 15,
  command_timeout_ms INTEGER NOT NULL DEFAULT 60000,
  default_projects_dir TEXT NOT NULL DEFAULT './projects',
  memory_enabled INTEGER NOT NULL DEFAULT 1,
  theme TEXT NOT NULL DEFAULT 'dark',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  project_id TEXT,
  mode TEXT NOT NULL DEFAULT 'ASSIST',
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_project_id ON conversations(project_id);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tool_calls_json TEXT,
  attachments_json TEXT,
  tokens INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at ASC);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  description TEXT,
  stack_json TEXT NOT NULL DEFAULT '[]',
  framework TEXT,
  languages_json TEXT NOT NULL DEFAULT '[]',
  package_manager TEXT,
  entry_points_json TEXT NOT NULL DEFAULT '[]',
  permissions_json TEXT NOT NULL DEFAULT '{"readFiles":true,"modifyFiles":true,"runCommands":true}',
  file_count INTEGER NOT NULL DEFAULT 0,
  last_indexed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS project_files (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  path TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  line_count INTEGER NOT NULL DEFAULT 0,
  summary TEXT,
  last_modified INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_files_project ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_relpath ON project_files(project_id, relative_path);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  project_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  plan_json TEXT,
  current_step_index INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  completed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_tasks_conversation ON tasks(conversation_id);

CREATE TABLE IF NOT EXISTS task_steps (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  tool_name TEXT,
  tool_input_json TEXT,
  tool_output_json TEXT,
  error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_steps_task ON task_steps(task_id, step_number ASC);

CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  tags_json TEXT NOT NULL DEFAULT '[]',
  importance INTEGER NOT NULL DEFAULT 3,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memories_project ON memories(project_id);
CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);

CREATE TABLE IF NOT EXISTS tool_executions (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  conversation_id TEXT,
  tool_name TEXT NOT NULL,
  input_json TEXT NOT NULL,
  output_json TEXT,
  status TEXT NOT NULL,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tool_executions_task ON tool_executions(task_id);

CREATE TABLE IF NOT EXISTS file_diffs (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  project_id TEXT,
  file_path TEXT NOT NULL,
  original_content TEXT NOT NULL,
  modified_content TEXT NOT NULL,
  diff_patch TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_file_diffs_task ON file_diffs(task_id);
`;
