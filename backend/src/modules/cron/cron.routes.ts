import { Router } from 'express';
import { cleanupExpiredOtps } from '../../worker/handlers/cleanupExpiredOtps';
import { cleanupExpiredTokens } from '../../worker/handlers/cleanupExpiredTokens';
import { sendRecruiterDigest } from '../../worker/handlers/sendRecruiterDigest';

const router = Router();

// Vercel Cron sends "Authorization: Bearer <CRON_SECRET>" automatically.
router.get('/daily', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const results: Record<string, string> = {};
  const run = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      results[name] = 'ok';
    } catch (err) {
      console.error(`cron ${name} failed`, err);
      results[name] = 'failed';
    }
  };

  await run('cleanupOtps', cleanupExpiredOtps);
  await run('cleanupTokens', cleanupExpiredTokens);
  if (new Date().getUTCDay() === 1) {
    await run('recruiterDigest', sendRecruiterDigest);
  }

  res.json(results);
});

export default router;