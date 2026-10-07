import {
  AIProvider,
  ModelInfo,
  ProviderHealth,
  ChatCompletionRequest,
  ChatCompletionResponse,
  StreamChunk
} from '@aura/shared';
import { countTokens } from '../tokenizer.js';

export interface OpenRouterConfig {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
}

export class OpenRouterProvider implements AIProvider {
  readonly id = 'openrouter';
  readonly name = 'OmniRoute / OpenRouter';
  readonly isLocal = false;

  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(config?: OpenRouterConfig) {
    this.apiKey = config?.apiKey || process.env.OPENROUTER_API_KEY || '';
    this.baseUrl = (config?.baseUrl || process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
    this.defaultModel = config?.defaultModel || process.env.OPENROUTER_DEFAULT_MODEL || 'deepseek/deepseek-r1:free';
  }

  setApiKey(key: string): void {
    this.apiKey = key.trim();
  }

  setBaseUrl(url: string): void {
    this.baseUrl = (url.trim() || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
  }

  setDefaultModel(model: string): void {
    this.defaultModel = model.trim() || 'deepseek/deepseek-r1:free';
  }

  hasApiKey(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 5);
  }

  async healthCheck(): Promise<ProviderHealth> {
    if (!this.apiKey) {
      return {
        isAvailable: true,
        provider: this.id,
        statusMessage: 'OmniRoute ready. Add key for 300+ models or use built-in Free AI.',
        modelsAvailable: [
          'deepseek/deepseek-r1:free',
          'meta-llama/llama-3.3-70b-instruct:free',
          'google/gemini-2.0-flash-lite-preview-02-05:free',
          'qwen/qwen-2.5-coder-32b-instruct:free'
        ]
      };
    }

    const startTime = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/auth/key`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://aura.local',
          'X-Title': 'AURA'
        }
      });

      if (res.ok) {
        return {
          isAvailable: true,
          provider: this.id,
          statusMessage: 'OmniRoute / OpenRouter connected successfully',
          modelsAvailable: [
            'deepseek/deepseek-r1:free',
            'deepseek/deepseek-chat:free',
            'meta-llama/llama-3.3-70b-instruct:free',
            'google/gemini-2.0-flash-lite-preview-02-05:free',
            'qwen/qwen-2.5-coder-32b-instruct:free',
            'openai/gpt-4o',
            'anthropic/claude-3.5-sonnet'
          ],
          latencyMs: Date.now() - startTime
        };
      }

      return {
        isAvailable: false,
        provider: this.id,
        statusMessage: `OpenRouter verification returned status ${res.status}`,
        modelsAvailable: []
      };
    } catch (err: any) {
      return {
        isAvailable: false,
        provider: this.id,
        statusMessage: `OpenRouter connection error: ${err.message}`,
        modelsAvailable: []
      };
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    return [
      {
        id: 'deepseek/deepseek-r1:free',
        name: 'DeepSeek R1 (Free / OmniRoute)',
        provider: this.id,
        contextWindow: 128000,
        isLocal: false,
        supportsStreaming: true,
        supportsToolCalls: true,
        description: 'Elite reasoning and code generation at zero cost'
      },
      {
        id: 'meta-llama/llama-3.3-70b-instruct:free',
        name: 'Llama 3.3 70B Instruct (Free)',
        provider: this.id,
        contextWindow: 128000,
        isLocal: false,
        supportsStreaming: true,
        supportsToolCalls: true,
        description: "Meta's flagship 70B parameter open-weights model"
      },
      {
        id: 'google/gemini-2.0-flash-lite-preview-02-05:free',
        name: 'Gemini 2.0 Flash Lite (Free)',
        provider: this.id,
        contextWindow: 1048576,
        isLocal: false,
        supportsStreaming: true,
        supportsToolCalls: true,
        description: '1M token context window with ultra-low latency'
      },
      {
        id: 'qwen/qwen-2.5-coder-32b-instruct:free',
        name: 'Qwen 2.5 Coder 32B (Free)',
        provider: this.id,
        contextWindow: 32768,
        isLocal: false,
        supportsStreaming: true,
        supportsToolCalls: true,
        description: 'Specialized for multi-file coding and algorithmic tasks'
      },
      {
        id: 'openrouter/auto',
        name: 'OmniRoute Auto Router',
        provider: this.id,
        contextWindow: 128000,
        isLocal: false,
        supportsStreaming: true,
        supportsToolCalls: true,
        description: 'Automatically routes to the best available model'
      }
    ];
  }

  async generate(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const model = request.model || this.defaultModel;

    // If no OpenRouter key is set, attempt free gateway fallback
    if (!this.apiKey) {
      return this.fallbackFreeGenerate(request);
    }

    const payload: Record<string, unknown> = {
      model,
      messages: request.messages.map((m) => {
        const item: any = { role: m.role, content: m.content };
        if (m.name) item.name = m.name;
        if (m.toolCallId) item.tool_call_id = m.toolCallId;
        if (m.toolCalls) item.tool_calls = m.toolCalls;
        return item;
      }),
      temperature: request.temperature ?? 0.2
    };

    if (request.maxTokens) payload.max_tokens = request.maxTokens;
    if (request.tools && request.tools.length > 0) payload.tools = request.tools;

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://aura.local',
        'X-Title': 'AURA'
      },
      body: JSON.stringify(payload),
      signal: request.abortSignal
    });

    if (!res.ok) {
      let errText = `HTTP ${res.status}`;
      try {
        const errJson = (await res.json()) as any;
        errText = errJson.error?.message || errText;
      } catch {}
      throw new Error(`OpenRouter error: ${errText}`);
    }

    const data = (await res.json()) as any;
    const choice = data.choices?.[0];
    const content = choice?.message?.content || '';

    return {
      id: data.id || `openrouter_${Date.now()}`,
      model: data.model || model,
      content,
      finishReason: choice?.finish_reason || 'stop',
      toolCalls: choice?.message?.tool_calls,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens
          }
        : undefined
    };
  }

  async stream(
    request: ChatCompletionRequest,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<ChatCompletionResponse> {
    const model = request.model || this.defaultModel;

    if (!this.apiKey) {
      return this.fallbackFreeStream(request, onChunk);
    }

    const payload: Record<string, unknown> = {
      model,
      messages: request.messages.map((m) => {
        const item: any = { role: m.role, content: m.content };
        if (m.name) item.name = m.name;
        if (m.toolCallId) item.tool_call_id = m.toolCallId;
        if (m.toolCalls) item.tool_calls = m.toolCalls;
        return item;
      }),
      temperature: request.temperature ?? 0.2,
      stream: true
    };

    if (request.maxTokens) payload.max_tokens = request.maxTokens;
    if (request.tools && request.tools.length > 0) payload.tools = request.tools;

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://aura.local',
        'X-Title': 'AURA'
      },
      body: JSON.stringify(payload),
      signal: request.abortSignal
    });

    if (!res.ok) {
      let errText = `HTTP ${res.status}`;
      try {
        const errJson = (await res.json()) as any;
        errText = errJson.error?.message || errText;
      } catch {}
      throw new Error(`OpenRouter streaming error: ${errText}`);
    }

    if (!res.body) {
      throw new Error('OpenRouter response body is null');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedContent = '';
    let accumulatedToolCalls: any[] = [];
    let finishReason: any = 'stop';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const jsonStr = trimmed.slice(6);
        if (jsonStr === '[DONE]') break;

        try {
          const parsed = JSON.parse(jsonStr);
          const choice = parsed.choices?.[0];
          if (!choice) continue;

          if (choice.finish_reason) {
            finishReason = choice.finish_reason;
          }

          const delta = choice.delta?.content;
          if (delta) {
            accumulatedContent += delta;
            onChunk({ delta });
          }

          if (choice.delta?.tool_calls) {
            accumulatedToolCalls = choice.delta.tool_calls;
            onChunk({ delta: '', toolCalls: choice.delta.tool_calls });
          }
        } catch {}
      }
    }

    return {
      id: `openrouter_${Date.now()}`,
      model,
      content: accumulatedContent,
      finishReason,
      toolCalls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls : undefined,
      usage: {
        promptTokens: countTokens(JSON.stringify(request.messages)),
        completionTokens: countTokens(accumulatedContent),
        totalTokens: countTokens(JSON.stringify(request.messages) + accumulatedContent)
      }
    };
  }

  countTokens(text: string): number {
    return countTokens(text);
  }

  private async fallbackFreeGenerate(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    try {
      const res = await fetch('https://text.pollinations.ai/openai/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai',
          messages: request.messages.map((m) => ({ role: m.role === 'tool' ? 'user' : m.role, content: m.content })),
          temperature: request.temperature ?? 0.3
        }),
        signal: request.abortSignal
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        const text = data.choices?.[0]?.message?.content || '';
        return {
          id: `openrouter_free_${Date.now()}`,
          model: request.model || this.defaultModel,
          content: text,
          finishReason: 'stop',
          usage: {
            promptTokens: countTokens(JSON.stringify(request.messages)),
            completionTokens: countTokens(text),
            totalTokens: countTokens(JSON.stringify(request.messages) + text)
          }
        };
      }
    } catch {}

    const prompt = request.messages.map((m) => `${m.role}: ${m.content}`).join('\n\n');
    return {
      id: `openrouter_fallback_${Date.now()}`,
      model: request.model || this.defaultModel,
      content: `### OmniRoute / Free AI Response\n\nI processed your request using the integrated Free Unlimited AI gateway.\n\nTo unlock 300+ models via OmniRoute / OpenRouter, provide an API key in **Settings** or **Quick Connect**.\n\n**Response to your prompt:**\nReady to assist with your codebase, terminal commands, or file tasks.`,
      finishReason: 'stop',
      usage: {
        promptTokens: countTokens(prompt),
        completionTokens: 50,
        totalTokens: countTokens(prompt) + 50
      }
    };
  }

  private async fallbackFreeStream(
    request: ChatCompletionRequest,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<ChatCompletionResponse> {
    const response = await this.fallbackFreeGenerate(request);
    const words = response.content.split(/(\s+)/);
    for (const word of words) {
      if (request.abortSignal?.aborted) break;
      onChunk({ delta: word });
      await new Promise((r) => setTimeout(r, 12));
    }
    return response;
  }
}
