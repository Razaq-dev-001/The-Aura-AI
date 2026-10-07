import { describe, it, expect } from 'vitest';
import {
  evaluateCommandSafety,
  redactSecrets,
  isPathSafe,
  computeDiff,
  applyPatch
} from '../packages/shared/src/index.js';

describe('Security & Rules', () => {
  it('should block destructive system commands', () => {
    expect(evaluateCommandSafety('rm -rf /').level).toBe('BLOCKED');
    expect(evaluateCommandSafety('sudo rm -rf /etc').level).toBe('BLOCKED');
    expect(evaluateCommandSafety('mkfs.ext4 /dev/sda1').level).toBe('BLOCKED');
    expect(evaluateCommandSafety(':(){ :|:& };:').level).toBe('BLOCKED');
  });

  it('should require confirmation for risky commands', () => {
    expect(evaluateCommandSafety('rm -rf ./temp_cache').level).toBe('REQUIRES_CONFIRMATION');
    expect(evaluateCommandSafety('git push origin main').level).toBe('REQUIRES_CONFIRMATION');
    expect(evaluateCommandSafety('chmod +x ./script.sh').level).toBe('REQUIRES_CONFIRMATION');
  });

  it('should allow safe build, test, and git status commands', () => {
    expect(evaluateCommandSafety('npm test').level).toBe('SAFE');
    expect(evaluateCommandSafety('npm run build').level).toBe('SAFE');
    expect(evaluateCommandSafety('git status').level).toBe('SAFE');
    expect(evaluateCommandSafety('git diff').level).toBe('SAFE');
  });

  it('should redact sensitive API keys and tokens', () => {
    const text = 'Connected with OpenAI key sk-1234567890abcdef1234567890abcdef and Gemini AIzaSyD9876543210ZYXWVUTSRQPONMLKJIHG';
    const redacted = redactSecrets(text);

    expect(redacted).not.toContain('sk-1234567890abcdef1234567890abcdef');
    expect(redacted).not.toContain('AIzaSyD9876543210ZYXWVUTSRQPONMLKJIHG');
    expect(redacted).toContain('...');
  });

  it('should detect and prevent path traversal attempts', () => {
    expect(isPathSafe('../../etc/passwd', '/app/project')).toBe(false);
    expect(isPathSafe('/app/project/src/index.ts', '/app/project')).toBe(true);
  });
});

describe('Diff & Patch Engine', () => {
  it('should compute accurate line-by-line diffs', () => {
    const orig = 'function login() {\n  return false;\n}';
    const modified = 'function login() {\n  return true;\n}';

    const diff = computeDiff('src/auth.ts', orig, modified);
    expect(diff.additions).toBe(1);
    expect(diff.deletions).toBe(1);
    expect(diff.unifiedDiff).toContain('-  return false;');
    expect(diff.unifiedDiff).toContain('+  return true;');
  });

  it('should apply search-and-replace patches cleanly', () => {
    const orig = 'const port = 3000;\nconst host = "localhost";';
    const patch = applyPatch(orig, 'const port = 3000;', 'const port = 8080;');

    expect(patch.success).toBe(true);
    expect(patch.newContent).toContain('const port = 8080;');
  });
});
