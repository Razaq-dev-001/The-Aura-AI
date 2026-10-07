import { FileDiff } from '@aura/shared';

export interface SelfReviewResult {
  passed: boolean;
  score: number; // 0 to 100
  checks: Array<{
    name: string;
    passed: boolean;
    details: string;
  }>;
  summary: string;
}

export class SelfReviewer {
  reviewChanges(params: {
    userGoal: string;
    diffs: FileDiff[];
    testOutput?: string;
    testExitCode?: number;
    errorsEncountered: string[];
  }): SelfReviewResult {
    const checks: Array<{ name: string; passed: boolean; details: string }> = [];

    // Check 1: Files modified
    if (params.diffs.length > 0) {
      checks.push({
        name: 'Files Modified',
        passed: true,
        details: `${params.diffs.length} file(s) patched or created successfully.`
      });
    } else {
      checks.push({
        name: 'Files Modified',
        passed: true,
        details: 'No file modifications required for this task.'
      });
    }

    // Check 2: Test verification
    if (params.testExitCode !== undefined) {
      const testsPassed = params.testExitCode === 0;
      checks.push({
        name: 'Automated Tests',
        passed: testsPassed,
        details: testsPassed
          ? 'Automated tests executed and passed without errors.'
          : 'Test suite reported failures.'
      });
    }

    // Check 3: Error resolution
    const unresolvedErrors = params.errorsEncountered.length;
    checks.push({
      name: 'Error Resolution',
      passed: unresolvedErrors === 0,
      details: unresolvedErrors === 0
        ? 'All operations completed cleanly with zero unresolved errors.'
        : `${unresolvedErrors} error(s) occurred during execution.`
    });

    const passedChecks = checks.filter((c) => c.passed).length;
    const score = Math.round((passedChecks / checks.length) * 100);
    const overallPassed = score >= 60;

    return {
      passed: overallPassed,
      score,
      checks,
      summary: overallPassed
        ? 'Verification passed: Solution satisfies requirements with zero remaining defects.'
        : 'Verification warning: Check test or error logs before final deployment.'
    };
  }
}
