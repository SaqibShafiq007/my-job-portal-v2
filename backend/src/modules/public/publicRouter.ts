import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validateQuery, validateParam, uuidParam } from '../../shared/validate';
import { getPublicJobs, getPublicJobById } from './publicService';

export const publicRouter = Router();

const listQuerySchema = z.object({
  q:      z.string().optional(),
  cursor: z.string().optional(),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
});

publicRouter.get('/jobs', async (req: Request, res: Response) => {
  const query = validateQuery(listQuerySchema, req.query);
  const result = await getPublicJobs(query);
  res.json(result);
});

publicRouter.get('/jobs/:id', async (req: Request, res: Response) => {
  const id = validateParam(uuidParam, req.params.id);
  const job = await getPublicJobById(id);
  res.json(job);
});