import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getDatabase, closeDatabase } from '../packages/database/src/index.js';
import { globalToolRegistry } from '../packages/tools/src/index.js';

describe('Tool Registry & Implementations', () => {
  const testDir = path.resolve(process.cwd(), 'data', 'test_sandbox');

  beforeEach(() => {
    getDatabase(':memory:');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    closeDatabase();
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should list all registered tools with Zod parameter schemas', () => {
    const tools = globalToolRegistry.list();
    expect(tools.length).toBeGreaterThanOrEqual(10);

    const schemas = globalToolRegistry.getSchemas();
    expect(schemas.some((s) => s.function.name === 'read_file')).toBe(true);
    expect(schemas.some((s) => s.function.name === 'edit_file')).toBe(true);
    expect(schemas.some((s) => s.function.name === 'run_command')).toBe(true);
  });

  it('should create and read files using file tools', async () => {
    const filePath = path.join(testDir, 'sample.ts');

    const createRes = await globalToolRegistry.execute(
      'create_file',
      { filePath, initialContent: 'export const value = 42;\nexport const name = "AURA";' },
      { projectPath: testDir }
    );
    expect(createRes.success).toBe(true);

    const readRes = await globalToolRegistry.execute(
      'read_file',
      { filePath },
      { projectPath: testDir }
    );
    expect(readRes.success).toBe(true);
    expect((readRes.data as any).rawContent).toContain('export const value = 42;');
  });

  it('should edit files and compute diff patches accurately', async () => {
    const filePath = path.join(testDir, 'config.ts');
    fs.writeFileSync(filePath, 'const DEBUG = false;', 'utf8');

    const editRes = await globalToolRegistry.execute(
      'edit_file',
      {
        filePath,
        targetContent: 'const DEBUG = false;',
        replacementContent: 'const DEBUG = true;'
      },
      { projectPath: testDir }
    );

    expect(editRes.success).toBe(true);
    expect((editRes.data as any).diff).toContain('+const DEBUG = true;');

    const updated = fs.readFileSync(filePath, 'utf8');
    expect(updated).toBe('const DEBUG = true;');
  });

  it('should execute safe shell commands', async () => {
    const cmdRes = await globalToolRegistry.execute(
      'run_command',
      { command: 'echo "AURA SYSTEM ACTIVE"' },
      { projectPath: testDir }
    );

    expect(cmdRes.success).toBe(true);
    expect((cmdRes.data as any).stdout).toContain('AURA SYSTEM ACTIVE');
  });

  it('should save and retrieve memories via tools', async () => {
    const saveRes = await globalToolRegistry.execute(
      'save_memory',
      {
        category: 'USER_PREFERENCE',
        content: 'User prefers dark mode and TypeScript',
        tags: ['prefs', 'ts']
      },
      {}
    );
    expect(saveRes.success).toBe(true);

    const getRes = await globalToolRegistry.execute(
      'retrieve_memory',
      { query: 'TypeScript' },
      {}
    );
    expect(getRes.success).toBe(true);
    expect((getRes.data as any).count).toBeGreaterThanOrEqual(1);
  });
});
