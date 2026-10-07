import express from 'express';
import cors from 'cors';
import { chatRouter } from './routes/chat.js';
import { conversationsRouter } from './routes/conversations.js';
import { projectsRouter } from './routes/projects.js';
import { tasksRouter } from './routes/tasks.js';
import { diffsRouter } from './routes/diffs.js';
import { memoryRouter } from './routes/memory.js';
import { toolsRouter } from './routes/tools.js';
import { providersRouter } from './routes/providers.js';
import { settingsRouter } from './routes/settings.js';
import { diagnosticsRouter } from './routes/diagnostics.js';
import { researchRouter } from './routes/research.js';

export function createApp() {
  const app = express();

  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'AURA Personal AI Engine',
      version: '1.0.0',
      timestamp: Date.now()
    });
  });

  // API Routes
  app.use('/api/chat', chatRouter);
  app.use('/api/conversations', conversationsRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/diffs', diffsRouter);
  app.use('/api/memory', memoryRouter);
  app.use('/api/tools', toolsRouter);
  app.use('/api/providers', providersRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/diagnostics', diagnosticsRouter);
  app.use('/api/research', researchRouter);

  return app;
}
