import { Request, Response, NextFunction } from 'express';
import logger from '../shared/logger';

// Log request received and response completed with timing
export function httpLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  logger.info({ requestId: req.id, method: req.method, url: req.url }, 'request received');

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    logger.info(
      {
        requestId: req.id,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        durationMs,
      },
      'request completed'
    );
  });

  next();
}