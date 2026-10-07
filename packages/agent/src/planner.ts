import { TaskPlan, TaskPlanStep, TaskType, generateId } from '@aura/shared';

export interface PlanGenerationContext {
  userPrompt: string;
  hasProject: boolean;
  projectSummary?: string;
  mode: string;
}

export class TaskPlanner {
  classifyTaskType(prompt: string): TaskType {
    const lower = prompt.toLowerCase();

    if (lower.startsWith('/search') || lower.startsWith('/research') || lower.includes('search the web') || lower.includes('research')) {
      return 'RESEARCH';
    }
    if (lower.startsWith('/test') || lower.includes('run tests') || lower.includes('run the tests') || lower.includes('fix test')) {
      return 'TESTING';
    }
    if (lower.includes('fix bug') || lower.includes('why is this error') || lower.includes('why does this fail') || lower.includes('debug')) {
      return 'DEBUGGING';
    }
    if (lower.includes('refactor') || lower.includes('clean up') || lower.includes('optimize')) {
      return 'REFACTORING';
    }
    if (lower.includes('implement') || lower.includes('build') || lower.includes('create') || lower.includes('add feature') || lower.includes('write')) {
      return 'CODING';
    }
    if (lower.includes('explain project') || lower.includes('how does this project work') || lower.includes('inspect project')) {
      return 'PROJECT_ANALYSIS';
    }
    if (lower.includes('compare') || lower.includes('architecture') || lower.includes('tradeoffs')) {
      return 'REASONING';
    }
    if (lower.includes('summarize pdf') || lower.includes('document')) {
      return 'DOCUMENT';
    }

    return 'CONVERSATION';
  }

  isAutonomousTask(prompt: string, taskType: TaskType): boolean {
    if (['CODING', 'DEBUGGING', 'REFACTORING', 'TESTING', 'FILE_TASK'].includes(taskType)) {
      return true;
    }
    const lower = prompt.toLowerCase();
    return (
      lower.includes('build ') ||
      lower.includes('fix ') ||
      lower.includes('create ') ||
      lower.includes('modify ') ||
      lower.includes('run ')
    );
  }

  generatePlan(context: PlanGenerationContext): TaskPlan {
    const taskType = this.classifyTaskType(context.userPrompt);
    const planId = generateId('plan');
    const steps: TaskPlanStep[] = [];

    const lower = context.userPrompt.toLowerCase();

    if (taskType === 'CODING' || taskType === 'DEBUGGING') {
      steps.push({
        id: generateId('step'),
        stepNumber: 1,
        title: 'Inspect Project Architecture',
        description: 'Scan workspace structure, framework dependencies, and entrypoints',
        toolName: 'inspect_project',
        toolInput: {},
        status: 'PENDING'
      });

      steps.push({
        id: generateId('step'),
        stepNumber: 2,
        title: 'Locate Relevant Files',
        description: `Search codebase for files related to "${context.userPrompt.substring(0, 50)}"`,
        toolName: 'search_content',
        toolInput: { query: this.extractKeyword(context.userPrompt) },
        status: 'PENDING'
      });

      steps.push({
        id: generateId('step'),
        stepNumber: 3,
        title: 'Implement File Modifications',
        description: 'Apply precise code modifications and create required files',
        toolName: 'edit_file',
        status: 'PENDING'
      });

      steps.push({
        id: generateId('step'),
        stepNumber: 4,
        title: 'Execute Verification & Tests',
        description: 'Run project tests or build to verify no regressions',
        toolName: 'run_command',
        toolInput: { command: 'npm test' },
        status: 'PENDING'
      });

      steps.push({
        id: generateId('step'),
        stepNumber: 5,
        title: 'Self-Review & Report',
        description: 'Review diffs, verify complete solution, and generate summary',
        status: 'PENDING'
      });
    } else if (taskType === 'TESTING') {
      steps.push({
        id: generateId('step'),
        stepNumber: 1,
        title: 'Run Test Suite',
        description: 'Execute automated test runner',
        toolName: 'run_command',
        toolInput: { command: 'npm test' },
        status: 'PENDING'
      });
      steps.push({
        id: generateId('step'),
        stepNumber: 2,
        title: 'Analyze Test Results',
        description: 'Detect failures and locate offending test cases',
        status: 'PENDING'
      });
    } else if (taskType === 'RESEARCH') {
      steps.push({
        id: generateId('step'),
        stepNumber: 1,
        title: 'Search Web Documentation',
        description: `Query online sources for: ${context.userPrompt}`,
        toolName: 'web_search',
        toolInput: { query: context.userPrompt.replace(/^\/research\s*/, '') },
        status: 'PENDING'
      });
      steps.push({
        id: generateId('step'),
        stepNumber: 2,
        title: 'Synthesize Findings & Citations',
        description: 'Extract relevant snippets, dates, and authoritative URLs',
        status: 'PENDING'
      });
    } else {
      steps.push({
        id: generateId('step'),
        stepNumber: 1,
        title: 'Analyze Request',
        description: 'Process prompt and generate technical response',
        status: 'PENDING'
      });
    }

    return {
      id: planId,
      title: context.userPrompt.substring(0, 60),
      summary: `Plan for: ${context.userPrompt}`,
      steps,
      currentStepIndex: 0,
      status: 'PENDING'
    };
  }

  private extractKeyword(prompt: string): string {
    const cleaned = prompt.replace(/[^\w\s]/g, '');
    const words = cleaned.split(/\s+/).filter((w) => w.length > 3 && !['build', 'create', 'make', 'implement', 'please'].includes(w.toLowerCase()));
    return words[0] || 'auth';
  }
}
