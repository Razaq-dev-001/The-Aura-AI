import { Router, Request, Response } from 'express';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ProjectRepository } from '@aura/database';
import { ProjectIndexer } from '@aura/project';

export const projectsRouter = Router();
const projRepo = new ProjectRepository();
const indexer = new ProjectIndexer(projRepo);

projectsRouter.get('/', (_req: Request, res: Response) => {
  const projects = projRepo.listProjects();
  res.json({ projects });
});

projectsRouter.post('/', async (req: Request, res: Response) => {
  const { path: projectPath, name } = req.body;
  if (!projectPath) {
    res.status(400).json({ error: 'Project directory path is required' });
    return;
  }

  const resolved = path.resolve(projectPath);
  if (!fs.existsSync(resolved)) {
    res.status(400).json({ error: `Directory does not exist: ${resolved}` });
    return;
  }

  try {
    const summary = await indexer.indexProject(resolved);
    if (name) {
      projRepo.updateProject(summary.projectId, { name });
    }
    const project = projRepo.getProjectById(summary.projectId);
    res.status(201).json({ project, summary });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to index project: ${err.message}` });
  }
});

projectsRouter.get('/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const project = projRepo.getProjectById(id);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json({ project });
});

projectsRouter.post('/index', async (req: Request, res: Response) => {
  const { projectId, projectPath } = req.body;
  let targetPath = projectPath;

  if (projectId) {
    const proj = projRepo.getProjectById(projectId);
    if (proj) targetPath = proj.path;
  }

  if (!targetPath || !fs.existsSync(targetPath)) {
    res.status(400).json({ error: 'Valid project path is required' });
    return;
  }

  try {
    const summary = await indexer.indexProject(targetPath);
    res.json({ success: true, summary });
  } catch (err: any) {
    res.status(500).json({ error: `Re-indexing failed: ${err.message}` });
  }
});

projectsRouter.get('/:id/files', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const files = projRepo.getProjectFiles(id);
  res.json({ files });
});

projectsRouter.get('/:id/file-content', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { filePath } = req.query;
  const project = projRepo.getProjectById(id);

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  if (!filePath || typeof filePath !== 'string') {
    res.status(400).json({ error: 'filePath query param is required' });
    return;
  }

  const fullPath = path.isAbsolute(filePath)
    ? filePath
    : path.join(project.path, filePath);

  if (!fs.existsSync(fullPath)) {
    res.status(404).json({ error: `File not found: ${filePath}` });
    return;
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    res.json({ filePath, content });
  } catch (err: any) {
    res.status(500).json({ error: `Could not read file: ${err.message}` });
  }
});
