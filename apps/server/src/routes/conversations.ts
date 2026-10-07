import { Router, Request, Response } from 'express';
import { ConversationRepository, MessageRepository } from '@aura/database';

export const conversationsRouter = Router();
const convRepo = new ConversationRepository();
const msgRepo = new MessageRepository();

conversationsRouter.get('/', (req: Request, res: Response) => {
  const { projectId, search, includeArchived } = req.query;
  const list = convRepo.listConversations({
    projectId: projectId as string | undefined,
    search: search as string | undefined,
    includeArchived: includeArchived === 'true'
  });
  res.json({ conversations: list });
});

conversationsRouter.post('/', (req: Request, res: Response) => {
  const { title, projectId, mode } = req.body;
  const conv = convRepo.createConversation({ title, projectId, mode });
  res.status(201).json({ conversation: conv });
});

conversationsRouter.get('/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const conv = convRepo.getConversationById(id);
  if (!conv) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }
  const messages = msgRepo.getMessagesByConversationId(id);
  res.json({ conversation: conv, messages });
});

conversationsRouter.patch('/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const updated = convRepo.updateConversation(id, req.body);
  if (!updated) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }
  res.json({ conversation: updated });
});

conversationsRouter.delete('/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;
  convRepo.deleteConversation(id);
  res.json({ success: true });
});

conversationsRouter.get('/:id/messages', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const messages = msgRepo.getMessagesByConversationId(id);
  res.json({ messages });
});
