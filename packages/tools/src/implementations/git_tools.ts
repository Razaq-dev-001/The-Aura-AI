import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { z } from 'zod';
import { ExecutableTool } from '@aura/shared';

const execAsync = promisify(exec);

export const gitStatusTool: ExecutableTool = {
  name: 'git_status',
  description: 'Inspect the git status of the project, including modified, staged, and untracked files.',
  permissionLevel: 'SAFE',
  category: 'git',
  parameters: z.object({}),
  async execute(_params, context) {
    const startTime = Date.now();
    try {
      const cwd = context.projectPath || process.cwd();
      const { stdout } = await execAsync('git status --porcelain=v1 -b', { cwd });

      const lines = stdout.split('\n').filter(Boolean);
      const branchLine = lines[0] || '';
      const changedLines = lines.slice(1);

      const modifiedFiles = changedLines.map((line) => ({
        status: line.substring(0, 2).trim(),
        file: line.substring(3).trim()
      }));

      return {
        success: true,
        data: {
          branch: branchLine.replace(/^##\s*/, ''),
          hasChanges: modifiedFiles.length > 0,
          modifiedFiles,
          rawOutput: stdout
        },
        durationMs: Date.now() - startTime
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Git status error: ${err.message}`,
        durationMs: Date.now() - startTime
      };
    }
  }
};

export const gitDiffTool: ExecutableTool = {
  name: 'git_diff',
  description: 'View git diff of uncommitted changes in the project workspace.',
  permissionLevel: 'SAFE',
  category: 'git',
  parameters: z.object({
    filePath: z.string().optional().describe('Optional specific file to view diff for')
  }),
  async execute(params, context) {
    const startTime = Date.now();
    try {
      const cwd = context.projectPath || process.cwd();
      const target = params.filePath ? ` "${params.filePath}"` : '';
      const { stdout } = await execAsync(`git diff${target}`, { cwd });

      return {
        success: true,
        data: {
          diff: stdout || 'No changes detected.'
        },
        durationMs: Date.now() - startTime
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Git diff error: ${err.message}`,
        durationMs: Date.now() - startTime
      };
    }
  }
};

export const gitLogTool: ExecutableTool = {
  name: 'git_log',
  description: 'Inspect recent git commit history.',
  permissionLevel: 'SAFE',
  category: 'git',
  parameters: z.object({
    maxCount: z.number().optional().describe('Number of commits to return. Default is 5.')
  }),
  async execute(params, context) {
    const startTime = Date.now();
    try {
      const cwd = context.projectPath || process.cwd();
      const count = params.maxCount || 5;
      const { stdout } = await execAsync(`git log -n ${count} --pretty=format:"%h - %an, %ar : %s"`, { cwd });

      return {
        success: true,
        data: {
          commits: stdout.split('\n').filter(Boolean)
        },
        durationMs: Date.now() - startTime
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Git log error: ${err.message}`,
        durationMs: Date.now() - startTime
      };
    }
  }
};

export const gitCommitTool: ExecutableTool = {
  name: 'git_commit',
  description: 'Stage modified files and create a git commit with a message.',
  permissionLevel: 'REQUIRES_CONFIRMATION',
  category: 'git',
  parameters: z.object({
    message: z.string().describe('Commit message'),
    files: z.array(z.string()).optional().describe('Files to stage, or stage all modified files if omitted')
  }),
  async execute(params, context) {
    const startTime = Date.now();
    try {
      const cwd = context.projectPath || process.cwd();
      if (params.files && params.files.length > 0) {
        const fileArgs = params.files.map((f: string) => `"${f}"`).join(' ');
        await execAsync(`git add ${fileArgs}`, { cwd });
      } else {
        await execAsync('git add -A', { cwd });
      }

      const escapedMessage = params.message.replace(/"/g, '\\"');
      const { stdout } = await execAsync(`git commit -m "${escapedMessage}"`, { cwd });

      return {
        success: true,
        data: {
          message: params.message,
          output: stdout
        },
        durationMs: Date.now() - startTime
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Git commit error: ${err.message}`,
        durationMs: Date.now() - startTime
      };
    }
  }
};
