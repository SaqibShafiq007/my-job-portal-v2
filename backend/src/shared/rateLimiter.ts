import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import redis from './redis';
import { config } from './config';

// Global limiter: applies to all routes
export const globalLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX,
  standardHeaders: true,    // include RateLimit-* headers in response
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.sendCommand(args),
  }),
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests',
      },
    });
  },
});

// Stricter limiter for auth routes: 10 requests per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.sendCommand(args),
    prefix: 'rl:auth:',   // separate Redis key namespace from global limiter
  }),
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests',
      },
    });
  },
});