import { spawn } from 'node:child_process';
import { z } from 'zod';
import { ExecutableTool, evaluateCommandSafety, redactSecrets } from '@aura/shared';

export const runCommandTool: ExecutableTool = {
  name: 'run_command',
  description: 'Execute a terminal command (e.g. npm test, npm run build, git status) in the project root safely.',
  permissionLevel: 'REQUIRES_CONFIRMATION', // Dynamic based on evaluateCommandSafety
  category: 'terminal',
  parameters: z.object({
    command: z.string().describe('The shell command to execute'),
    timeoutMs: z.number().optional().describe('Execution timeout in milliseconds. Default 60000ms.')
  }),
  async execute(params, context) {
    const startTime = Date.now();
    const safety = evaluateCommandSafety(params.command);

    if (safety.level === 'BLOCKED') {
      return {
        success: false,
        error: `Command blocked for security: ${safety.reason}`,
        durationMs: Date.now() - startTime
      };
    }

    const cwd = context.projectPath || process.cwd();
    const timeoutMs = params.timeoutMs || 60000;

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      // Sanitize environment variables to prevent secret leakage
      const env = { ...process.env };
      delete env.GEMINI_API_KEY;
      delete env.OPENAI_API_KEY;
      delete env.ANTHROPIC_API_KEY;

      const proc = spawn(params.command, {
        cwd,
        shell: true,
        env
      });

      const timer = setTimeout(() => {
        timedOut = true;
        proc.kill('SIGTERM');
        setTimeout(() => proc.kill('SIGKILL'), 2000);
      }, timeoutMs);

      if (context.abortSignal) {
        context.abortSignal.addEventListener('abort', () => {
          proc.kill('SIGTERM');
        });
      }

      proc.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        if (stdout.length > 200000) {
          stdout = stdout.substring(0, 200000) + '\n...[Output truncated]';
          proc.kill('SIGTERM');
        }
        if (context.onProgress) {
          context.onProgress({ message: text });
        }
      });

      proc.stderr.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        if (stderr.length > 200000) {
          stderr = stderr.substring(0, 200000) + '\n...[Error output truncated]';
        }
        if (context.onProgress) {
          context.onProgress({ message: text });
        }
      });

      proc.on('close', (code) => {
        clearTimeout(timer);
        const durationMs = Date.now() - startTime;

        if (timedOut) {
          resolve({
            success: false,
            error: `Command timed out after ${timeoutMs}ms`,
            durationMs,
            data: {
              command: params.command,
              stdout: redactSecrets(stdout),
              stderr: redactSecrets(stderr),
              exitCode: -1
            }
          });
          return;
        }

        const isSuccess = code === 0;
        resolve({
          success: isSuccess,
          error: isSuccess ? undefined : `Command exited with code ${code}`,
          durationMs,
          data: {
            command: params.command,
            stdout: redactSecrets(stdout),
            stderr: redactSecrets(stderr),
            exitCode: code
          }
        });
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          success: false,
          error: `Failed to spawn command: ${err.message}`,
          durationMs: Date.now() - startTime
        });
      });
    });
  }
};
