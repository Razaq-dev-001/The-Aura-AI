import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDatabase, closeDatabase, UserSettingsRepository } from '../packages/database/src/index.js';
import { TaskPlanner } from '../packages/agent/src/planner.js';
import { SelfReviewer } from '../packages/agent/src/review.js';
import { AuraOrchestrator } from '../packages/agent/src/orchestrator.js';
import { globalProviderRegistry } from '../packages/ai/src/index.js';
import { globalToolRegistry } from '../packages/tools/src/index.js';

describe('AURA Agent & Orchestrator', () => {
  let db: any;

  beforeEach(() => {
    db = getDatabase(':memory:');
    const settingsRepo = new UserSettingsRepository(db);
    settingsRepo.updateSettings({
      defaultProvider: 'local-aura-engine',
      defaultModel: 'aura-deep-reasoner-v1'
    });
  });

  afterEach(() => {
    closeDatabase();
  });

  it('should classify task intents correctly', () => {
    const planner = new TaskPlanner();

    expect(planner.classifyTaskType('Build Firebase authentication for React')).toBe('CODING');
    expect(planner.classifyTaskType('Run tests and fix failures')).toBe('TESTING');
    expect(planner.classifyTaskType('Search the web for Vite 6 changelog')).toBe('RESEARCH');
    expect(planner.classifyTaskType('Explain polymorphism')).toBe('CONVERSATION');
  });

  it('should generate structured sequential task plans for coding requests', () => {
    const planner = new TaskPlanner();
    const plan = planner.generatePlan({
      userPrompt: 'Implement JWT token authentication',
      hasProject: true,
      mode: 'AUTONOMOUS'
    });

    expect(plan.steps.length).toBeGreaterThanOrEqual(4);
    expect(plan.steps[0].title).toBe('Inspect Project Architecture');
    expect(plan.steps[1].title).toBe('Locate Relevant Files');
  });

  it('should perform self-review verification', () => {
    const reviewer = new SelfReviewer();

    const reviewPassed = reviewer.reviewChanges({
      userGoal: 'Implement authentication',
      diffs: [
        {
          id: 'diff_1',
          filePath: 'src/auth.ts',
          originalContent: '',
          modifiedContent: '',
          diffPatch: '+export const auth = true;',
          status: 'APPLIED',
          createdAt: Date.now()
        }
      ],
      testExitCode: 0,
      errorsEncountered: []
    });

    expect(reviewPassed.passed).toBe(true);
    expect(reviewPassed.score).toBe(100);

    const reviewFailed = reviewer.reviewChanges({
      userGoal: 'Implement authentication',
      diffs: [],
      testExitCode: 1,
      errorsEncountered: ['Build error in auth.ts']
    });

    expect(reviewFailed.passed).toBe(false);
  });

  it('should run end-to-end orchestration and emit SSE events', async () => {
    const orchestrator = new AuraOrchestrator({
      providerRegistry: globalProviderRegistry,
      toolRegistry: globalToolRegistry
    });

    const events: any[] = [];
    const result = await orchestrator.run(
      {
        conversationId: 'test_conv',
        userPrompt: 'Explain how polymorphism works in TypeScript',
        mode: 'ASK'
      },
      (event) => {
        events.push(event);
      }
    );

    expect(result.response).toBeDefined();
    expect(events.some((e) => e.event === 'start')).toBe(true);
    expect(events.some((e) => e.event === 'token')).toBe(true);
    expect(events.some((e) => e.event === 'done')).toBe(true);
  }, 15000);
});
