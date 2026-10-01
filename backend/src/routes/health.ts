import { Router } from 'express';
import { pool } from '../shared/db';
import redis from '../shared/redis';

const router = Router();

// Liveness: always 200 if the process is running
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Readiness: checks DB and Redis before serving traffic
router.get('/ready', async (_req, res) => {
  const checks: { db: string; redis: string } = { db: 'ok', redis: 'ok' };
  let statusCode = 200;

  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
  } catch {
    checks.db = 'error';
    statusCode = 503;
  }

  try {
    await redis.ping();
  } catch {
    checks.redis = 'error';
    statusCode = 503;
  }

  res.status(statusCode).json({ status: statusCode === 200 ? 'ok' : 'error', checks });
});

export default router;