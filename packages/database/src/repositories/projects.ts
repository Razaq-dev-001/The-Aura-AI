import { DatabaseSync } from 'node:sqlite';
import { Project, ProjectFile, ProjectPermissions, generateId } from '@aura/shared';
import { getDatabase } from '../db.js';

export class ProjectRepository {
  private db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db || getDatabase();
  }

  createProject(params: {
    name: string;
    path: string;
    description?: string;
    stack?: string[];
    framework?: string;
    languages?: string[];
    packageManager?: string;
    entryPoints?: string[];
    permissions?: Partial<ProjectPermissions>;
  }): Project {
    const existing = this.getProjectByPath(params.path);
    if (existing) {
      return existing;
    }

    const now = Date.now();
    const defaultPermissions: ProjectPermissions = {
      readFiles: true,
      modifyFiles: true,
      runCommands: true,
      ...params.permissions
    };

    const project: Project = {
      id: generateId('proj'),
      name: params.name,
      path: params.path,
      description: params.description,
      stack: params.stack || [],
      framework: params.framework,
      languages: params.languages || [],
      packageManager: params.packageManager,
      entryPoints: params.entryPoints || [],
      permissions: defaultPermissions,
      fileCount: 0,
      createdAt: now,
      updatedAt: now
    };

    const stmt = this.db.prepare(`
      INSERT INTO projects (
        id, name, path, description, stack_json, framework,
        languages_json, package_manager, entry_points_json,
        permissions_json, file_count, last_indexed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      project.id,
      project.name,
      project.path,
      project.description || null,
      JSON.stringify(project.stack),
      project.framework || null,
      JSON.stringify(project.languages),
      project.packageManager || null,
      JSON.stringify(project.entryPoints),
      JSON.stringify(project.permissions),
      project.fileCount,
      null,
      project.createdAt,
      project.updatedAt
    );

    return project;
  }

  getProjectById(id: string): Project | null {
    const row = this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.mapRow(row);
  }

  getProjectByPath(projectPath: string): Project | null {
    const row = this.db.prepare('SELECT * FROM projects WHERE path = ?').get(projectPath) as any;
    if (!row) return null;
    return this.mapRow(row);
  }

  listProjects(): Project[] {
    const rows = this.db.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all() as any[];
    return rows.map((r) => this.mapRow(r));
  }

  updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Project | null {
    const current = this.getProjectById(id);
    if (!current) return null;

    const updated: Project = {
      ...current,
      ...updates,
      updatedAt: Date.now()
    };

    const stmt = this.db.prepare(`
      UPDATE projects SET
        name = ?,
        path = ?,
        description = ?,
        stack_json = ?,
        framework = ?,
        languages_json = ?,
        package_manager = ?,
        entry_points_json = ?,
        permissions_json = ?,
        file_count = ?,
        last_indexed_at = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      updated.name,
      updated.path,
      updated.description || null,
      JSON.stringify(updated.stack),
      updated.framework || null,
      JSON.stringify(updated.languages),
      updated.packageManager || null,
      JSON.stringify(updated.entryPoints),
      JSON.stringify(updated.permissions),
      updated.fileCount,
      updated.lastIndexedAt || null,
      updated.updatedAt,
      id
    );

    return updated;
  }

  deleteProject(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM projects WHERE id = ?');
    stmt.run(id);
    return true;
  }

  // Project Files
  saveProjectFiles(projectId: string, files: Omit<ProjectFile, 'id'>[]): void {
    // Clear old files
    this.db.prepare('DELETE FROM project_files WHERE project_id = ?').run(projectId);

    const insert = this.db.prepare(`
      INSERT INTO project_files (id, project_id, path, relative_path, file_type, size, line_count, summary, last_modified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const f of files) {
      const id = generateId('file');
      insert.run(
        id,
        projectId,
        f.path,
        f.relativePath,
        f.fileType,
        f.size,
        f.lineCount,
        f.summary || null,
        f.lastModified
      );
    }

    // Update project file_count and last_indexed_at
    const update = this.db.prepare(`
      UPDATE projects SET file_count = ?, last_indexed_at = ?, updated_at = ? WHERE id = ?
    `);
    const now = Date.now();
    update.run(files.length, now, now, projectId);
  }

  getProjectFiles(projectId: string): ProjectFile[] {
    const rows = this.db.prepare('SELECT * FROM project_files WHERE project_id = ? ORDER BY relative_path ASC').all(projectId) as any[];
    return rows.map((r) => ({
      id: r.id,
      projectId: r.project_id,
      path: r.path,
      relativePath: r.relative_path,
      fileType: r.file_type,
      size: Number(r.size),
      lineCount: Number(r.line_count),
      summary: r.summary || undefined,
      lastModified: Number(r.last_modified)
    }));
  }

  private mapRow(row: any): Project {
    return {
      id: row.id,
      name: row.name,
      path: row.path,
      description: row.description || undefined,
      stack: JSON.parse(row.stack_json || '[]'),
      framework: row.framework || undefined,
      languages: JSON.parse(row.languages_json || '[]'),
      packageManager: row.package_manager || undefined,
      entryPoints: JSON.parse(row.entry_points_json || '[]'),
      permissions: JSON.parse(row.permissions_json || '{"readFiles":true,"modifyFiles":true,"runCommands":true}'),
      fileCount: Number(row.file_count || 0),
      lastIndexedAt: row.last_indexed_at ? Number(row.last_indexed_at) : undefined,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at)
    };
  }
}
