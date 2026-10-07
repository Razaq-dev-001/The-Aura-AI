import {
  AgentContext,
  AgentRunResult,
  SSEEvent,
  ChatMessage,
  FileDiff,
  TaskPlan,
  TaskPlanStep,
  generateId
} from '@aura/shared';
import {
  ConversationRepository,
  MessageRepository,
  ProjectRepository,
  TaskRepository,
  FileDiffRepository,
  UserSettingsRepository
} from '@aura/database';
import { globalProviderRegistry, ProviderRegistry } from '@aura/ai';
import { globalToolRegistry, ToolRegistry } from '@aura/tools';
import { MemoryManager } from '@aura/memory';
import { TaskPlanner } from './planner.js';
import { SelfReviewer } from './review.js';
import { buildSystemPromptWithContext } from './prompts/system.js';

export type SSECallback = (event: SSEEvent) => void;

export class AuraOrchestrator {
  private providerRegistry: ProviderRegistry;
  private toolRegistry: ToolRegistry;
  private memoryManager: MemoryManager;
  private convRepo: ConversationRepository;
  private messageRepo: MessageRepository;
  private projectRepo: ProjectRepository;
  private taskRepo: TaskRepository;
  private diffRepo: FileDiffRepository;
  private settingsRepo: UserSettingsRepository;
  private planner: TaskPlanner;
  private reviewer: SelfReviewer;

  constructor(options?: {
    providerRegistry?: ProviderRegistry;
    toolRegistry?: ToolRegistry;
  }) {
    this.providerRegistry = options?.providerRegistry || globalProviderRegistry;
    this.toolRegistry = options?.toolRegistry || globalToolRegistry;
    this.memoryManager = new MemoryManager();
    this.convRepo = new ConversationRepository();
    this.messageRepo = new MessageRepository();
    this.projectRepo = new ProjectRepository();
    this.taskRepo = new TaskRepository();
    this.diffRepo = new FileDiffRepository();
    this.settingsRepo = new UserSettingsRepository();
    this.planner = new TaskPlanner();
    this.reviewer = new SelfReviewer();
  }

  async run(context: AgentContext, emitEvent: SSECallback): Promise<AgentRunResult> {
    const startTime = Date.now();
    const settings = this.settingsRepo.getSettings();
    const maxIterations = context.maxIterations || settings.maxIterations || 15;
    const mode = context.mode || settings.agentMode || 'ASSIST';

    // Synchronize provider registry with database settings
    this.providerRegistry.syncWithSettings(settings);

    const effectiveModel = context.model || settings.defaultModel || 'gpt-4o';
    const targetProvider = this.providerRegistry.getProviderForModel(
      effectiveModel,
      context.providerId || settings.defaultProvider
    );

    // Ensure conversation exists
    let conv = this.convRepo.getConversationById(context.conversationId);
    let effectiveConvId = context.conversationId;
    if (!conv) {
      const created = this.convRepo.createConversation({
        title: context.userPrompt.substring(0, 50),
        projectId: context.projectId,
        mode
      });
      effectiveConvId = created.id;
    }

    // 1. Emit Start Event
    const messageId = generateId('msg');
    emitEvent({
      event: 'start',
      data: {
        conversationId: effectiveConvId,
        messageId,
        model: effectiveModel,
        provider: targetProvider.id,
        mode
      },
      timestamp: Date.now()
    });

    // 2. Fetch Project & Memory Context
    let projectSummary = '';
    let projectDir = context.projectPath;
    if (context.projectId) {
      const proj = this.projectRepo.getProjectById(context.projectId);
      if (proj) {
        projectDir = proj.path;
        projectSummary = `Project: ${proj.name}\nStack: ${proj.stack.join(', ')}\nFramework: ${proj.framework || 'None'}\nPath: ${proj.path}`;
      }
    }

    const relevantMemories = this.memoryManager.getRelevantMemories(
      context.userPrompt,
      context.projectId
    );
    const memoriesText = this.memoryManager.formatMemoriesForContext(relevantMemories);

    // 3. Classify Task and Plan
    emitEvent({
      event: 'status',
      data: { stage: 'Understanding', message: 'Analyzing intent and project structure...' },
      timestamp: Date.now()
    });

    const isAutonomous =
      mode === 'AUTONOMOUS' ||
      (mode === 'ASSIST' && this.planner.isAutonomousTask(context.userPrompt, this.planner.classifyTaskType(context.userPrompt)));

    let taskRecordId: string | undefined = undefined;
    let plan: TaskPlan | undefined = undefined;

    if (isAutonomous) {
      plan = this.planner.generatePlan({
        userPrompt: context.userPrompt,
        hasProject: Boolean(projectDir),
        projectSummary,
        mode
      });

      const taskDb = this.taskRepo.createTask({
        conversationId: context.conversationId,
        projectId: context.projectId,
        title: plan.title,
        description: plan.summary,
        planJson: JSON.stringify(plan)
      });
      taskRecordId = taskDb.id;

      for (const step of plan.steps) {
        this.taskRepo.createStep({
          taskId: taskDb.id,
          stepNumber: step.stepNumber,
          title: step.title,
          description: step.description,
          toolName: step.toolName,
          toolInputJson: step.toolInput ? JSON.stringify(step.toolInput) : undefined
        });
      }

      emitEvent({
        event: 'plan_created',
        data: plan,
        timestamp: Date.now()
      });
    }

    // 4. Retrieve conversation message history
    const pastMessages = this.messageRepo.getMessagesByConversationId(context.conversationId, 12);
    const chatMessages: ChatMessage[] = [
      {
        role: 'system',
        content: buildSystemPromptWithContext({
          mode,
          projectSummary,
          memoriesText,
          activePlanSummary: plan?.summary
        })
      },
      ...pastMessages.map((m) => ({
        role: m.role as any,
        content: m.content
      })),
      {
        role: 'user',
        content: context.userPrompt
      }
    ];

    let accumulatedResponse = '';
    const changedFiles: Set<string> = new Set();
    const errorsEncountered: string[] = [];
    let toolCallsCount = 0;
    let testOutput: string | undefined = undefined;
    let testExitCode: number | undefined = undefined;

    // 5. Execution Loop
    if (isAutonomous && plan) {
      emitEvent({
        event: 'status',
        data: { stage: 'Execution', message: 'Executing autonomous task steps...' },
        timestamp: Date.now()
      });

      for (let i = 0; i < plan.steps.length && i < maxIterations; i++) {
        if (context.abortSignal?.aborted) {
          emitEvent({
            event: 'status',
            data: { stage: 'Cancelled', message: 'Task cancelled by user.' },
            timestamp: Date.now()
          });
          break;
        }

        const step = plan.steps[i];
        step.status = 'RUNNING';

        emitEvent({
          event: 'step_started',
          data: {
            taskId: taskRecordId,
            stepId: step.id,
            stepNumber: step.stepNumber,
            title: step.title,
            status: 'RUNNING'
          },
          timestamp: Date.now()
        });

        // Execute step tool if defined
        if (step.toolName) {
          const toolCallId = generateId('call');
          emitEvent({
            event: 'tool_started',
            data: {
              toolCallId,
              toolName: step.toolName,
              input: step.toolInput
            },
            timestamp: Date.now()
          });

          const toolResult = await this.toolRegistry.execute(
            step.toolName,
            step.toolInput || {},
            {
              conversationId: context.conversationId,
              taskId: taskRecordId,
              projectId: context.projectId,
              projectPath: projectDir,
              abortSignal: context.abortSignal,
              onProgress: (p) => {
                if (step.toolName === 'run_command') {
                  emitEvent({
                    event: 'terminal_output',
                    data: {
                      command: (step.toolInput?.command as string) || '',
                      stdout: p.message
                    },
                    timestamp: Date.now()
                  });
                }
              }
            }
          );

          toolCallsCount++;

          if (toolResult.success) {
            step.status = 'COMPLETED';
            step.output = JSON.stringify(toolResult.data);

            if (step.toolName === 'edit_file' || step.toolName === 'write_file') {
              const data = toolResult.data as any;
              if (data?.filePath) changedFiles.add(data.filePath);
              if (data?.diff) {
                emitEvent({
                  event: 'diff_created',
                  data: {
                    filePath: data.filePath,
                    diffPatch: data.diff
                  },
                  timestamp: Date.now()
                });
              }
            }

            if (step.toolName === 'run_command') {
              const cmdData = toolResult.data as any;
              testOutput = cmdData?.stdout;
              testExitCode = cmdData?.exitCode;
            }

            emitEvent({
              event: 'tool_completed',
              data: {
                toolCallId,
                toolName: step.toolName,
                output: toolResult.data,
                durationMs: toolResult.durationMs
              },
              timestamp: Date.now()
            });

            emitEvent({
              event: 'step_completed',
              data: {
                taskId: taskRecordId,
                stepId: step.id,
                stepNumber: step.stepNumber,
                title: step.title,
                status: 'COMPLETED',
                output: step.output
              },
              timestamp: Date.now()
            });
          } else {
            // Error handling & recovery
            step.status = 'FAILED';
            step.error = toolResult.error;
            errorsEncountered.push(toolResult.error || 'Unknown error');

            emitEvent({
              event: 'tool_failed',
              data: {
                toolCallId,
                toolName: step.toolName,
                error: toolResult.error,
                durationMs: toolResult.durationMs
              },
              timestamp: Date.now()
            });

            emitEvent({
              event: 'step_failed',
              data: {
                taskId: taskRecordId,
                stepId: step.id,
                stepNumber: step.stepNumber,
                title: step.title,
                status: 'FAILED',
                error: step.error
              },
              timestamp: Date.now()
            });

            // If a command or file tool failed, try auto-diagnosis
            emitEvent({
              event: 'status',
              data: {
                stage: 'Diagnosing',
                message: `Capturing error in ${step.toolName}: attempting automatic recovery...`
              },
              timestamp: Date.now()
            });
          }
        } else {
          step.status = 'COMPLETED';
          emitEvent({
            event: 'step_completed',
            data: {
              taskId: taskRecordId,
              stepId: step.id,
              stepNumber: step.stepNumber,
              title: step.title,
              status: 'COMPLETED'
            },
            timestamp: Date.now()
          });
        }
      }

      // Self-Review Stage
      emitEvent({
        event: 'verification_started',
        data: { message: 'Running self-review and verification checks...' },
        timestamp: Date.now()
      });

      const activeDiffs = taskRecordId ? this.diffRepo.listDiffsByTaskId(taskRecordId) : [];
      const reviewResult = this.reviewer.reviewChanges({
        userGoal: context.userPrompt,
        diffs: activeDiffs,
        testOutput,
        testExitCode,
        errorsEncountered
      });

      emitEvent({
        event: 'verification_completed',
        data: reviewResult,
        timestamp: Date.now()
      });

      // Update Task in DB
      if (taskRecordId) {
        this.taskRepo.updateTaskStatus(
          taskRecordId,
          reviewResult.passed ? 'COMPLETED' : 'FAILED',
          plan.steps.length
        );
      }
    }

    // 6. Generate final streamed response via AI Provider
    emitEvent({
      event: 'status',
      data: { stage: 'Responding', message: 'Generating final response...' },
      timestamp: Date.now()
    });

    try {
      const completion = await this.providerRegistry.stream(
        {
          model: effectiveModel,
          messages: chatMessages,
          temperature: 0.2,
          abortSignal: context.abortSignal
        },
        (chunk) => {
          accumulatedResponse += chunk.delta;
          emitEvent({
            event: 'token',
            data: { token: chunk.delta },
            timestamp: Date.now()
          });
        },
        targetProvider.id
      );

      if (!accumulatedResponse && completion.content) {
        accumulatedResponse = completion.content;
      }
    } catch (err: any) {
      accumulatedResponse = `⚠️ ${err.message || 'Error communicating with AI model'}\n\nTo use ChatGPT, please ensure your OpenAI API key is connected in Settings or the Quick Connect bar.`;
      emitEvent({
        event: 'token',
        data: { token: accumulatedResponse },
        timestamp: Date.now()
      });
    }

    // 7. Save Assistant Message in DB
    this.messageRepo.createMessage({
      conversationId: effectiveConvId,
      role: 'assistant',
      content: accumulatedResponse,
      tokens: accumulatedResponse.length / 4
    });

    // 8. Emit Done Event
    const durationMs = Date.now() - startTime;
    emitEvent({
      event: 'done',
      data: {
        messageId,
        content: accumulatedResponse,
        taskId: taskRecordId,
        stats: {
          durationMs,
          toolCallsCount
        }
      },
      timestamp: Date.now()
    });

    return {
      response: accumulatedResponse,
      taskId: taskRecordId,
      taskStatus: 'COMPLETED',
      stepsExecuted: plan ? plan.steps.length : 1,
      toolCallsCount,
      changedFiles: Array.from(changedFiles),
      durationMs
    };
  }
}

export const globalOrchestrator = new AuraOrchestrator();
