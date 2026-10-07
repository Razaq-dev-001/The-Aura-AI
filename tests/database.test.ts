import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getDatabase,
  closeDatabase,
  UserSettingsRepository,
  ConversationRepository,
  MessageRepository,
  ProjectRepository,
  TaskRepository,
  MemoryRepository,
  FileDiffRepository,
  ToolExecutionRepository
} from '../packages/database/src/index.js';

describe('Database & Repositories', () => {
  let db: any;

  beforeEach(() => {
    db = getDatabase(':memory:');
  });

  afterEach(() => {
    closeDatabase();
  });

  it('should initialize settings and return default values', () => {
    const settingsRepo = new UserSettingsRepository(db);
    const settings = settingsRepo.getSettings();

    expect(settings.defaultProvider).toBe('ollama');
    expect(settings.agentMode).toBe('ASSIST');
    expect(settings.maxIterations).toBe(15);
  });

  it('should update user settings cleanly', () => {
    const settingsRepo = new UserSettingsRepository(db);
    const updated = settingsRepo.updateSettings({
      defaultProvider: 'gemini',
      defaultModel: 'gemini-2.0-flash',
      agentMode: 'AUTONOMOUS'
    });

    expect(updated.defaultProvider).toBe('gemini');
    expect(updated.defaultModel).toBe('gemini-2.0-flash');
    expect(updated.agentMode).toBe('AUTONOMOUS');
  });

  it('should create and list conversations and messages', () => {
    const convRepo = new ConversationRepository(db);
    const msgRepo = new MessageRepository(db);

    const conv = convRepo.createConversation({
      title: 'Build LeaveFlow Feature',
      mode: 'AUTONOMOUS'
    });

    expect(conv.id).toBeDefined();
    expect(conv.title).toBe('Build LeaveFlow Feature');

    const msg = msgRepo.createMessage({
      conversationId: conv.id,
      role: 'user',
      content: 'Implement authentication flow'
    });

    expect(msg.id).toBeDefined();

    const messages = msgRepo.getMessagesByConversationId(conv.id);
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe('Implement authentication flow');
  });

  it('should manage persistent memories with categories', () => {
    const memRepo = new MemoryRepository(db);

    const mem = memRepo.createMemory({
      category: 'PROJECT_CONTEXT',
      content: 'Leave calculation logic must remain unchanged in v2',
      tags: ['rules', 'leave-calc'],
      importance: 5
    });

    expect(mem.id).toBeDefined();

    const list = memRepo.listMemories({ search: 'Leave calculation' });
    expect(list).toHaveLength(1);
    expect(list[0].category).toBe('PROJECT_CONTEXT');
  });

  it('should track file diffs and update status', () => {
    const diffRepo = new FileDiffRepository(db);

    const diff = diffRepo.createDiff({
      filePath: 'src/auth/AuthContext.tsx',
      originalContent: 'const auth = null;',
      modifiedContent: 'const auth = useFirebaseAuth();',
      diffPatch: '--- a/src/auth/AuthContext.tsx\n+++ b/src/auth/AuthContext.tsx\n-const auth = null;\n+const auth = useFirebaseAuth();'
    });

    expect(diff.id).toBeDefined();
    expect(diff.status).toBe('PENDING');

    diffRepo.updateDiffStatus(diff.id, 'APPLIED');
    const updated = diffRepo.getDiffById(diff.id);
    expect(updated?.status).toBe('APPLIED');
  });
});
