import {
  AIProvider,
  ModelInfo,
  ProviderHealth,
  ChatCompletionRequest,
  ChatCompletionResponse,
  StreamChunk
} from '@aura/shared';
import { countTokens } from '../tokenizer.js';

export interface OllamaConfig {
  baseUrl?: string;
  defaultModel?: string;
  timeoutMs?: number;
}

export class OllamaProvider implements AIProvider {
  readonly id = 'ollama';
  readonly name = 'Ollama (Local)';
  readonly isLocal = true;

  private baseUrl: string;
  private defaultModel: string;
  private timeoutMs: number;

  constructor(config?: OllamaConfig) {
    this.baseUrl = (config?.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');
    this.defaultModel = config?.defaultModel || process.env.OLLAMA_DEFAULT_MODEL || 'qwen2.5-coder:latest';
    this.timeoutMs = config?.timeoutMs || 3000;
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/$/, '');
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return {
          isAvailable: false,
          provider: this.id,
          statusMessage: `Ollama server returned HTTP ${res.status}`,
          modelsAvailable: [],
          error: `HTTP ${res.status} ${res.statusText}`
        };
      }

      const data = (await res.json()) as { models?: Array<{ name: string }> };
      const models = data.models?.map((m) => m.name) || [];

      return {
        isAvailable: true,
        provider: this.id,
        statusMessage: `Connected to Ollama (${models.length} local model${models.length === 1 ? '' : 's'})`,
        modelsAvailable: models,
        latencyMs: Date.now() - startTime
      };
    } catch (err: any) {
      return {
        isAvailable: false,
        provider: this.id,
        statusMessage: 'Ollama is not running or unreachable at ' + this.baseUrl,
        modelsAvailable: [],
        error: err?.message || 'Connection refused'
      };
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) return [];
      const data = (await res.json()) as { models?: Array<{ name: string; size?: number; details?: any }> };
      return (data.models || []).map((m) => ({
        id: m.name,
        name: m.name,
        provider: this.id,
        isLocal: true,
        supportsStreaming: true,
        supportsToolCalls: true,
        description: `Local Ollama model (${m.details?.parameter_size || 'custom'})`
      }));
    } catch {
      return [];
    }
  }

  async generate(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const model = request.model || this.defaultModel;
    const body: Record<string, any> = {
      model,
      messages: request.messages.map((m) => ({
        role: m.role,
        content: m.content
      })),
      stream: false,
      options: {
        temperature: request.temperature ?? 0.2
      }
    };

    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs * 2);

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: request.abortSignal || controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama generate error (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as any;
    const message = data.message || {};
    const content = message.content || '';

    let toolCalls: any[] | undefined = undefined;
    if (message.tool_calls && Array.isArray(message.tool_calls)) {
      toolCalls = message.tool_calls.map((tc: any, index: number) => ({
        id: `call_${index}_${Date.now()}`,
        name: tc.function?.name || '',
        arguments: tc.function?.arguments || {}
      }));
    }

    return {
      id: `ollama_${Date.now()}`,
      model,
      content,
      finishReason: 'stop',
      toolCalls,
      usage: {
        promptTokens: data.prompt_eval_count || countTokens(JSON.stringify(request.messages)),
        completionTokens: data.eval_count || countTokens(content),
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
      }
    };
  }

  async stream(
    request: ChatCompletionRequest,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<ChatCompletionResponse> {
    const model = request.model || this.defaultModel;
    const body: Record<string, any> = {
      model,
      messages: request.messages.map((m) => ({
        role: m.role,
        content: m.content
      })),
      stream: true,
      options: {
        temperature: request.temperature ?? 0.2
      }
    };

    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: request.abortSignal || controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok || !res.body) {
      const errText = await res.text();
      throw new Error(`Ollama stream error (${res.status}): ${errText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = '';
    let buffer = '';
    let toolCalls: any[] | undefined = undefined;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          const delta = parsed.message?.content || '';
          if (delta) {
            accumulatedText += delta;
            onChunk({ delta });
          }

          if (parsed.message?.tool_calls) {
            toolCalls = parsed.message.tool_calls.map((tc: any, index: number) => ({
              id: `call_${index}_${Date.now()}`,
              name: tc.function?.name || '',
              arguments: tc.function?.arguments || {}
            }));
          }
        } catch {
          // Ignore JSON parse chunk errors
        }
      }
    }

    return {
      id: `ollama_${Date.now()}`,
      model,
      content: accumulatedText,
      finishReason: 'stop',
      toolCalls,
      usage: {
        promptTokens: countTokens(JSON.stringify(request.messages)),
        completionTokens: countTokens(accumulatedText),
        totalTokens: countTokens(JSON.stringify(request.messages) + accumulatedText)
      }
    };
  }

  async getEmbeddings(prompt: string, model?: string): Promise<number[]> {
    const res = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || this.defaultModel,
        prompt
      })
    });

    if (!res.ok) {
      throw new Error(`Embeddings failed: ${res.statusText}`);
    }

    const data = (await res.json()) as { embedding: number[] };
    return data.embedding;
  }

  countTokens(text: string): number {
    return countTokens(text);
  }
}
