import { Router, Request, Response } from 'express';
import { MemoryRepository } from '@aura/database';

export const memoryRouter = Router();
const memoryRepo = new MemoryRepository();

memoryRouter.get('/', (req: Request, res: Response) => {
  const { projectId, category, search } = req.query;
  const memories = memoryRepo.listMemories({
    projectId: projectId as string | undefined,
    category: category as any,
    search: search as string | undefined
  });
  res.json({ memories });
});

memoryRouter.post('/', (req: Request, res: Response) => {
  const { projectId, category, content, tags, importance } = req.body;
  if (!category || !content) {
    res.status(400).json({ error: 'Category and content are required' });
    return;
  }
  const memory = memoryRepo.createMemory({
    projectId,
    category,
    content,
    tags,
    importance
  });
  res.status(201).json({ memory });
});

memoryRouter.delete('/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;
  memoryRepo.deleteMemory(id);
  res.json({ success: true });
});

memoryRouter.delete('/', (req: Request, res: Response) => {
  const { projectId } = req.query;
  memoryRepo.clearAllMemories(projectId as string | undefined);
  res.json({ success: true, message: 'Memories cleared' });
});
