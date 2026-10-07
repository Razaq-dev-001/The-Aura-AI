import * as fs from 'node:fs';
import * as path from 'node:path';
import { ProjectFile } from '@aura/shared';
import { ProjectRepository } from '@aura/database';
import { detectProject, DetectedProjectInfo } from './detector.js';

export const DEFAULT_IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'out',
  'target',
  '.gradle',
  '.idea',
  '.vscode',
  'coverage',
  'venv',
  '.venv',
  '__pycache__',
  '.turbo',
  '.cache'
]);

export interface IndexedProjectSummary {
  projectId: string;
  name: string;
  path: string;
  detected: DetectedProjectInfo;
  files: ProjectFile[];
  treeString: string;
}

export class ProjectIndexer {
  private projectRepo: ProjectRepository;

  constructor(projectRepo?: ProjectRepository) {
    this.projectRepo = projectRepo || new ProjectRepository();
  }

  async indexProject(projectPath: string): Promise<IndexedProjectSummary> {
    const absolutePath = path.resolve(projectPath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Project directory does not exist: ${absolutePath}`);
    }

    const detected = detectProject(absolutePath);

    // Save or update Project in DB
    const project = this.projectRepo.createProject({
      name: detected.name,
      path: absolutePath,
      framework: detected.framework,
      stack: detected.stack,
      languages: detected.languages,
      packageManager: detected.packageManager,
      entryPoints: detected.entryPoints
    });

    const fileEntries: Omit<ProjectFile, 'id'>[] = [];
    const treeLines: string[] = [];

    this.walkDirectory(absolutePath, absolutePath, fileEntries, treeLines, 0);

    // Save all files to SQLite
    this.projectRepo.saveProjectFiles(project.id, fileEntries);

    const savedFiles = this.projectRepo.getProjectFiles(project.id);

    return {
      projectId: project.id,
      name: project.name,
      path: project.path,
      detected,
      files: savedFiles,
      treeString: treeLines.slice(0, 100).join('\n')
    };
  }

  private walkDirectory(
    rootDir: string,
    currentDir: string,
    fileEntries: Omit<ProjectFile, 'id'>[],
    treeLines: string[],
    depth: number
  ): void {
    if (depth > 12) return; // Prevent excessive recursion

    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    // Sort folders first, then alphabetical
    entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of entries) {
      if (DEFAULT_IGNORE_DIRS.has(entry.name) || entry.name.startsWith('.')) {
        continue;
      }

      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(rootDir, fullPath);
      const indent = '  '.repeat(depth);

      if (entry.isDirectory()) {
        treeLines.push(`${indent}📁 ${entry.name}/`);
        this.walkDirectory(rootDir, fullPath, fileEntries, treeLines, depth + 1);
      } else if (entry.isFile()) {
        treeLines.push(`${indent}📄 ${entry.name}`);

        try {
          const stats = fs.statSync(fullPath);
          const ext = path.extname(entry.name).toLowerCase();
          
          let lineCount = 0;
          if (stats.size < 1024 * 1024) { // Only count lines for files < 1MB
            try {
              const content = fs.readFileSync(fullPath, 'utf8');
              lineCount = content.split('\n').length;
            } catch {
              lineCount = 0;
            }
          }

          fileEntries.push({
            projectId: '', // will be assigned in saveProjectFiles
            path: fullPath,
            relativePath,
            fileType: ext.replace(/^\./, '') || 'text',
            size: stats.size,
            lineCount,
            lastModified: stats.mtimeMs
          });
        } catch {
          // Skip file if stat fails
        }
      }
    }
  }
}
