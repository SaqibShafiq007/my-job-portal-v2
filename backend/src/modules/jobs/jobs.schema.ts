import { z } from 'zod';

const screeningQuestionInputSchema = z.object({
  text:     z.string().min(1, 'Question text is required').max(500),
  type:     z.enum(['text', 'boolean', 'url']),
  required: z.boolean().default(true),
});

const jobFieldsSchema = z.object({
  title:               z.string().min(1, 'Title is required').max(200),
  description:         z.string().min(1, 'Description is required').max(100_000),
  status:              z.enum(['draft', 'open']),
  deadline:            z.string().date('Deadline must be a date in YYYY-MM-DD format').optional(),
  attributes:          z.object({}).catchall(z.unknown()),
  screening_questions: z.array(screeningQuestionInputSchema),
});

export const createJobSchema = jobFieldsSchema.extend({
  status:              z.enum(['draft', 'open']).default('draft'),
  attributes:          z.object({}).catchall(z.unknown()).default({}),
  screening_questions: z.array(screeningQuestionInputSchema).default([]),
});

export const updateJobSchema = jobFieldsSchema.partial();

export const listJobsQuerySchema = z.object({
  status: z.enum(['draft', 'open', 'closed']).optional(),
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
});

export const listCompanyJobsSchema = z.object({
  status: z.enum(['draft', 'open', 'closed']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateJobInput   = z.infer<typeof createJobSchema>;
export type UpdateJobInput   = z.infer<typeof updateJobSchema>;
export type ListJobsQuery    = z.infer<typeof listJobsQuerySchema>;
export type ListCompanyJobsInput = z.infer<typeof listCompanyJobsSchema>;


