export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextWindow?: number;
  isLocal: boolean;
  supportsStreaming: boolean;
  supportsToolCalls: boolean;
  description?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }>;
  stream?: boolean;
  abortSignal?: AbortSignal;
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  content: string;
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error';
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface StreamChunk {
  delta: string;
  toolCalls?: Array<{
    id?: string;
    name?: string;
    argumentsDelta?: string;
  }>;
  finishReason?: string;
}

export interface ProviderHealth {
  isAvailable: boolean;
  provider: string;
  statusMessage: string;
  modelsAvailable: string[];
  latencyMs?: number;
  error?: string;
}

export interface AIProvider {
  readonly id: string;
  readonly name: string;
  readonly isLocal: boolean;

  healthCheck(): Promise<ProviderHealth>;
  listModels(): Promise<ModelInfo[]>;
  generate(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  stream(
    request: ChatCompletionRequest,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<ChatCompletionResponse>;
  countTokens(text: string): number;
}
