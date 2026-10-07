import { Router, Request, Response } from 'express';
import { globalToolRegistry } from '@aura/tools';

export const toolsRouter = Router();

toolsRouter.get('/', (_req: Request, res: Response) => {
  const tools = globalToolRegistry.list().map((t) => ({
    name: t.name,
    description: t.description,
    permissionLevel: t.permissionLevel,
    category: t.category
  }));
  res.json({ tools });
});

toolsRouter.post('/execute', async (req: Request, res: Response) => {
  const { toolName, args, context } = req.body;
  if (!toolName) {
    res.status(400).json({ error: 'toolName is required' });
    return;
  }

  const result = await globalToolRegistry.execute(toolName, args || {}, context || {});
  res.json(result);
});
