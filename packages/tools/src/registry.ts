import {
  ExecutableTool,
  ToolExecutionContext,
  ToolResult
} from '@aura/shared';
import { ToolExecutionRepository } from '@aura/database';
import {
  readFileTool,
  editFileTool,
  writeFileTool,
  createFileTool,
  deleteFileTool,
  listDirectoryTool,
  searchFilesTool,
  searchContentTool
} from './implementations/file_tools.js';
import { runCommandTool } from './implementations/terminal_tools.js';
import {
  gitStatusTool,
  gitDiffTool,
  gitLogTool,
  gitCommitTool
} from './implementations/git_tools.js';
import {
  inspectProjectTool,
  getFileOutlineTool
} from './implementations/project_tools.js';
import {
  saveMemoryTool,
  retrieveMemoryTool
} from './implementations/memory_tools.js';
import {
  webSearchTool,
  fetchWebPageTool
} from './implementations/research_tools.js';
import { readDocumentTool } from './implementations/document_tools.js';

export class ToolRegistry {
  private tools: Map<string, ExecutableTool> = new Map();
  private executionRepo?: ToolExecutionRepository;

  constructor(executionRepo?: ToolExecutionRepository) {
    this.executionRepo = executionRepo;
    this.registerDefaults();
  }

  private getExecutionRepo(): ToolExecutionRepository {
    if (!this.executionRepo) {
      this.executionRepo = new ToolExecutionRepository();
    }
    return this.executionRepo;
  }

  private registerDefaults(): void {
    const allTools: ExecutableTool[] = [
      readFileTool,
      editFileTool,
      writeFileTool,
      createFileTool,
      deleteFileTool,
      listDirectoryTool,
      searchFilesTool,
      searchContentTool,
      runCommandTool,
      gitStatusTool,
      gitDiffTool,
      gitLogTool,
      gitCommitTool,
      inspectProjectTool,
      getFileOutlineTool,
      saveMemoryTool,
      retrieveMemoryTool,
      webSearchTool,
      fetchWebPageTool,
      readDocumentTool
    ];

    for (const tool of allTools) {
      this.tools.set(tool.name, tool);
    }
  }

  register(tool: ExecutableTool): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): ExecutableTool | undefined {
    return this.tools.get(name);
  }

  list(): ExecutableTool[] {
    return Array.from(this.tools.values());
  }

  getSchemas(): Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }> {
    return this.list().map((tool) => {
      const jsonSchema = zodToJsonSchema(tool.parameters);
      return {
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: jsonSchema
        }
      };
    });
  }

  async execute(
    toolName: string,
    args: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    const tool = this.get(toolName);
    if (!tool) {
      return {
        success: false,
        error: `Tool '${toolName}' is not registered.`,
        durationMs: 0
      };
    }

    const startTime = Date.now();

    // Validate parameters with Zod
    const parseRes = tool.parameters.safeParse(args);
    if (!parseRes.success) {
      const errorMsg = `Invalid arguments for ${toolName}: ${parseRes.error.errors.map((e) => e.message).join(', ')}`;
      try {
        this.getExecutionRepo().logExecution({
          taskId: context.taskId,
          conversationId: context.conversationId,
          toolName,
          input: args,
          status: 'ERROR',
          durationMs: Date.now() - startTime,
          error: errorMsg
        });
      } catch {}

      return {
        success: false,
        error: errorMsg,
        durationMs: Date.now() - startTime
      };
    }

    try {
      const result = await tool.execute(parseRes.data, context);
      const durationMs = Date.now() - startTime;

      try {
        this.getExecutionRepo().logExecution({
          taskId: context.taskId,
          conversationId: context.conversationId,
          toolName,
          input: args,
          output: result.data,
          status: result.success ? 'SUCCESS' : 'ERROR',
          durationMs,
          error: result.error
        });
      } catch {}

      return result;
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const errorMsg = `Tool execution exception in ${toolName}: ${err.message}`;

      try {
        this.getExecutionRepo().logExecution({
          taskId: context.taskId,
          conversationId: context.conversationId,
          toolName,
          input: args,
          status: 'ERROR',
          durationMs,
          error: errorMsg
        });
      } catch {}

      return {
        success: false,
        error: errorMsg,
        durationMs
      };
    }
  }
}

function zodToJsonSchema(schema: any): Record<string, unknown> {
  const shape = schema?._def?.shape ? schema._def.shape() : {};
  const properties: Record<string, any> = {};
  const required: string[] = [];

  for (const [key, prop] of Object.entries(shape) as [string, any][]) {
    const isOptional = prop._def.typeName === 'ZodOptional';
    const unwrapped = isOptional ? prop._def.innerType : prop;
    const typeName = unwrapped._def.typeName;

    let type = 'string';
    if (typeName === 'ZodNumber') type = 'number';
    if (typeName === 'ZodBoolean') type = 'boolean';
    if (typeName === 'ZodArray') type = 'array';
    if (typeName === 'ZodObject') type = 'object';

    properties[key] = {
      type,
      description: prop._def.description || unwrapped._def.description || ''
    };

    if (typeName === 'ZodEnum') {
      properties[key].type = 'string';
      properties[key].enum = unwrapped._def.values;
    }

    if (!isOptional) {
      required.push(key);
    }
  }

  return {
    type: 'object',
    properties,
    required
  };
}

export const globalToolRegistry = new ToolRegistry();
