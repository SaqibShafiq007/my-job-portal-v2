// backend/src/modules/applicants/applicants.service.ts
import * as repo from './applicants.repo';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors';
import { v4 as uuidv4 } from 'uuid';
import { getPresignedUploadUrl } from '../../shared/storage';
import {config} from '../../shared/config';
import { pool } from '../../shared/db';
import queue from '../../shared/queue';
import { findUserById } from '../auth/auth.repo';

export async function createProfile(
  userId: string,
  body: {
    full_name: string;
    headline?: string;
    location?: string;
    attributes?: Record<string, unknown>;
  },
) {
  const existing = await repo.findApplicantByUserId(userId);
  if (existing) throw new ConflictError('Profile already exists');
  return repo.createApplicantProfile(
    userId,
    body.full_name,
    body.headline,
    body.location,
    body.attributes ?? {},
  );
}

export async function getProfile(userId: string) {
  const profile = await repo.findApplicantByUserId(userId);
  if (!profile) throw new NotFoundError('Profile not found');
  return profile;
}

export async function updateProfile(
  userId: string,
  fields: {
    full_name?: string;
    headline?: string;
    location?: string;
    attributes?: Record<string, unknown>;
  },
) {
  const profile = await repo.findApplicantByUserId(userId);
  if (!profile) throw new NotFoundError('Profile not found');
  return repo.updateApplicantProfile(profile.id, fields);
}


export async function getResumeUploadUrl(userId: string) {
  const profile = await repo.findApplicantByUserId(userId);
  if (!profile) throw new NotFoundError('Profile not found — create your profile first');

  const key = `resumes/${profile.id}/${uuidv4()}.pdf`;
  const uploadUrl = await getPresignedUploadUrl(key, 'application/pdf');
  return { uploadUrl, key };
}

// Confirms a résumé upload, creates the DB record, and enqueues background word-count processing
export async function confirmResumeUpload(
  userId: string,
  body: { key: string; filename: string }
) {
  const profile = await repo.findApplicantByUserId(userId);
  if (!profile) throw new NotFoundError('Profile not found');

  // Verify the key belongs to this applicant
  if (!body.key.startsWith(`resumes/${profile.id}/`)) {
    throw new ForbiddenError('Key does not belong to this applicant');
  }

  const resume = await repo.createResume(profile.id, body.filename, body.key);

  // Enqueue background job to download the file and compute word count
  await queue.add('process-resume', {
    resumeId: resume.id,
    s3Key: resume.s3_key,
  });

  return resume;
}

export async function addJobToShortlist(userId: string, jobId: string) {
  const profile = await repo.findApplicantByUserId(userId);
  if (!profile) throw new NotFoundError('Profile not found');

  try {
    return await repo.addToShortlist(profile.id, jobId);
  } catch (err: any) {
    if (err.code === '23505') throw new ConflictError('Job already in shortlist');
    throw err;
  }
}

export async function getShortlist(userId: string) {
  const profile = await repo.findApplicantByUserId(userId);
  if (!profile) throw new NotFoundError('Profile not found');
  return repo.listShortlist(profile.id);
}

export async function removeJobFromShortlist(userId: string, jobId: string) {
  const profile = await repo.findApplicantByUserId(userId);
  if (!profile) throw new NotFoundError('Profile not found');
  await repo.removeFromShortlist(profile.id, jobId);
}


export async function applyToJobs(
  userId: string,
  body: { jobIds: string[]; answers: Record<string, unknown[]> },
) {
  if (body.jobIds.length === 0 || body.jobIds.length > 10) {
    throw new BadRequestError('jobIds must contain 1–10 items');
  }

  const profile = await repo.findApplicantByUserId(userId);
  if (!profile) throw new NotFoundError('Profile not found');

  const openJobs = await repo.getOpenJobs(body.jobIds);
  const openJobIds = new Set(openJobs.map((j) => j.id));
  const closedOrMissing = body.jobIds.filter((id) => !openJobIds.has(id));
  if (closedOrMissing.length > 0) {
    throw new NotFoundError(`Jobs not found or not open: ${closedOrMissing.join(', ')}`);
  }

  const alreadyApplied = await repo.checkExistingApplications(profile.id, body.jobIds);
  const alreadyAppliedSet = new Set(alreadyApplied);

  const snapshot = await repo.buildApplicantSnapshot(profile.id);

  const jobsToInsert = body.jobIds.filter((id) => !alreadyAppliedSet.has(id));
  const skipped = body.jobIds.filter((id) => alreadyAppliedSet.has(id));
  const created: string[] = [];
  // Track which job IDs actually resulted in a new application, for the email step below
  const newlyCreatedJobIds: string[] = [];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const jobId of jobsToInsert) {
      const answers = body.answers[jobId] ?? [];
      const application = await repo.insertApplication(client, profile.id, jobId, answers, snapshot);
      if (application.created) {
        created.push(application.id);
        newlyCreatedJobIds.push(jobId);
      } else {
        skipped.push(jobId);
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // Enqueue a confirmation email job for each newly created application
  if (newlyCreatedJobIds.length > 0) {
    const user = await findUserById(userId);
    const jobDetails = await repo.getJobDetailsForNotification(newlyCreatedJobIds);

    for (const job of jobDetails) {
      await queue.add('send-application-confirmation', {
        applicantEmail: user?.email,
        jobTitle: job.title,
        companyName: job.company_name,
      });
    }
  }

  return { created, skipped };
}

export async function getMyApplications(userId: string) {
  const profile = await repo.findApplicantByUserId(userId);
  if (!profile) throw new NotFoundError('Profile not found');
  return repo.findApplicationsForApplicant(profile.id);
}