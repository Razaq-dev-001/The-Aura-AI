import * as fs from 'node:fs';
import * as path from 'node:path';

export interface DetectedProjectInfo {
  name: string;
  framework?: string;
  stack: string[];
  languages: string[];
  packageManager?: string;
  entryPoints: string[];
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  hasGit: boolean;
  hasTests: boolean;
}

export function detectProject(projectDir: string): DetectedProjectInfo {
  const name = path.basename(projectDir);
  const stack: string[] = [];
  const languages: Set<string> = new Set();
  const entryPoints: string[] = [];
  const scripts: Record<string, string> = {};
  const dependencies: Record<string, string> = {};
  let framework: string | undefined = undefined;
  let packageManager: string | undefined = undefined;
  let hasGit = false;
  let hasTests = false;

  // Check git
  if (fs.existsSync(path.join(projectDir, '.git'))) {
    hasGit = true;
  }

  // Check package.json (Node.js ecosystem)
  const pkgJsonPath = path.join(projectDir, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      Object.assign(dependencies, allDeps);
      Object.assign(scripts, pkg.scripts || {});

      languages.add('JavaScript');
      if (allDeps['typescript'] || fs.existsSync(path.join(projectDir, 'tsconfig.json'))) {
        languages.add('TypeScript');
        stack.push('TypeScript');
      }

      // Framework detection
      if (allDeps['next']) {
        framework = 'Next.js';
        stack.push('Next.js', 'React');
      } else if (allDeps['react']) {
        framework = 'React';
        stack.push('React');
      } else if (allDeps['vue']) {
        framework = 'Vue.js';
        stack.push('Vue');
      } else if (allDeps['@angular/core']) {
        framework = 'Angular';
        stack.push('Angular');
      } else if (allDeps['svelte'] || allDeps['@sveltejs/kit']) {
        framework = 'Svelte';
        stack.push('Svelte');
      } else if (allDeps['express']) {
        framework = 'Express';
        stack.push('Express', 'Node.js');
      } else if (allDeps['fastify']) {
        framework = 'Fastify';
        stack.push('Fastify', 'Node.js');
      } else if (allDeps['@nestjs/core']) {
        framework = 'NestJS';
        stack.push('NestJS', 'Node.js');
      }

      // Build tool & state detection
      if (allDeps['vite']) stack.push('Vite');
      if (allDeps['tailwindcss']) stack.push('Tailwind CSS');
      if (allDeps['prisma'] || allDeps['@prisma/client']) stack.push('Prisma');
      if (allDeps['drizzle-orm']) stack.push('Drizzle ORM');
      if (allDeps['firebase']) stack.push('Firebase');
      if (allDeps['@ionic/react'] || allDeps['@ionic/core']) stack.push('Ionic');
      if (allDeps['vitest'] || allDeps['jest'] || allDeps['mocha'] || allDeps['playwright']) {
        hasTests = true;
        stack.push('Vitest/Jest');
      }

      // Detect package manager lockfile
      if (fs.existsSync(path.join(projectDir, 'pnpm-lock.yaml'))) {
        packageManager = 'pnpm';
      } else if (fs.existsSync(path.join(projectDir, 'yarn.lock'))) {
        packageManager = 'yarn';
      } else if (fs.existsSync(path.join(projectDir, 'bun.lockb')) || fs.existsSync(path.join(projectDir, 'bun.lock'))) {
        packageManager = 'bun';
      } else if (fs.existsSync(path.join(projectDir, 'package-lock.json'))) {
        packageManager = 'npm';
      }
    } catch {
      // Ignore package.json parsing error
    }
  }

  // Check Python ecosystem
  if (
    fs.existsSync(path.join(projectDir, 'requirements.txt')) ||
    fs.existsSync(path.join(projectDir, 'pyproject.toml')) ||
    fs.existsSync(path.join(projectDir, 'Pipfile'))
  ) {
    languages.add('Python');
    stack.push('Python');
    packageManager = packageManager || 'pip';

    if (fs.existsSync(path.join(projectDir, 'manage.py'))) {
      framework = 'Django';
      stack.push('Django');
    }
  }

  // Check Rust ecosystem
  if (fs.existsSync(path.join(projectDir, 'Cargo.toml'))) {
    languages.add('Rust');
    stack.push('Rust');
    packageManager = packageManager || 'cargo';
    framework = framework || 'Cargo';
  }

  // Check Go ecosystem
  if (fs.existsSync(path.join(projectDir, 'go.mod'))) {
    languages.add('Go');
    stack.push('Go');
    packageManager = packageManager || 'go';
  }

  // Check Java / Kotlin
  if (fs.existsSync(path.join(projectDir, 'pom.xml'))) {
    languages.add('Java');
    stack.push('Java', 'Maven');
    packageManager = packageManager || 'maven';
  } else if (fs.existsSync(path.join(projectDir, 'build.gradle')) || fs.existsSync(path.join(projectDir, 'build.gradle.kts'))) {
    languages.add('Java');
    stack.push('Java', 'Gradle');
    packageManager = packageManager || 'gradle';
  }

  // Entry points discovery
  const possibleEntryPoints = [
    'src/main.tsx',
    'src/index.tsx',
    'src/main.ts',
    'src/index.ts',
    'src/App.tsx',
    'src/App.ts',
    'src/main.jsx',
    'src/index.js',
    'src/server.ts',
    'src/server.js',
    'app/layout.tsx',
    'app/page.tsx',
    'pages/index.tsx',
    'main.py',
    'app.py',
    'src/main.rs',
    'main.go',
    'index.html'
  ];

  for (const ep of possibleEntryPoints) {
    if (fs.existsSync(path.join(projectDir, ep))) {
      entryPoints.push(ep);
    }
  }

  return {
    name,
    framework,
    stack: Array.from(new Set(stack)),
    languages: Array.from(languages),
    packageManager,
    entryPoints,
    scripts,
    dependencies,
    hasGit,
    hasTests
  };
}
