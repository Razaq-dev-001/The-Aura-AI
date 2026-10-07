import { Router, Request, Response } from 'express';
import * as os from 'node:os';
import { ToolExecutionRepository, ProjectRepository, ConversationRepository, MemoryRepository } from '@aura/database';
import { globalProviderRegistry } from '@aura/ai';

export const diagnosticsRouter = Router();
const toolExecRepo = new ToolExecutionRepository();
const projRepo = new ProjectRepository();
const convRepo = new ConversationRepository();
const memRepo = new MemoryRepository();

diagnosticsRouter.get('/', async (_req: Request, res: Response) => {
  const toolStats = toolExecRepo.getStats();
  const recentExecutions = toolExecRepo.listExecutions({ limit: 10 });
  const providerHealth = await globalProviderRegistry.getAllHealth();
  const projects = projRepo.listProjects();
  const conversations = convRepo.listConversations();
  const memories = memRepo.listMemories();

  const memUsage = process.memoryUsage();

  res.json({
    system: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      cpus: os.cpus().length,
      totalMemoryMb: Math.round(os.totalmem() / 1024 / 1024),
      freeMemoryMb: Math.round(os.freemem() / 1024 / 1024),
      processMemoryMb: Math.round(memUsage.rss / 1024 / 1024),
      uptimeSeconds: Math.round(process.uptime())
    },
    database: {
      projectsCount: projects.length,
      conversationsCount: conversations.length,
      memoriesCount: memories.length,
      toolExecutionsCount: toolStats.totalCount
    },
    tools: {
      totalExecuted: toolStats.totalCount,
      successful: toolStats.successCount,
      errors: toolStats.errorCount,
      avgDurationMs: toolStats.avgDurationMs,
      recent: recentExecutions
    },
    providers: providerHealth
  });
});
