export interface SymbolOutline {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'type' | 'const' | 'import' | 'export';
  lineNumber: number;
  snippet: string;
}

export function extractCodeOutline(content: string, language: string): SymbolOutline[] {
  const outlines: SymbolOutline[] = [];
  const lines = content.split('\n');

  // Regex patterns for TypeScript / JavaScript / Python / Go / Rust
  const patterns: Array<{ regex: RegExp; kind: SymbolOutline['kind'] }> = [
    { regex: /^\s*(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)/, kind: 'function' },
    { regex: /^\s*(?:export\s+)?class\s+([a-zA-Z0-9_$]+)/, kind: 'class' },
    { regex: /^\s*(?:export\s+)?interface\s+([a-zA-Z0-9_$]+)/, kind: 'interface' },
    { regex: /^\s*(?:export\s+)?type\s+([a-zA-Z0-9_$]+)/, kind: 'type' },
    { regex: /^\s*(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\(/, kind: 'function' },
    { regex: /^\s*def\s+([a-zA-Z0-9_]+)\s*\(/, kind: 'function' }, // Python
    { regex: /^\s*class\s+([a-zA-Z0-9_]+)\s*[:\(]/, kind: 'class' }, // Python
    { regex: /^\s*fn\s+([a-zA-Z0-9_]+)/, kind: 'function' }, // Rust
    { regex: /^\s*pub\s+fn\s+([a-zA-Z0-9_]+)/, kind: 'function' }, // Rust
    { regex: /^\s*struct\s+([a-zA-Z0-9_]+)/, kind: 'class' }, // Rust / Go
    { regex: /^\s*func\s+(?:\([^\)]+\)\s+)?([a-zA-Z0-9_]+)\s*\(/, kind: 'function' } // Go
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pat of patterns) {
      const match = line.match(pat.regex);
      if (match && match[1]) {
        outlines.push({
          name: match[1],
          kind: pat.kind,
          lineNumber: i + 1,
          snippet: line.trim()
        });
        break;
      }
    }
  }

  return outlines;
}
