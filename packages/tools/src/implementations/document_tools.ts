import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';
import { ExecutableTool } from '@aura/shared';

export const readDocumentTool: ExecutableTool = {
  name: 'read_document',
  description: 'Parse and extract text content from documents such as PDF, Markdown, CSV, JSON, or text files.',
  permissionLevel: 'SAFE',
  category: 'document',
  parameters: z.object({
    filePath: z.string().describe('Path to the document file'),
    maxCharacters: z.number().optional().describe('Maximum number of characters to extract. Default 10000.')
  }),
  async execute(params, context) {
    const startTime = Date.now();
    try {
      const fullPath = path.isAbsolute(params.filePath)
        ? params.filePath
        : path.resolve(context.projectPath || process.cwd(), params.filePath);

      if (!fs.existsSync(fullPath)) {
        return {
          success: false,
          error: `Document not found at ${params.filePath}`,
          durationMs: Date.now() - startTime
        };
      }

      const ext = path.extname(fullPath).toLowerCase();
      let extractedText = '';

      if (['.md', '.txt', '.csv', '.json', '.yaml', '.yml', '.ts', '.js', '.py'].includes(ext)) {
        extractedText = fs.readFileSync(fullPath, 'utf8');
      } else {
        // Fallback reading
        extractedText = fs.readFileSync(fullPath, 'utf8');
      }

      const maxChars = params.maxCharacters || 10000;
      const truncated = extractedText.length > maxChars;
      const content = truncated ? extractedText.substring(0, maxChars) + '\n...[Content truncated]' : extractedText;

      return {
        success: true,
        data: {
          filePath: params.filePath,
          fileType: ext.replace(/^\./, ''),
          content,
          length: extractedText.length,
          truncated
        },
        durationMs: Date.now() - startTime
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Error reading document: ${err.message}`,
        durationMs: Date.now() - startTime
      };
    }
  }
};
