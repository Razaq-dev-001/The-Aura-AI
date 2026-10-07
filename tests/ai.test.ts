import { describe, it, expect } from 'vitest';
import { ProviderRegistry } from '../packages/ai/src/registry.js';
import { OpenAIProvider } from '../packages/ai/src/providers/openai.js';
import { UserSettings } from '@aura/shared';

describe('AURA AI Provider Registry & ChatGPT Integration', () => {
  it('should initialize registry with all standard providers', () => {
    const registry = new ProviderRegistry();
    const openai = registry.getProvider('openai');
    const gemini = registry.getProvider('gemini');
    const anthropic = registry.getProvider('anthropic');
    const ollama = registry.getProvider('ollama');
    const local = registry.getProvider('local-aura-engine');

    expect(openai).toBeDefined();
    expect(openai.id).toBe('openai');
    expect(gemini.id).toBe('gemini');
    expect(anthropic.id).toBe('anthropic');
    expect(ollama.id).toBe('ollama');
    expect(local.id).toBe('local-aura-engine');
  });

  it('should route model names to their respective providers automatically', () => {
    const registry = new ProviderRegistry();

    // ChatGPT & OpenAI models
    expect(registry.getProviderForModel('gpt-4o').id).toBe('openai');
    expect(registry.getProviderForModel('gpt-4o-mini').id).toBe('openai');
    expect(registry.getProviderForModel('o3-mini').id).toBe('openai');
    expect(registry.getProviderForModel('o1').id).toBe('openai');
    expect(registry.getProviderForModel('chatgpt-4o-latest').id).toBe('openai');

    // Gemini models
    expect(registry.getProviderForModel('gemini-2.0-flash').id).toBe('gemini');
    expect(registry.getProviderForModel('gemini-1.5-pro').id).toBe('gemini');

    // Claude models
    expect(registry.getProviderForModel('claude-3-5-sonnet-20241022').id).toBe('anthropic');

    // Ollama models
    expect(registry.getProviderForModel('qwen2.5-coder:latest').id).toBe('ollama');
    expect(registry.getProviderForModel('llama3.2:latest').id).toBe('ollama');
    expect(registry.getProviderForModel('deepseek-coder:6.7b').id).toBe('ollama');

    // Built-in fallback
    expect(registry.getProviderForModel('aura-deep-reasoner-v1').id).toBe('local-aura-engine');
  });

  it('should synchronize runtime provider instances with database settings', () => {
    const registry = new ProviderRegistry();
    const mockSettings: UserSettings = {
      id: 'default',
      defaultProvider: 'openai',
      defaultModel: 'gpt-4o',
      ollamaBaseUrl: 'http://localhost:11434',
      openaiBaseUrl: 'https://openrouter.ai/api/v1',
      openaiApiKey: 'sk-test-openai-key-12345',
      geminiApiKey: 'AIza-test-gemini-key',
      anthropicApiKey: 'sk-ant-test-key',
      agentMode: 'AUTONOMOUS',
      autoApproveSafeCommands: true,
      maxIterations: 20,
      commandTimeoutMs: 60000,
      defaultProjectsDir: './projects',
      memoryEnabled: true,
      theme: 'dark',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    registry.syncWithSettings(mockSettings);

    const openai = registry.getOpenAIProvider();
    expect(openai.hasApiKey()).toBe(true);
  });

  it('should list all ChatGPT models with descriptions and context windows', async () => {
    const openai = new OpenAIProvider();
    const models = await openai.listModels();

    expect(models.length).toBeGreaterThanOrEqual(5);
    const gpt4o = models.find((m) => m.id === 'gpt-4o');
    expect(gpt4o).toBeDefined();
    expect(gpt4o?.contextWindow).toBe(128000);
    expect(gpt4o?.supportsStreaming).toBe(true);
    expect(gpt4o?.supportsToolCalls).toBe(true);

    const o3mini = models.find((m) => m.id === 'o3-mini');
    expect(o3mini).toBeDefined();
    expect(o3mini?.contextWindow).toBe(200000);
  });

  it('should handle unconfigured OpenAI API key gracefully with clear error message', async () => {
    const openai = new OpenAIProvider({ apiKey: '' });
    const health = await openai.healthCheck();

    expect(health.isAvailable).toBe(false);
    expect(health.statusMessage).toContain('API key is not configured');

    await expect(
      openai.generate({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'test' }]
      })
    ).rejects.toThrow(/OpenAI API key is missing/);
  });

  it('should support FreeAIProvider with zero configuration and instant response', async () => {
    const registry = new ProviderRegistry();
    const freeAi = registry.getProvider('free-ai');
    expect(freeAi).toBeDefined();
    expect(freeAi.id).toBe('free-ai');

    const health = await freeAi.healthCheck();
    expect(health.isAvailable).toBe(true);

    const models = await freeAi.listModels();
    expect(models.length).toBeGreaterThanOrEqual(4);
    expect(models.some((m) => m.id === 'free-gpt-4o')).toBe(true);

    expect(registry.getProviderForModel('free-gpt-4o').id).toBe('free-ai');
    expect(registry.getProviderForModel('free-deepseek-r1').id).toBe('free-ai');
  });

  it('should support OpenRouterProvider and route free models automatically', async () => {
    const registry = new ProviderRegistry();
    const openrouter = registry.getProvider('openrouter');
    expect(openrouter).toBeDefined();
    expect(openrouter.id).toBe('openrouter');

    expect(registry.getProviderForModel('deepseek/deepseek-r1:free').id).toBe('openrouter');
    expect(registry.getProviderForModel('meta-llama/llama-3.3-70b-instruct:free').id).toBe('openrouter');
    expect(registry.getProviderForModel('openrouter/auto').id).toBe('openrouter');
  });
});
