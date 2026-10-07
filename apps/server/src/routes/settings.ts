import { Router, Request, Response } from 'express';
import { UserSettingsRepository } from '@aura/database';
import { globalProviderRegistry } from '@aura/ai';

export const settingsRouter = Router();
const settingsRepo = new UserSettingsRepository();

settingsRouter.get('/', (_req: Request, res: Response) => {
  const settings = settingsRepo.getSettings();
  globalProviderRegistry.syncWithSettings(settings);

  // Redact API keys when sending to frontend
  const safeSettings = {
    ...settings,
    geminiApiKey: settings.geminiApiKey ? '••••••••' + settings.geminiApiKey.slice(-4) : '',
    openaiApiKey: settings.openaiApiKey ? '••••••••' + settings.openaiApiKey.slice(-4) : '',
    anthropicApiKey: settings.anthropicApiKey ? '••••••••' + settings.anthropicApiKey.slice(-4) : '',
    openrouterApiKey: settings.openrouterApiKey ? '••••••••' + settings.openrouterApiKey.slice(-4) : ''
  };
  res.json({ settings: safeSettings });
});

settingsRouter.patch('/', (req: Request, res: Response) => {
  // If user passes empty string or masked key, ignore key update
  const payload = { ...req.body };
  if (payload.geminiApiKey && payload.geminiApiKey.startsWith('••••••••')) {
    delete payload.geminiApiKey;
  }
  if (payload.openaiApiKey && payload.openaiApiKey.startsWith('••••••••')) {
    delete payload.openaiApiKey;
  }
  if (payload.anthropicApiKey && payload.anthropicApiKey.startsWith('••••••••')) {
    delete payload.anthropicApiKey;
  }
  if (payload.openrouterApiKey && payload.openrouterApiKey.startsWith('••••••••')) {
    delete payload.openrouterApiKey;
  }

  const updated = settingsRepo.updateSettings(payload);
  globalProviderRegistry.syncWithSettings(updated);

  res.json({ settings: updated });
});
