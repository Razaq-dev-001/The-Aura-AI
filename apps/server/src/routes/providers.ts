import { Router, Request, Response } from 'express';
import { globalProviderRegistry } from '@aura/ai';
import { UserSettingsRepository } from '@aura/database';

export const providersRouter = Router();
const settingsRepo = new UserSettingsRepository();

providersRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const settings = settingsRepo.getSettings();
    globalProviderRegistry.syncWithSettings(settings);

    const health = await globalProviderRegistry.getAllHealth();
    const models = await globalProviderRegistry.getAllModels();
    res.json({ health, models });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

providersRouter.post('/test', async (req: Request, res: Response) => {
  try {
    const { providerId, apiKey, baseUrl } = req.body;
    const settings = settingsRepo.getSettings();
    globalProviderRegistry.syncWithSettings(settings);

    const provider = globalProviderRegistry.getProvider(providerId);

    // If caller provided a specific key/baseUrl to test on the fly
    if (providerId === 'openai' && apiKey) {
      const openai = globalProviderRegistry.getOpenAIProvider();
      openai.setApiKey(apiKey);
      if (baseUrl) openai.setBaseUrl(baseUrl);
    }

    if (providerId === 'openrouter' && apiKey) {
      const openrouter = globalProviderRegistry.getOpenRouterProvider();
      openrouter.setApiKey(apiKey);
    }

    const health = await provider.healthCheck();
    res.json({ health });
  } catch (err: any) {
    res.status(500).json({
      health: {
        isAvailable: false,
        provider: req.body?.providerId || 'unknown',
        statusMessage: err.message,
        modelsAvailable: [],
        error: err.message
      }
    });
  }
});

providersRouter.post('/connect-omniroute', async (req: Request, res: Response) => {
  const { apiKey, defaultModel } = req.body;

  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 5) {
    res.status(400).json({
      success: false,
      error: 'Please provide a valid OpenRouter / OmniRoute API key (starts with sk-or-v1-...)'
    });
    return;
  }

  const cleanKey = apiKey.trim();
  const cleanModel = defaultModel?.trim() || 'deepseek/deepseek-r1:free';

  try {
    const openrouter = globalProviderRegistry.getOpenRouterProvider();
    openrouter.setApiKey(cleanKey);

    const health = await openrouter.healthCheck();
    if (!health.isAvailable) {
      res.status(400).json({
        success: false,
        health,
        error: health.statusMessage || 'Failed to authenticate with OpenRouter'
      });
      return;
    }

    const updated = settingsRepo.updateSettings({
      openrouterApiKey: cleanKey,
      defaultProvider: 'openrouter',
      defaultModel: cleanModel
    });

    globalProviderRegistry.syncWithSettings(updated);

    res.json({
      success: true,
      health,
      settings: {
        ...updated,
        openrouterApiKey: '••••••••' + cleanKey.slice(-4)
      }
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Error connecting to OpenRouter'
    });
  }
});

providersRouter.post('/connect-chatgpt', async (req: Request, res: Response) => {
  const { apiKey, baseUrl, defaultModel } = req.body;

  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 5) {
    res.status(400).json({
      success: false,
      error: 'Please provide a valid OpenAI API key (typically starts with sk-...)'
    });
    return;
  }

  const cleanKey = apiKey.trim();
  const cleanBaseUrl = baseUrl?.trim() || 'https://api.openai.com/v1';
  const cleanModel = defaultModel?.trim() || 'gpt-4o';

  try {
    const openai = globalProviderRegistry.getOpenAIProvider();
    openai.setApiKey(cleanKey);
    openai.setBaseUrl(cleanBaseUrl);

    // Test health immediately
    const health = await openai.healthCheck();
    if (!health.isAvailable) {
      res.status(400).json({
        success: false,
        health,
        error: health.statusMessage || 'Failed to authenticate with OpenAI'
      });
      return;
    }

    // Save verified settings to database
    const updated = settingsRepo.updateSettings({
      openaiApiKey: cleanKey,
      openaiBaseUrl: cleanBaseUrl,
      defaultProvider: 'openai',
      defaultModel: cleanModel
    });

    globalProviderRegistry.syncWithSettings(updated);

    res.json({
      success: true,
      health,
      settings: {
        ...updated,
        openaiApiKey: '••••••••' + cleanKey.slice(-4)
      }
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Error connecting to OpenAI'
    });
  }
});
