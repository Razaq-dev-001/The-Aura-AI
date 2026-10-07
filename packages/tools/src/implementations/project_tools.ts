import * as fs from 'node:fs';
import { z } from 'zod';
import { ExecutableTool } from '@aura/shared';
import { ProjectIndexer, extractCodeOutline } from '@aura/project';

const indexer = new ProjectIndexer();

export const inspectProjectTool: ExecutableTool = {
  name: 'inspect_project',
  description: 'Inspect the full architecture, framework, dependencies, entry points, and file structure of the current project.',
  permissionLevel: 'SAFE',
  category: 'project',
  parameters: z.object({
    projectPath: z.string().optional().describe('Project directory path. Defaults to active project.')
  }),
  async execute(params, context) {
    const startTime = Date.now();
    try {
      const targetPath = params.projectPath || context.projectPath || process.cwd();
      const summary = await indexer.indexProject(targetPath);

      return {
        success: true,
        data: {
          name: summary.name,
          path: summary.path,
          framework: summary.detected.framework,
          stack: summary.detected.stack,
          languages: summary.detected.languages,
          packageManager: summary.detected.packageManager,
          entryPoints: summary.detected.entryPoints,
          totalFiles: summary.files.length,
          scripts: summary.detected.scripts,
          dependencies: Object.keys(summary.detected.dependencies).slice(0, 30),
          fileTreePreview: summary.treeString
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

export const getFileOutlineTool: ExecutableTool = {
  name: 'get_file_outline',
  description: 'Extract functions, classes, interfaces, and exported symbols from a source file.',
  permissionLevel: 'SAFE',
  category: 'project',
  parameters: z.object({
    filePath: z.string().describe('File path in the project')
  }),
  async execute(params, context) {
    const startTime = Date.now();
    try {
      const fullPath = params.filePath;
      if (!fs.existsSync(fullPath)) {
        return {
          success: false,
          error: `File not found: ${params.filePath}`,
          durationMs: Date.now() - startTime
        };
      }

      const content = fs.readFileSync(fullPath, 'utf8');
      const symbols = extractCodeOutline(content, 'ts');

      return {
        success: true,
        data: {
          filePath: params.filePath,
          symbols,
          totalSymbols: symbols.length
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
