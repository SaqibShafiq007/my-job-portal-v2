import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { config } from './config';
import { AppError } from './errors';
import { ValidationError } from './validate';
import logger from './logger';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction, // four-parameter signature required for Express to recognise this as an error handler
): void {
  if (err instanceof ValidationError) {
    const details = err.zodError.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));

    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details,
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // express.json() sends a SyntaxError with a status property when the request body is malformed JSON
  if (err instanceof SyntaxError && 'status' in err && (err as SyntaxError & { status: number }).status === 400) {
    res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'Malformed JSON in request body',
      },
    });
    return;
  }

    logger.error({ requestId: req.id, err }, 'unhandled error');

  const message =
    config.NODE_ENV === 'development' && err instanceof Error
      ? err.message
      : 'An unexpected error occurred';

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message,
    },
  });
}