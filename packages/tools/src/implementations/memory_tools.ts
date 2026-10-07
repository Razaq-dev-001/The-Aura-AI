import { z } from 'zod';
import { ExecutableTool, MemoryCategory } from '@aura/shared';
import { MemoryRepository } from '@aura/database';

export const saveMemoryTool: ExecutableTool = {
  name: 'save_memory',
  description: 'Save important user preferences, project architectural decisions, or technical context to persistent memory.',
  permissionLevel: 'SAFE',
  category: 'memory',
  parameters: z.object({
    category: z.enum([
      'USER_PREFERENCE',
      'PROJECT_CONTEXT',
      'IMPORTANT_DECISION',
      'WORKFLOW',
      'FACT',
      'CONVERSATION_SUMMARY'
    ]),
    content: z.string().describe('The knowledge or rule to remember'),
    tags: z.array(z.string()).optional().describe('Tags for categorization'),
    importance: z.number().min(1).max(5).optional().describe('Importance from 1 (low) to 5 (critical)')
  }),
  async execute(params, context) {
    const startTime = Date.now();
    try {
      const memoryRepo = new MemoryRepository();
      const mem = memoryRepo.createMemory({
        projectId: context.projectId,
        category: params.category as MemoryCategory,
        content: params.content,
        tags: params.tags,
        importance: params.importance
      });

      return {
        success: true,
        data: {
          id: mem.id,
          category: mem.category,
          content: mem.content,
          saved: true
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

export const retrieveMemoryTool: ExecutableTool = {
  name: 'retrieve_memory',
  description: 'Search persistent memory for user preferences, project context, or past decisions.',
  permissionLevel: 'SAFE',
  category: 'memory',
  parameters: z.object({
    query: z.string().optional().describe('Search query for memory matching'),
    category: z.enum([
      'USER_PREFERENCE',
      'PROJECT_CONTEXT',
      'IMPORTANT_DECISION',
      'WORKFLOW',
      'FACT',
      'CONVERSATION_SUMMARY'
    ]).optional()
  }),
  async execute(params, context) {
    const startTime = Date.now();
    try {
      const memoryRepo = new MemoryRepository();
      const memories = memoryRepo.listMemories({
        projectId: context.projectId,
        category: params.category as MemoryCategory | undefined,
        search: params.query,
        limit: 10
      });

      return {
        success: true,
        data: {
          memories,
          count: memories.length
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
