import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';
import { ExecutableTool, computeDiff, applyPatch, isPathSafe } from '@aura/shared';
import { FileDiffRepository } from '@aura/database';
import { ProjectSearch } from '@aura/project';

function getDiffRepo() {
  return new FileDiffRepository();
}

function getProjectSearch() {
  return new ProjectSearch();
}

function resolveSafePath(filePath: string, rootDir?: string): string {
  const resolved = path.isAbsolute(filePath)
    ? path.normalize(filePath)
    : path.resolve(rootDir || process.cwd(), filePath);

  if (rootDir && !isPathSafe(resolved, rootDir)) {
    throw new Error(`Access denied: path ${filePath} is outside project root ${rootDir}`);
  }

  return resolved;
}

export const readFileTool: ExecutableTool = {
  name: 'read_file',
  description: 'Read the contents of a file from the project workspace. Optionally specify startLine and endLine.',
  permissionLevel: 'SAFE',
  category: 'file',
  parameters: z.object({
    filePath: z.string().describe('Relative or absolute path to the file to read'),
    startLine: z.number().int().positive().optional().describe('1-indexed starting line number'),
    endLine: z.number().int().positive().optional().describe('1-indexed ending line number')
  }),
  async execute(params, context) {
    const startTime = Date.now();
    try {
      const fullPath = resolveSafePath(params.filePath, context.projectPath);

      if (!fs.existsSync(fullPath)) {
        return {
          success: false,
          error: `File not found: ${params.filePath}`,
          durationMs: Date.now() - startTime
        };
      }

      const stats = fs.statSync(fullPath);
      if (stats.size > 5 * 1024 * 1024) {
        return {
          success: false,
          error: `File is too large (${(stats.size / 1024 / 1024).toFixed(1)}MB). Max size is 5MB.`,
          durationMs: Date.now() - startTime
        };
      }

      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split(/\r?\n/);
      const totalLines = lines.length;

      let resultLines = lines;
      let start = 1;
      let end = totalLines;

      if (params.startLine !== undefined || params.endLine !== undefined) {
        start = Math.max(1, params.startLine || 1);
        end = Math.min(totalLines, params.endLine || totalLines);
        resultLines = lines.slice(start - 1, end);
      }

      const numberedContent = resultLines
        .map((line, idx) => `${start + idx} | ${line}`)
        .join('\n');

      return {
        success: true,
        data: {
          filePath: params.filePath,
          totalLines,
          startLine: start,
          endLine: end,
          content: numberedContent,
          rawContent: resultLines.join('\n')
        },
        durationMs: Date.now() - startTime
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        durationMs: Date.now() - startTime
      };
    }
  }
};

export const editFileTool: ExecutableTool = {
  name: 'edit_file',
  description: 'Precise search-and-replace edit on an existing file. Computes and records diff automatically.',
  permissionLevel: 'REQUIRES_CONFIRMATION',
  category: 'file',
  parameters: z.object({
    filePath: z.string().describe('Path to the file to edit'),
    targetContent: z.string().describe('The exact contiguous block of text to be replaced'),
    replacementContent: z.string().describe('The new replacement content'),
    allowMultiple: z.boolean().optional().describe('Replace multiple occurrences if true. Default is false.')
  }),
  async execute(params, context) {
    const startTime = Date.now();
    try {
      const fullPath = resolveSafePath(params.filePath, context.projectPath);

      if (!fs.existsSync(fullPath)) {
        return {
          success: false,
          error: `File not found: ${params.filePath}`,
          durationMs: Date.now() - startTime
        };
      }

      const originalContent = fs.readFileSync(fullPath, 'utf8');
      const patchRes = applyPatch(
        originalContent,
        params.targetContent,
        params.replacementContent,
        params.allowMultiple
      );

      if (!patchRes.success) {
        return {
          success: false,
          error: patchRes.error || 'Failed to apply patch',
          durationMs: Date.now() - startTime
        };
      }

      fs.writeFileSync(fullPath, patchRes.newContent, 'utf8');

      const diff = computeDiff(params.filePath, originalContent, patchRes.newContent);

      const diffRepo = getDiffRepo();
      const recordedDiff = diffRepo.createDiff({
        taskId: context.taskId,
        projectId: context.projectId,
        filePath: params.filePath,
        originalContent,
        modifiedContent: patchRes.newContent,
        diffPatch: diff.unifiedDiff,
        status: 'APPLIED'
      });

      return {
        success: true,
        data: {
          filePath: params.filePath,
          replacementsCount: patchRes.count,
          diff: diff.unifiedDiff,
          diffId: recordedDiff.id,
          additions: diff.additions,
          deletions: diff.deletions
        },
        durationMs: Date.now() - startTime
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        durationMs: Date.now() - startTime
      };
    }
  }
};

export const writeFileTool: ExecutableTool = {
  name: 'write_file',
  description: 'Write entire content to a file. Overwrites if file exists, or creates parent directories if needed.',
  permissionLevel: 'REQUIRES_CONFIRMATION',
  category: 'file',
  parameters: z.object({
    filePath: z.string().describe('Path to the file to write'),
    content: z.string().describe('The complete file content to write')
  }),
  async execute(params, context) {
    const startTime = Date.now();
    try {
      const fullPath = resolveSafePath(params.filePath, context.projectPath);
      const dir = path.dirname(fullPath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      let originalContent = '';
      if (fs.existsSync(fullPath)) {
        originalContent = fs.readFileSync(fullPath, 'utf8');
      }

      fs.writeFileSync(fullPath, params.content, 'utf8');

      const diff = computeDiff(params.filePath, originalContent, params.content);

      const diffRepo = getDiffRepo();
      const recordedDiff = diffRepo.createDiff({
        taskId: context.taskId,
        projectId: context.projectId,
        filePath: params.filePath,
        originalContent,
        modifiedContent: params.content,
        diffPatch: diff.unifiedDiff,
        status: 'APPLIED'
      });

      return {
        success: true,
        data: {
          filePath: params.filePath,
          bytesWritten: Buffer.byteLength(params.content, 'utf8'),
          diffId: recordedDiff.id,
          additions: diff.additions,
          deletions: diff.deletions
        },
        durationMs: Date.now() - startTime
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        durationMs: Date.now() - startTime
      };
    }
  }
};

export const createFileTool: ExecutableTool = {
  name: 'create_file',
  description: 'Create a new file in the project. Fails if the file already exists.',
  permissionLevel: 'SAFE',
  category: 'file',
  parameters: z.object({
    filePath: z.string().describe('Path for the new file'),
    initialContent: z.string().optional().describe('Initial content for the file')
  }),
  async execute(params, context) {
    const startTime = Date.now();
    try {
      const fullPath = resolveSafePath(params.filePath, context.projectPath);

      if (fs.existsSync(fullPath)) {
        return {
          success: false,
          error: `File already exists at: ${params.filePath}`,
          durationMs: Date.now() - startTime
        };
      }

      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const content = params.initialContent || '';
      fs.writeFileSync(fullPath, content, 'utf8');

      return {
        success: true,
        data: {
          filePath: params.filePath,
          created: true
        },
        durationMs: Date.now() - startTime
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        durationMs: Date.now() - startTime
      };
    }
  }
};

export const deleteFileTool: ExecutableTool = {
  name: 'delete_file',
  description: 'Safely delete a file from the project.',
  permissionLevel: 'REQUIRES_CONFIRMATION',
  category: 'file',
  parameters: z.object({
    filePath: z.string().describe('Path to the file to delete')
  }),
  async execute(params, context) {
    const startTime = Date.now();
    try {
      const fullPath = resolveSafePath(params.filePath, context.projectPath);

      if (!fs.existsSync(fullPath)) {
        return {
          success: false,
          error: `File not found: ${params.filePath}`,
          durationMs: Date.now() - startTime
        };
      }

      fs.unlinkSync(fullPath);

      return {
        success: true,
        data: {
          filePath: params.filePath,
          deleted: true
        },
        durationMs: Date.now() - startTime
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        durationMs: Date.now() - startTime
      };
    }
  }
};

export const listDirectoryTool: ExecutableTool = {
  name: 'list_directory',
  description: 'List contents of a directory with file types and sizes.',
  permissionLevel: 'SAFE',
  category: 'file',
  parameters: z.object({
    dirPath: z.string().optional().describe('Directory path relative to project. Defaults to project root.')
  }),
  async execute(params, context) {
    const startTime = Date.now();
    try {
      const targetDir = resolveSafePath(params.dirPath || '.', context.projectPath);

      if (!fs.existsSync(targetDir)) {
        return {
          success: false,
          error: `Directory not found: ${params.dirPath || '.'}`,
          durationMs: Date.now() - startTime
        };
      }

      const entries = fs.readdirSync(targetDir, { withFileTypes: true });
      const items = entries.map((e) => {
        const itemPath = path.join(targetDir, e.name);
        let size = 0;
        if (e.isFile()) {
          try {
            size = fs.statSync(itemPath).size;
          } catch {}
        }
        return {
          name: e.name,
          isDirectory: e.isDirectory(),
          size
        };
      });

      return {
        success: true,
        data: {
          dirPath: params.dirPath || '.',
          items
        },
        durationMs: Date.now() - startTime
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        durationMs: Date.now() - startTime
      };
    }
  }
};

export const searchFilesTool: ExecutableTool = {
  name: 'search_files',
  description: 'Search for files by name pattern in the project.',
  permissionLevel: 'SAFE',
  category: 'file',
  parameters: z.object({
    pattern: z.string().describe('File name or extension pattern to find')
  }),
  async execute(params, context) {
    const startTime = Date.now();
    try {
      const projectDir = context.projectPath || process.cwd();
      const files = await getProjectSearch().searchFilesByName(projectDir, params.pattern);

      return {
        success: true,
        data: {
          pattern: params.pattern,
          matches: files,
          count: files.length
        },
        durationMs: Date.now() - startTime
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        durationMs: Date.now() - startTime
      };
    }
  }
};

export const searchContentTool: ExecutableTool = {
  name: 'search_content',
  description: 'Search for text or regex pattern across files in the project codebase using ripgrep.',
  permissionLevel: 'SAFE',
  category: 'file',
  parameters: z.object({
    query: z.string().describe('Text or regex string to search for'),
    isRegex: z.boolean().optional().describe('Treat query as regular expression'),
    caseSensitive: z.boolean().optional().describe('Case sensitive search'),
    filePattern: z.string().optional().describe('Optional file filter e.g. *.ts or src/**/*.tsx')
  }),
  async execute(params, context) {
    const startTime = Date.now();
    try {
      const projectDir = context.projectPath || process.cwd();
      const matches = await getProjectSearch().searchContent(projectDir, {
        query: params.query,
        isRegex: params.isRegex,
        caseSensitive: params.caseSensitive,
        filePattern: params.filePattern
      });

      return {
        success: true,
        data: {
          query: params.query,
          matches,
          totalMatches: matches.length
        },
        durationMs: Date.now() - startTime
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        durationMs: Date.now() - startTime
      };
    }
  }
};
