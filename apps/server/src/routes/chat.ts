import { Router, Request, Response } from 'express';
import { AgentMode, SSEEvent } from '@aura/shared';
import {
  ConversationRepository,
  MessageRepository,
  ProjectRepository,
  UserSettingsRepository
} from '@aura/database';
import { globalOrchestrator } from '@aura/agent';

export const chatRouter = Router();

const convRepo = new ConversationRepository();
const msgRepo = new MessageRepository();
const projRepo = new ProjectRepository();
const settingsRepo = new UserSettingsRepository();

chatRouter.post('/', async (req: Request, res: Response) => {
  const { conversationId, message, projectId, mode, model, providerId } = req.body;

  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'Message content is required' });
    return;
  }

  // Find or create conversation
  let activeConvId = conversationId;
  if (!activeConvId) {
    const conv = convRepo.createConversation({
      title: message.substring(0, 50),
      projectId,
      mode: mode || 'ASSIST'
    });
    activeConvId = conv.id;
  }

  // Save User Message
  msgRepo.createMessage({
    conversationId: activeConvId,
    role: 'user',
    content: message
  });

  // Get project details if attached
  let projectPath: string | undefined = undefined;
  if (projectId) {
    const proj = projRepo.getProjectById(projectId);
    if (proj) {
      projectPath = proj.path;
    }
  }

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const abortController = new AbortController();

  req.on('close', () => {
    abortController.abort();
  });

  const sendSSE = (event: SSEEvent) => {
    if (!res.writableEnded) {
      res.write(`event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`);
    }
  };

  try {
    const settings = settingsRepo.getSettings();
    const effectiveMode: AgentMode = (mode || settings.agentMode || 'ASSIST') as AgentMode;

    await globalOrchestrator.run(
      {
        conversationId: activeConvId,
        projectId,
        projectPath,
        mode: effectiveMode,
        model: model || settings.defaultModel,
        providerId: providerId || settings.defaultProvider,
        userPrompt: message,
        abortSignal: abortController.signal
      },
      sendSSE
    );
  } catch (err: any) {
    sendSSE({
      event: 'error',
      data: { message: err.message || 'Orchestration execution error' },
      timestamp: Date.now()
    });
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
});
