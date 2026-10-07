import {
  AIProvider,
  ModelInfo,
  ProviderHealth,
  ChatCompletionRequest,
  ChatCompletionResponse,
  StreamChunk
} from '@aura/shared';
import { countTokens } from '../tokenizer.js';

export interface OpenAIConfig {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
}

export class OpenAIProvider implements AIProvider {
  readonly id = 'openai';
  readonly name = 'OpenAI (ChatGPT)';
  readonly isLocal = false;

  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(config?: OpenAIConfig) {
    this.apiKey = config?.apiKey || process.env.OPENAI_API_KEY || '';
    this.baseUrl = (config?.baseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
    this.defaultModel = config?.defaultModel || process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o';
  }

  setApiKey(key: string): void {
    this.apiKey = key.trim();
  }

  setBaseUrl(url: string): void {
    this.baseUrl = (url.trim() || 'https://api.openai.com/v1').replace(/\/$/, '');
  }

  setDefaultModel(model: string): void {
    this.defaultModel = model.trim() || 'gpt-4o';
  }

  hasApiKey(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 5);
  }

  async healthCheck(): Promise<ProviderHealth> {
    if (!this.apiKey) {
      return {
        isAvailable: false,
        provider: this.id,
        statusMessage: 'ChatGPT / OpenAI API key is not configured',
        modelsAvailable: []
      };
    }

    const startTime = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`
        }
      });

      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try {
          const errData = (await res.json()) as any;
          errMsg = errData.error?.message || errMsg;
        } catch {
          const text = await res.text();
          if (text) errMsg = text;
        }

        if (res.status === 401) {
          return {
            isAvailable: false,
            provider: this.id,
            statusMessage: 'Invalid OpenAI API key. Please check your key at platform.openai.com',
            modelsAvailable: [],
            error: errMsg
          };
        }

        if (res.status === 429) {
          return {
            isAvailable: false,
            provider: this.id,
            statusMessage: 'OpenAI quota exceeded or rate limited. Check billing at platform.openai.com',
            modelsAvailable: [],
            error: errMsg
          };
        }

        return {
          isAvailable: false,
          provider: this.id,
          statusMessage: `OpenAI connection failed: ${errMsg}`,
          modelsAvailable: [],
          error: errMsg
        };
      }

      const data = (await res.json()) as any;
      const models = (data.data || [])
        .map((m: any) => m.id)
        .filter((id: string) => id.startsWith('gpt-') || id.startsWith('o1') || id.startsWith('o3') || id.startsWith('chatgpt'));

      return {
        isAvailable: true,
        provider: this.id,
        statusMessage: `Connected to ChatGPT / OpenAI (${models.length > 0 ? models.length : 'All'} models available)`,
        modelsAvailable: models.length > 0 ? models : ['gpt-4o', 'gpt-4o-mini', 'o3-mini', 'o1'],
        latencyMs: Date.now() - startTime
      };
    } catch (err: any) {
      return {
        isAvailable: false,
        provider: this.id,
        statusMessage: `Failed to connect to OpenAI endpoint: ${err.message}`,
        modelsAvailable: [],
        error: err.message
      };
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    return [
      {
        id: 'gpt-4o',
        name: 'GPT-4o (ChatGPT Flagship)',
        provider: this.id,
        contextWindow: 128000,
        isLocal: false,
        supportsStreaming: true,
        supportsToolCalls: true,
        description: 'OpenAI flagship model with high-speed reasoning and precision coding'
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini (Fast & Efficient)',
        provider: this.id,
        contextWindow: 128000,
        isLocal: false,
        supportsStreaming: true,
        supportsToolCalls: true,
        description: 'Fast, cost-efficient ChatGPT model for everyday development tasks'
      },
      {
        id: 'o3-mini',
        name: 'o3-mini (Advanced Reasoning)',
        provider: this.id,
        contextWindow: 200000,
        isLocal: false,
        supportsStreaming: true,
        supportsToolCalls: true,
        description: 'Specialized deep reasoning model designed for complex STEM, coding, and architecture'
      },
      {
        id: 'o1',
        name: 'o1 (Full Reasoning & Planning)',
        provider: this.id,
        contextWindow: 200000,
        isLocal: false,
        supportsStreaming: true,
        supportsToolCalls: true,
        description: 'Deepest reasoning capabilities with comprehensive internal deliberation'
      },
      {
        id: 'gpt-4.5-preview',
        name: 'GPT-4.5 Preview (Massive Intelligence)',
        provider: this.id,
        contextWindow: 128000,
        isLocal: false,
        supportsStreaming: true,
        supportsToolCalls: true,
        description: 'Next-generation frontier knowledge and subtle reasoning'
      },
      {
        id: 'chatgpt-4o-latest',
        name: 'ChatGPT-4o (Dynamic Web Model)',
        provider: this.id,
        contextWindow: 128000,
        isLocal: false,
        supportsStreaming: true,
        supportsToolCalls: true,
        description: 'Continuously updated ChatGPT-4o version matching chatgpt.com'
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo (Large Context)',
        provider: this.id,
        contextWindow: 128000,
        isLocal: false,
        supportsStreaming: true,
        supportsToolCalls: true,
        description: 'Previous-generation flagship model with broad general knowledge'
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo (Legacy Fast)',
        provider: this.id,
        contextWindow: 16385,
        isLocal: false,
        supportsStreaming: true,
        supportsToolCalls: true,
        description: 'Legacy high-speed model'
      }
    ];
  }

  async generate(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    if (!this.apiKey) {
      throw new Error(
        'OpenAI API key is missing. Please click "Connect ChatGPT" in the top bar or enter your key (sk-...) in Settings.'
      );
    }

    const model = request.model || this.defaultModel;
    const body: Record<string, any> = {
      model,
      messages: request.messages,
      temperature: request.temperature ?? 0.2,
      stream: false
    };

    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools;
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body),
      signal: request.abortSignal
    });

    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try {
        const errJson = (await res.json()) as any;
        errMsg = errJson.error?.message || errMsg;
      } catch {
        const txt = await res.text();
        if (txt) errMsg = txt;
      }
      throw new Error(`OpenAI API error (${res.status}): ${errMsg}`);
    }

    const data = (await res.json()) as any;
    const choice = data.choices?.[0];
    const message = choice?.message || {};

    let toolCalls: any[] | undefined = undefined;
    if (message.tool_calls) {
      toolCalls = message.tool_calls.map((tc: any) => ({
        id: tc.id,
        name: tc.function?.name,
        arguments: tc.function?.arguments ? JSON.parse(tc.function.arguments) : {}
      }));
    }

    return {
      id: data.id || `openai_${Date.now()}`,
      model,
      content: message.content || '',
      finishReason: choice?.finish_reason,
      toolCalls,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      }
    };
  }

  async stream(
    request: ChatCompletionRequest,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<ChatCompletionResponse> {
    if (!this.apiKey) {
      throw new Error(
        'OpenAI API key is missing. Please click "Connect ChatGPT" in the top bar or enter your key (sk-...) in Settings.'
      );
    }

    const model = request.model || this.defaultModel;
    const isReasoningModel = model.startsWith('o1') || model.startsWith('o3');

    const body: Record<string, any> = {
      model,
      messages: request.messages,
      stream: true
    };

    if (!isReasoningModel) {
      body.temperature = request.temperature ?? 0.2;
    }

    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools;
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body),
      signal: request.abortSignal
    });

    if (!res.ok || !res.body) {
      let errMsg = `HTTP ${res.status}`;
      try {
        const errJson = (await res.json()) as any;
        errMsg = errJson.error?.message || errMsg;
      } catch {
        const txt = await res.text();
        if (txt) errMsg = txt;
      }
      throw new Error(`OpenAI stream error (${res.status}): ${errMsg}`);
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
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.delta?.reasoning_content || '';
            if (delta) {
              accumulatedText += delta;
              onChunk({ delta });
            }
          } catch {
            // Ignore partial SSE JSON parse issues
          }
        }
      }
    }

    return {
      id: `openai_${Date.now()}`,
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
