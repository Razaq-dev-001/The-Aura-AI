import {
  AIProvider,
  ModelInfo,
  ProviderHealth,
  ChatCompletionRequest,
  ChatCompletionResponse,
  StreamChunk
} from '@aura/shared';
import { countTokens } from '../tokenizer.js';

export interface AnthropicConfig {
  apiKey?: string;
  defaultModel?: string;
}

export class AnthropicProvider implements AIProvider {
  readonly id = 'anthropic';
  readonly name = 'Anthropic Claude';
  readonly isLocal = false;

  private apiKey: string;
  private defaultModel: string;

  constructor(config?: AnthropicConfig) {
    this.apiKey = config?.apiKey || process.env.ANTHROPIC_API_KEY || '';
    this.defaultModel = config?.defaultModel || process.env.ANTHROPIC_DEFAULT_MODEL || 'claude-3-5-sonnet-20241022';
  }

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  async healthCheck(): Promise<ProviderHealth> {
    if (!this.apiKey) {
      return {
        isAvailable: false,
        provider: this.id,
        statusMessage: 'Anthropic API key is not configured',
        modelsAvailable: []
      };
    }

    return {
      isAvailable: true,
      provider: this.id,
      statusMessage: 'Anthropic API configured',
      modelsAvailable: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022']
    };
  }

  async listModels(): Promise<ModelInfo[]> {
    return [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet (Coding Flagship)',
        provider: this.id,
        contextWindow: 200000,
        isLocal: false,
        supportsStreaming: true,
        supportsToolCalls: true,
        description: 'Industry-leading coding & reasoning model'
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku (Fast)',
        provider: this.id,
        contextWindow: 200000,
        isLocal: false,
        supportsStreaming: true,
        supportsToolCalls: true,
        description: 'Fast, responsive intelligence'
      }
    ];
  }

  async generate(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    if (!this.apiKey) {
      throw new Error('Anthropic API key is required. Please configure it in Settings.');
    }

    const model = request.model || this.defaultModel;
    const systemPrompt = request.messages.find((m) => m.role === 'system')?.content;
    const userMessages = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }));

    const body: Record<string, any> = {
      model,
      max_tokens: request.maxTokens || 4096,
      messages: userMessages,
      system: systemPrompt,
      temperature: request.temperature ?? 0.2
    };

    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters
      }));
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body),
      signal: request.abortSignal
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic API error (${res.status}): ${err}`);
    }

    const data = (await res.json()) as any;
    let content = '';
    const toolCalls: any[] = [];

    for (const block of data.content || []) {
      if (block.type === 'text') {
        content += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input || {}
        });
      }
    }

    return {
      id: data.id || `claude_${Date.now()}`,
      model,
      content,
      finishReason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
      }
    };
  }

  async stream(
    request: ChatCompletionRequest,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<ChatCompletionResponse> {
    if (!this.apiKey) {
      throw new Error('Anthropic API key is required. Please configure it in Settings.');
    }

    const model = request.model || this.defaultModel;
    const systemPrompt = request.messages.find((m) => m.role === 'system')?.content;
    const userMessages = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }));

    const body: Record<string, any> = {
      model,
      max_tokens: request.maxTokens || 4096,
      messages: userMessages,
      system: systemPrompt,
      stream: true,
      temperature: request.temperature ?? 0.2
    };

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body),
      signal: request.abortSignal
    });

    if (!res.ok || !res.body) {
      const err = await res.text();
      throw new Error(`Anthropic stream error (${res.status}): ${err}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.replace('data: ', '').trim();
          if (!jsonStr) continue;
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === 'content_block_delta') {
              const delta = parsed.delta?.text || '';
              if (delta) {
                accumulatedText += delta;
                onChunk({ delta });
              }
            }
          } catch {
            // Ignore partial SSE JSON parse issues
          }
        }
      }
    }

    return {
      id: `claude_${Date.now()}`,
      model,
      content: accumulatedText,
      finishReason: 'stop',
      usage: {
        promptTokens: countTokens(JSON.stringify(request.messages)),
        completionTokens: countTokens(accumulatedText),
        totalTokens: countTokens(JSON.stringify(request.messages) + accumulatedText)
      }
    };
  }

  countTokens(text: string): number {
    return countTokens(text);
  }
}
