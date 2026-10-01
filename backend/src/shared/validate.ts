import { z, ZodSchema, ZodError } from 'zod';

export class ValidationError extends Error {
  constructor(public readonly zodError: ZodError) {
    super('Validation failed');
    this.name = 'ValidationError';
  }
}

export function validateBody<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new ValidationError(result.error);
  return result.data;
}

export function validateQuery<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new ValidationError(result.error);
  return result.data;
}

export function validateParam<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new ValidationError(result.error);
  return result.data;
}

export const uuidParam = z.string().uuid({ message: 'Invalid ID format' });