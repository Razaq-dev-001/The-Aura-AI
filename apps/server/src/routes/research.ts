import { Router, Request, Response } from 'express';
import { performWebSearch } from '@aura/tools';

export const researchRouter = Router();

researchRouter.post('/search', async (req: Request, res: Response) => {
  const { query, limit } = req.body;
  if (!query || typeof query !== 'string') {
    res.status(400).json({ error: 'Search query is required' });
    return;
  }

  try {
    const results = await performWebSearch(query, limit || 5);
    res.json({ query, results, total: results.length });
  } catch (err: any) {
    res.status(500).json({ error: `Search failed: ${err.message}` });
  }
});
