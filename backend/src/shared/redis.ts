// src/shared/redis.ts
import { createClient } from 'redis';
import { config } from './config';
import logger from './logger';

const redis = createClient({
  url: config.REDIS_URL,
  RESP: 2, // force RESP2 protocol, avoids HELLO handshake issues
});

redis.on('error', (err) => {
  logger.error({ err },'Redis Client Error');
});

redis.connect().catch((err) => {
  logger.error({ err } ,'Failed to connect to Redis');
  process.exit(1);
});

export default redis;