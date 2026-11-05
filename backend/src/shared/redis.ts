// src/shared/redis.ts
import { createClient } from 'redis';
import { config } from './config';
import logger from './logger';

const redis = createClient({
  url: config.REDIS_URL,
  RESP: 2, // force RESP2 protocol, avoids HELLO handshake issues
  socket: {
    connectTimeout: 5000,
    // retry with backoff (max 3s between attempts) instead of giving up
    reconnectStrategy: (retries) => Math.min(retries * 200, 3000),
  },
});

redis.on('error', (err) => {
  logger.error({ err }, 'Redis Client Error');
});

// Don't kill the process if the first connect fails; the client keeps retrying.
redis.connect().catch((err) => {
  logger.error({ err }, 'Failed to connect to Redis');
});

export default redis;