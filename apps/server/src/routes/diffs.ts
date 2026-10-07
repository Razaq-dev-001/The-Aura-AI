import { Router, Request, Response } from 'express';
import * as fs from 'node:fs';
import { FileDiffRepository } from '@aura/database';

export const diffsRouter = Router();
const diffRepo = new FileDiffRepository();

diffsRouter.get('/', (req: Request, res: Response) => {
  const { taskId, projectId } = req.query;
  if (taskId) {
    const diffs = diffRepo.listDiffsByTaskId(taskId as string);
    res.json({ diffs });
    return;
  }
  if (projectId) {
    const diffs = diffRepo.listDiffsByProjectId(projectId as string);
    res.json({ diffs });
    return;
  }
  res.json({ diffs: [] });
});

diffsRouter.get('/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const diff = diffRepo.getDiffById(id);
  if (!diff) {
    res.status(404).json({ error: 'Diff not found' });
    return;
  }
  res.json({ diff });
});

diffsRouter.post('/:id/apply', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const diff = diffRepo.getDiffById(id);
  if (!diff) {
    res.status(404).json({ error: 'Diff not found' });
    return;
  }
  try {
    fs.writeFileSync(diff.filePath, diff.modifiedContent, 'utf8');
    diffRepo.updateDiffStatus(diff.id, 'APPLIED');
    res.json({ success: true, status: 'APPLIED' });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to apply diff: ${err.message}` });
  }
});

diffsRouter.post('/:id/revert', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const diff = diffRepo.getDiffById(id);
  if (!diff) {
    res.status(404).json({ error: 'Diff not found' });
    return;
  }
  try {
    fs.writeFileSync(diff.filePath, diff.originalContent, 'utf8');
    diffRepo.updateDiffStatus(diff.id, 'REVERTED');
    res.json({ success: true, status: 'REVERTED' });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to revert diff: ${err.message}` });
  }
});
