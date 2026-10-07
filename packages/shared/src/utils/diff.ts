export interface DiffLine {
  type: 'add' | 'delete' | 'unchanged';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffResult {
  filePath: string;
  lines: DiffLine[];
  additions: number;
  deletions: number;
  unifiedDiff: string;
}

/**
 * Computes a line-by-line diff between original and modified text (LCS algorithm)
 */
export function computeDiff(
  filePath: string,
  originalText: string,
  modifiedText: string
): DiffResult {
  const originalLines = originalText.split(/\r?\n/);
  const modifiedLines = modifiedText.split(/\r?\n/);

  const n = originalLines.length;
  const m = modifiedLines.length;

  // Build LCS matrix
  const matrix: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0)
  );

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (originalLines[i - 1] === modifiedLines[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1] + 1;
      } else {
        matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff
  let i = n;
  let j = m;
  const rawDiff: Array<{ type: 'add' | 'delete' | 'unchanged'; line: string }> = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && originalLines[i - 1] === modifiedLines[j - 1]) {
      rawDiff.unshift({ type: 'unchanged', line: originalLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
      rawDiff.unshift({ type: 'add', line: modifiedLines[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || matrix[i][j - 1] < matrix[i - 1][j])) {
      rawDiff.unshift({ type: 'delete', line: originalLines[i - 1] });
      i--;
    }
  }

  let oldLine = 1;
  let newLine = 1;
  let additions = 0;
  let deletions = 0;

  const lines: DiffLine[] = rawDiff.map((item) => {
    if (item.type === 'unchanged') {
      const res: DiffLine = {
        type: 'unchanged',
        content: item.line,
        oldLineNumber: oldLine,
        newLineNumber: newLine
      };
      oldLine++;
      newLine++;
      return res;
    } else if (item.type === 'delete') {
      deletions++;
      const res: DiffLine = {
        type: 'delete',
        content: item.line,
        oldLineNumber: oldLine
      };
      oldLine++;
      return res;
    } else {
      additions++;
      const res: DiffLine = {
        type: 'add',
        content: item.line,
        newLineNumber: newLine
      };
      newLine++;
      return res;
    }
  });

  // Generate unified diff string
  const patchHeader = `--- a/${filePath}\n+++ b/${filePath}\n`;
  const patchLines = lines.map((l) => {
    if (l.type === 'add') return `+${l.content}`;
    if (l.type === 'delete') return `-${l.content}`;
    return ` ${l.content}`;
  });
  const unifiedDiff = patchHeader + patchLines.join('\n');

  return {
    filePath,
    lines,
    additions,
    deletions,
    unifiedDiff
  };
}

/**
 * Apply search and replace or unified patch edits to a file content
 */
export function applyPatch(
  originalContent: string,
  targetContent: string,
  replacementContent: string,
  allowMultiple = false
): { success: boolean; newContent: string; count: number; error?: string } {
  if (!originalContent.includes(targetContent)) {
    // Try fuzzy whitespace matching
    const normalizedOrig = originalContent.replace(/\r\n/g, '\n');
    const normalizedTarget = targetContent.replace(/\r\n/g, '\n');
    
    if (!normalizedOrig.includes(normalizedTarget)) {
      return {
        success: false,
        newContent: originalContent,
        count: 0,
        error: 'Target content was not found in the original file.'
      };
    }
    
    // Perform replacement on normalized
    let count = 0;
    let newContent = normalizedOrig;
    if (allowMultiple) {
      newContent = normalizedOrig.replaceAll(normalizedTarget, replacementContent);
      count = normalizedOrig.split(normalizedTarget).length - 1;
    } else {
      newContent = normalizedOrig.replace(normalizedTarget, replacementContent);
      count = 1;
    }
    return { success: true, newContent, count };
  }

  let count = 0;
  let newContent = originalContent;
  if (allowMultiple) {
    newContent = originalContent.replaceAll(targetContent, replacementContent);
    count = originalContent.split(targetContent).length - 1;
  } else {
    newContent = originalContent.replace(targetContent, replacementContent);
    count = 1;
  }

  return { success: true, newContent, count };
}
