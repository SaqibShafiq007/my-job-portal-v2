import { z } from 'zod';

export const createCompanySchema = z.object({
  name: z.string().min(2).max(100),
  website: z.string().url().optional(),
  description: z.string().max(2000).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['hr_manager', 'recruiter', 'hiring_manager']),
});

export const updateMemberSchema = z.object({
  role: z.enum(['hr_manager', 'recruiter', 'hiring_manager']),
});

export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;