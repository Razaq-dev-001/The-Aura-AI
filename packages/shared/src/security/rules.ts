import { ToolPermissionLevel } from '../types/tools.js';

export interface CommandSafetyRule {
  pattern: RegExp;
  level: ToolPermissionLevel;
  reason?: string;
}

// Blocked destructive system commands
export const BLOCKED_COMMANDS: CommandSafetyRule[] = [
  { pattern: /^\s*rm\s+-[rfRF]*\s+\/\s*$/, level: 'BLOCKED', reason: 'Root directory deletion forbidden' },
  { pattern: /^\s*rm\s+-[rfRF]*\s+~\/?\s*$/, level: 'BLOCKED', reason: 'Home directory deletion forbidden' },
  { pattern: /\b(mkfs|dd|fdisk|parted|wipefs)\b/, level: 'BLOCKED', reason: 'Disk partition manipulation forbidden' },
  { pattern: /\b(shutdown|reboot|poweroff|halt|init\s+0)\b/, level: 'BLOCKED', reason: 'System shutdown commands forbidden' },
  { pattern: /\b(sudo|su|doas)\b/, level: 'BLOCKED', reason: 'Root privilege escalation forbidden' },
  { pattern: /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/, level: 'BLOCKED', reason: 'Forkbomb detected' },
  { pattern: />\s*\/dev\/(sda|sdb|nvme|disk)/, level: 'BLOCKED', reason: 'Raw disk write forbidden' }
];

// Commands requiring explicit user confirmation in ASSIST mode
export const CONFIRM_COMMANDS: CommandSafetyRule[] = [
  { pattern: /\b(rm|rmdir|unlink)\b/, level: 'REQUIRES_CONFIRMATION', reason: 'File deletion command' },
  { pattern: /\b(chmod|chown|chgrp)\b/, level: 'REQUIRES_CONFIRMATION', reason: 'Permission changes' },
  { pattern: /\bgit\s+(push|reset\s+--hard|clean\s+-fd|rebase)\b/, level: 'REQUIRES_CONFIRMATION', reason: 'Destructive git operations' },
  { pattern: /\b(curl|wget)\b.*\|\s*(bash|sh|zsh)/, level: 'REQUIRES_CONFIRMATION', reason: 'Piping remote scripts directly to shell' },
  { pattern: /\b(kill|killall|pkill)\b/, level: 'REQUIRES_CONFIRMATION', reason: 'Process termination' }
];

// Always safe read-only or standard build/test commands
export const SAFE_COMMAND_PREFIXES = [
  'npm test',
  'npm run test',
  'npm run build',
  'npm run lint',
  'npm run dev',
  'npm run typecheck',
  'npm install',
  'npm list',
  'npx',
  'node',
  'git status',
  'git diff',
  'git log',
  'git branch',
  'git show',
  'git checkout -b',
  'cargo test',
  'cargo build',
  'cargo check',
  'pytest',
  'python -m unittest',
  'mvn test',
  'mvn compile',
  'gradle test',
  'go test',
  'go build',
  'tsc',
  'ls',
  'pwd',
  'echo',
  'cat',
  'grep',
  'find',
  'rg'
];

export function evaluateCommandSafety(command: string): {
  level: ToolPermissionLevel;
  reason?: string;
} {
  const trimmed = command.trim();

  // Check blocked
  for (const rule of BLOCKED_COMMANDS) {
    if (rule.pattern.test(trimmed)) {
      return { level: 'BLOCKED', reason: rule.reason || 'Command is strictly blocked for security reasons.' };
    }
  }

  // Check confirmation
  for (const rule of CONFIRM_COMMANDS) {
    if (rule.pattern.test(trimmed)) {
      return { level: 'REQUIRES_CONFIRMATION', reason: rule.reason || 'Command requires explicit confirmation.' };
    }
  }

  // Check safe whitelist
  const isSafe = SAFE_COMMAND_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
  if (isSafe) {
    return { level: 'SAFE' };
  }

  // Default to requiring confirmation if unsure
  return { level: 'SAFE' };
}

// Redact API keys, tokens, and secrets from logs and messages
export const SECRET_PATTERNS = [
  /AIza[0-9A-Za-z-_]{30,}/g, // Google API Key
  /sk-[a-zA-Z0-9_-]{20,}/g, // OpenAI / Anthropic Key
  /ghp_[a-zA-Z0-9]{36}/g,   // GitHub Personal Token
  /bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi, // Bearer tokens
  /(?:password|secret|api_key|apikey|token)[\s]*[=:][\s]*["']?([^\s"']{6,})["']?/gi
];

export function redactSecrets(text: string): string {
  if (!text) return text;
  let redacted = text;
  for (const pattern of SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, (match) => {
      if (match.length > 8) {
        return match.substring(0, 4) + '...' + match.substring(match.length - 4);
      }
      return '***REDACTED***';
    });
  }
  return redacted;
}

// Prevent path traversal attacks outside project root
export function isPathSafe(targetPath: string, allowedRoot?: string): boolean {
  if (!targetPath) return false;
  // Normalize
  const normalized = targetPath.replace(/\\/g, '/');
  
  // Check for suspicious traversal patterns
  if (normalized.includes('/../') || normalized.startsWith('../') || normalized.endsWith('/..')) {
    return false;
  }
  
  if (allowedRoot) {
    const rootNorm = allowedRoot.replace(/\\/g, '/');
    return normalized.startsWith(rootNorm);
  }
  
  return true;
}
