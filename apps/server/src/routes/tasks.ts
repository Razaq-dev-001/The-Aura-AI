import { Router, Request, Response } from 'express';
import { TaskRepository } from '@aura/database';

export const tasksRouter = Router();
const taskRepo = new TaskRepository();

tasksRouter.get('/', (req: Request, res: Response) => {
  const { conversationId } = req.query;
  const tasks = taskRepo.listTasks(conversationId as string | undefined);
  res.json({ tasks });
});

tasksRouter.get('/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const task = taskRepo.getTaskById(id);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  const steps = taskRepo.getStepsByTaskId(id);
  res.json({ task, steps });
});

tasksRouter.post('/:id/cancel', (req: Request, res: Response) => {
  const id = req.params.id as string;
  taskRepo.updateTaskStatus(id, 'CANCELLED');
  res.json({ success: true, status: 'CANCELLED' });
});
