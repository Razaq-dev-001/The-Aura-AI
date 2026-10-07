import {
  AIProvider,
  ModelInfo,
  ProviderHealth,
  ChatCompletionRequest,
  ChatCompletionResponse,
  StreamChunk,
  UserSettings
} from '@aura/shared';
import { OllamaProvider } from './providers/ollama.js';
import { GeminiProvider } from './providers/gemini.js';
import { OpenAIProvider } from './providers/openai.js';
import { AnthropicProvider } from './providers/anthropic.js';
import { MockLocalProvider } from './providers/mock.js';
import { FreeAIProvider } from './providers/freeai.js';
import { OpenRouterProvider } from './providers/openrouter.js';

export class ProviderRegistry {
  private providers: Map<string, AIProvider> = new Map();
  private defaultProviderId = 'free-ai';

  constructor() {
    this.register(new FreeAIProvider());
    this.register(new OpenRouterProvider());
    this.register(new OpenAIProvider());
    this.register(new GeminiProvider());
    this.register(new AnthropicProvider());
    this.register(new OllamaProvider());
    this.register(new MockLocalProvider());
  }

  register(provider: AIProvider): void {
    this.providers.set(provider.id, provider);
  }

  getProvider(id?: string): AIProvider {
    const targetId = id || this.defaultProviderId;
    const provider = this.providers.get(targetId);
    if (provider) return provider;

    // Fallback to Free AI provider or local offline engine
    return this.providers.get('free-ai') || this.providers.get('local-aura-engine')!;
  }

  getFreeAIProvider(): FreeAIProvider {
    return this.providers.get('free-ai') as FreeAIProvider;
  }

  getOpenRouterProvider(): OpenRouterProvider {
    return this.providers.get('openrouter') as OpenRouterProvider;
  }

  getOpenAIProvider(): OpenAIProvider {
    return this.providers.get('openai') as OpenAIProvider;
  }

  getGeminiProvider(): GeminiProvider {
    return this.providers.get('gemini') as GeminiProvider;
  }

  getAnthropicProvider(): AnthropicProvider {
    return this.providers.get('anthropic') as AnthropicProvider;
  }

  getOllamaProvider(): OllamaProvider {
    return this.providers.get('ollama') as OllamaProvider;
  }

  /**
   * Synchronizes runtime providers with user settings from the database.
   */
  syncWithSettings(settings: UserSettings): void {
    if (!settings) return;

    if (settings.defaultProvider) {
      this.defaultProviderId = settings.defaultProvider;
    }

    const openrouter = this.getOpenRouterProvider();
    if (openrouter && (settings as any).openrouterApiKey) {
      openrouter.setApiKey((settings as any).openrouterApiKey);
    }

    const openai = this.getOpenAIProvider();
    if (openai) {
      if (settings.openaiApiKey) {
        openai.setApiKey(settings.openaiApiKey);
      }
      if (settings.openaiBaseUrl) {
        openai.setBaseUrl(settings.openaiBaseUrl);
      }
      if (settings.defaultModel && (settings.defaultModel.startsWith('gpt') || settings.defaultModel.startsWith('o1') || settings.defaultModel.startsWith('o3'))) {
        openai.setDefaultModel(settings.defaultModel);
      }
    }

    const gemini = this.getGeminiProvider();
    if (gemini && settings.geminiApiKey) {
      gemini.setApiKey(settings.geminiApiKey);
    }

    const anthropic = this.getAnthropicProvider();
    if (anthropic && settings.anthropicApiKey) {
      anthropic.setApiKey(settings.anthropicApiKey);
    }

    const ollama = this.getOllamaProvider();
    if (ollama && settings.ollamaBaseUrl) {
      ollama.setBaseUrl(settings.ollamaBaseUrl);
    }
  }

  /**
   * Intelligently resolves the optimal AI provider for any selected model name.
   */
  getProviderForModel(modelName?: string, fallbackProviderId?: string): AIProvider {
    if (!modelName) {
      return this.getProvider(fallbackProviderId || this.defaultProviderId);
    }

    const m = modelName.toLowerCase();

    // 1. Free AI models (Zero key required)
    if (m.startsWith('free-') || m.startsWith('freeai') || m === 'free') {
      return this.getProvider('free-ai');
    }

    // 2. OpenRouter / OmniRoute models (e.g., deepseek/deepseek-r1:free, meta-llama/..., openrouter/auto)
    if (
      m.startsWith('openrouter/') ||
      m.includes(':free') ||
      m.startsWith('deepseek/') ||
      m.startsWith('meta-llama/') ||
      m.startsWith('mistralai/')
    ) {
      return this.getProvider('openrouter');
    }

    // 3. OpenAI / ChatGPT models
    if (
      m.startsWith('gpt-') ||
      m.startsWith('o1') ||
      m.startsWith('o3') ||
      m.startsWith('chatgpt') ||
      m.startsWith('text-embedding') ||
      m.startsWith('openai/')
    ) {
      return this.getProvider('openai');
    }

    // 4. Google Gemini models
    if (m.startsWith('gemini') || m.startsWith('google/')) {
      return this.getProvider('gemini');
    }

    // 5. Anthropic Claude models
    if (m.startsWith('claude') || m.startsWith('anthropic/')) {
      return this.getProvider('anthropic');
    }

    // 6. Built-in Offline Engine
    if (m.startsWith('aura-') || m.startsWith('local-aura')) {
      return this.getProvider('local-aura-engine');
    }

    // 7. Ollama models
    if (
      m.includes(':') ||
      m.startsWith('qwen') ||
      m.startsWith('llama') ||
      m.startsWith('deepseek') ||
      m.startsWith('mistral') ||
      m.startsWith('codellama') ||
      m.startsWith('phi') ||
      m.startsWith('gemma') ||
      m.startsWith('starcoder')
    ) {
      return this.getProvider('ollama');
    }

    return this.getProvider(fallbackProviderId || this.defaultProviderId);
  }

  setDefaultProvider(id: string): void {
    if (this.providers.has(id)) {
      this.defaultProviderId = id;
    }
  }

  async getAllHealth(): Promise<ProviderHealth[]> {
    const results: ProviderHealth[] = [];
    for (const provider of this.providers.values()) {
      try {
        const health = await provider.healthCheck();
        results.push(health);
      } catch (err: any) {
        results.push({
          isAvailable: false,
          provider: provider.id,
          statusMessage: 'Error checking provider health',
          modelsAvailable: [],
          error: err.message
        });
      }
    }
    return results;
  }

  async getAllModels(): Promise<ModelInfo[]> {
    const models: ModelInfo[] = [];
    for (const provider of this.providers.values()) {
      try {
        const providerModels = await provider.listModels();
        models.push(...providerModels);
      } catch {
        // Skip provider if model listing fails
      }
    }
    return models;
  }

  async generate(request: ChatCompletionRequest, providerId?: string): Promise<ChatCompletionResponse> {
    const provider = providerId
      ? this.getProvider(providerId)
      : this.getProviderForModel(request.model);

    try {
      return await provider.generate(request);
    } catch (err: any) {
      // First attempt fallback to free-ai
      if (provider.id !== 'free-ai') {
        try {
          const freeAi = this.getProvider('free-ai');
          return await freeAi.generate(request);
        } catch {}
      }

      // If that also fails, fallback to local offline engine gracefully
      if (provider.id !== 'local-aura-engine') {
        const fallback = this.getProvider('local-aura-engine');
        return await fallback.generate(request);
      }
      throw err;
    }
  }

  async stream(
    request: ChatCompletionRequest,
    onChunk: (chunk: StreamChunk) => void,
    providerId?: string
  ): Promise<ChatCompletionResponse> {
    const provider = providerId
      ? this.getProvider(providerId)
      : this.getProviderForModel(request.model);

    try {
      return await provider.stream(request, onChunk);
    } catch (err: any) {
      // First attempt fallback to free-ai
      if (provider.id !== 'free-ai') {
        try {
          const freeAi = this.getProvider('free-ai');
          return await freeAi.stream(request, onChunk);
        } catch {}
      }

      // If that also fails, fallback to local offline engine gracefully
      if (provider.id !== 'local-aura-engine') {
        const fallback = this.getProvider('local-aura-engine');
        return await fallback.stream(request, onChunk);
      }
      throw err;
    }
  }
}

export const globalProviderRegistry = new ProviderRegistry();
