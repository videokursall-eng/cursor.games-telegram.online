import { Router, Request, Response } from 'express';
import { config } from '../config';
import { validateInitData } from '../middleware/auth';

const router = Router();

router.post('/verify', (req: Request, res: Response) => {
  const { initData } = req.body as { initData?: string };

  if (!initData) {
    // Dev mode fallback
    if (config.isDev) {
      return res.json({
        ok: true,
        user: {
          id: 12345,
          first_name: 'Test',
          last_name: 'User',
          username: 'testuser',
        },
        botUsername: config.botUsername,
        appName: config.appName,
      });
    }
    return res.status(400).json({ error: 'Missing initData' });
  }

  try {
    const validated = validateInitData(initData, config.botToken);
    return res.json({
      ok: true,
      user: validated.user,
      startParam: validated.start_param,
      botUsername: config.botUsername,
      appName: config.appName,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Validation failed';
    return res.status(401).json({ error: message });
  }
});

export default router;
