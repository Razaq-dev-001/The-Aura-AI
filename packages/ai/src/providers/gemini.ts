import {
  AIProvider,
  ModelInfo,
  ProviderHealth,
  ChatCompletionRequest,
  ChatCompletionResponse,
  StreamChunk
} from '@aura/shared';
import { countTokens } from '../tokenizer.js';

export interface GeminiConfig {
  apiKey?: string;
  defaultModel?: string;
}

export class GeminiProvider implements AIProvider {
  readonly id = 'gemini';
  readonly name = 'Google Gemini (Cloud)';
  readonly isLocal = false;

  private apiKey: string;
  private defaultModel: string;

  constructor(config?: GeminiConfig) {
    this.apiKey = config?.apiKey || process.env.GEMINI_API_KEY || '';
    this.defaultModel = config?.defaultModel || process.env.GEMINI_DEFAULT_MODEL || 'gemini-2.0-flash';
  }

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  async healthCheck(): Promise<ProviderHealth> {
    if (!this.apiKey) {
      return {
        isAvailable: false,
        provider: this.id,
        statusMessage: 'Gemini API key is not configured',
        modelsAvailable: []
      };
    }

    const startTime = Date.now();
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`
      );

      if (!res.ok) {
        return {
          isAvailable: false,
          provider: this.id,
          statusMessage: `Gemini API authentication failed (HTTP ${res.status})`,
          modelsAvailable: [],
          error: `HTTP ${res.status} ${res.statusText}`
        };
      }

      const data = (await res.json()) as any;
      const models = (data.models || [])
        .map((m: any) => m.name.replace('models/', ''))
        .filter((name: string) => name.includes('gemini'));

      return {
        isAvailable: true,
        provider: this.id,
        statusMessage: `Connected to Google Gemini API (${models.length} models available)`,
        modelsAvailable: models,
        latencyMs: Date.now() - startTime
      };
    } catch (err: any) {
      return {
        isAvailable: false,
        provider: this.id,
        statusMessage: 'Failed to connect to Google Gemini API',
        modelsAvailable: [],
        error: err.message
      };
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    return [
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash (Fast, Free tier)',
        provider: this.id,
        contextWindow: 1048576,
        isLocal: false,
        supportsStreaming: true,
        supportsToolCalls: true,
        description: 'Next-gen multimodal workhorse model'
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro (Deep Reasoning)',
        provider: this.id,
        contextWindow: 2097152,
        isLocal: false,
        supportsStreaming: true,
        supportsToolCalls: true,
        description: 'Large context reasoning model'
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash (Lightweight)',
        provider: this.id,
        contextWindow: 1048576,
        isLocal: false,
        supportsStreaming: true,
        supportsToolCalls: true,
        description: 'Fast, lightweight multimodal model'
      }
    ];
  }

  async generate(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    if (!this.apiKey) {
      throw new Error('Gemini API key is required. Please configure it in Settings.');
    }

    const model = request.model || this.defaultModel;
    const contents = this.formatMessages(request.messages);
    const systemInstruction = this.extractSystemInstruction(request.messages);

    const body: Record<string, any> = {
      contents,
      generationConfig: {
        temperature: request.temperature ?? 0.2,
        maxOutputTokens: request.maxTokens ?? 4096
      }
    };

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    if (request.tools && request.tools.length > 0) {
      body.tools = [
        {
          functionDeclarations: request.tools.map((t) => ({
            name: t.function.name,
            description: t.function.description,
            parameters: t.function.parameters
          }))
        }
      ];
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: request.abortSignal
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as any;
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    let textContent = '';
    const toolCalls: any[] = [];

    for (const part of parts) {
      if (part.text) {
        textContent += part.text;
      }
      if (part.functionCall) {
        toolCalls.push({
          id: `call_${Date.now()}_${toolCalls.length}`,
          name: part.functionCall.name,
          arguments: part.functionCall.args || {}
        });
      }
    }

    return {
      id: `gemini_${Date.now()}`,
      model,
      content: textContent,
      finishReason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || countTokens(JSON.stringify(request.messages)),
        completionTokens: data.usageMetadata?.candidatesTokenCount || countTokens(textContent),
        totalTokens: data.usageMetadata?.totalTokenCount || countTokens(JSON.stringify(request.messages) + textContent)
      }
    };
  }

  async stream(
    request: ChatCompletionRequest,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<ChatCompletionResponse> {
    if (!this.apiKey) {
      throw new Error('Gemini API key is required. Please configure it in Settings.');
    }

    const model = request.model || this.defaultModel;
    const contents = this.formatMessages(request.messages);
    const systemInstruction = this.extractSystemInstruction(request.messages);

    const body: Record<string, any> = {
      contents,
      generationConfig: {
        temperature: request.temperature ?? 0.2,
        maxOutputTokens: request.maxTokens ?? 4096
      }
    };

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    if (request.tools && request.tools.length > 0) {
      body.tools = [
        {
          functionDeclarations: request.tools.map((t) => ({
            name: t.function.name,
            description: t.function.description,
            parameters: t.function.parameters
          }))
        }
      ];
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: request.abortSignal
    });

    if (!res.ok || !res.body) {
      const errText = await res.text();
      throw new Error(`Gemini stream error (${res.status}): ${errText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = '';
    let buffer = '';
    const toolCalls: any[] = [];

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
            const candidate = parsed.candidates?.[0];
            const parts = candidate?.content?.parts || [];

            for (const part of parts) {
              if (part.text) {
                accumulatedText += part.text;
                onChunk({ delta: part.text });
              }
              if (part.functionCall) {
                toolCalls.push({
                  id: `call_${Date.now()}_${toolCalls.length}`,
                  name: part.functionCall.name,
                  arguments: part.functionCall.args || {}
                });
              }
            }
          } catch {
            // Ignore partial SSE JSON parse issues
          }
        }
      }
    }

    return {
      id: `gemini_${Date.now()}`,
      model,
      content: accumulatedText,
      finishReason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
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

  private extractSystemInstruction(messages: any[]): string | undefined {
    const sysMsg = messages.find((m) => m.role === 'system');
    return sysMsg?.content;
  }

  private formatMessages(messages: any[]): any[] {
    return messages
      .filter((m) => m.role !== 'system')
      .map((m) => {
        let role = 'user';
        if (m.role === 'assistant') role = 'model';
        if (m.role === 'tool') role = 'function';

        return {
          role,
          parts: [{ text: m.content }]
        };
      });
  }
}
