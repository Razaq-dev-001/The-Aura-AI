import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import { DEFAULT_IGNORE_DIRS } from './indexer.js';

export interface SearchMatch {
  filePath: string;
  relativePath: string;
  lineNumber: number;
  lineContent: string;
}

export interface SearchOptions {
  query: string;
  isRegex?: boolean;
  caseSensitive?: boolean;
  filePattern?: string;
  maxResults?: number;
}

export class ProjectSearch {
  private hasRipgrep: boolean | null = null;

  async searchContent(projectDir: string, options: SearchOptions): Promise<SearchMatch[]> {
    const maxResults = options.maxResults || 50;

    if (this.hasRipgrep === null) {
      this.hasRipgrep = await this.checkRipgrep();
    }

    if (this.hasRipgrep) {
      try {
        return await this.searchWithRipgrep(projectDir, options, maxResults);
      } catch {
        // Fall back to Node scanner if ripgrep fails
      }
    }

    return this.searchWithNodeScanner(projectDir, options, maxResults);
  }

  async searchFilesByName(projectDir: string, pattern: string, maxResults = 50): Promise<string[]> {
    const results: string[] = [];
    const lowerPattern = pattern.toLowerCase();

    const walk = (dir: string) => {
      if (results.length >= maxResults) return;

      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        if (results.length >= maxResults) break;
        if (DEFAULT_IGNORE_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          const relPath = path.relative(projectDir, fullPath);
          if (entry.name.toLowerCase().includes(lowerPattern) || relPath.toLowerCase().includes(lowerPattern)) {
            results.push(relPath);
          }
        }
      }
    };

    walk(projectDir);
    return results;
  }

  private async checkRipgrep(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn('rg', ['--version']);
      proc.on('error', () => resolve(false));
      proc.on('close', (code) => resolve(code === 0));
    });
  }

  private async searchWithRipgrep(
    projectDir: string,
    options: SearchOptions,
    maxResults: number
  ): Promise<SearchMatch[]> {
    return new Promise((resolve) => {
      const args = ['--line-number', '--no-heading', '--color=never'];

      if (!options.caseSensitive) {
        args.push('-i');
      }

      if (!options.isRegex) {
        args.push('-F');
      }

      if (options.filePattern) {
        args.push('-g', options.filePattern);
      }

      // Ignore common build directories
      for (const ignored of DEFAULT_IGNORE_DIRS) {
        args.push('-g', `!${ignored}`);
      }

      args.push(options.query, projectDir);

      const proc = spawn('rg', args);
      let stdout = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.on('close', () => {
        const lines = stdout.split('\n').filter(Boolean);
        const matches: SearchMatch[] = [];

        for (const line of lines) {
          if (matches.length >= maxResults) break;
          // Format: /path/to/file:123:content
          const parts = line.split(':');
          if (parts.length >= 3) {
            const filePath = parts[0];
            const lineNumber = parseInt(parts[1], 10);
            const lineContent = parts.slice(2).join(':');

            matches.push({
              filePath,
              relativePath: path.relative(projectDir, filePath),
              lineNumber: isNaN(lineNumber) ? 1 : lineNumber,
              lineContent: lineContent.trim()
            });
          }
        }

        resolve(matches);
      });

      proc.on('error', () => {
        resolve([]);
      });
    });
  }

  private searchWithNodeScanner(
    projectDir: string,
    options: SearchOptions,
    maxResults: number
  ): SearchMatch[] {
    const matches: SearchMatch[] = [];
    const regexFlags = options.caseSensitive ? 'g' : 'gi';
    const regex = options.isRegex
      ? new RegExp(options.query, regexFlags)
      : new RegExp(options.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), regexFlags);

    const walk = (dir: string) => {
      if (matches.length >= maxResults) return;

      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        if (matches.length >= maxResults) break;
        if (DEFAULT_IGNORE_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          // Check file pattern filter
          if (options.filePattern && !entry.name.includes(options.filePattern.replace('*', ''))) {
            continue;
          }

          try {
            const stats = fs.statSync(fullPath);
            if (stats.size > 2 * 1024 * 1024) continue; // Skip files > 2MB

            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
              if (matches.length >= maxResults) break;
              if (regex.test(lines[i])) {
                matches.push({
                  filePath: fullPath,
                  relativePath: path.relative(projectDir, fullPath),
                  lineNumber: i + 1,
                  lineContent: lines[i].trim()
                });
              }
            }
          } catch {
            // Skip unreadable files
          }
        }
      }
    };

    walk(projectDir);
    return matches;
  }
}
