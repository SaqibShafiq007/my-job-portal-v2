import * as repo from './applications.repo';
import { getRecruiterCompany } from '../companies/companies.repo';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../shared/errors';
import { sendInterviewNotification } from '../../shared/mailer';

const STAGE_ORDER = [
  'applied', 'screening', 'interview', 'final_interview', 'offer', 'hired', 'rejected',
] as const;
type Stage = typeof STAGE_ORDER[number];

const TERMINAL_STAGES = new Set<Stage>(['hired', 'rejected']);

function assertValidTransition(current: Stage, target: Stage) {
  if (TERMINAL_STAGES.has(current)) {
    throw new BadRequestError(`Cannot transition from terminal stage '${current}'`);
  }
  if (!STAGE_ORDER.includes(target)) {
    throw new BadRequestError(`'${target}' is not a valid stage`);
  }
  if (target === 'rejected') return;

  const currentIdx = STAGE_ORDER.indexOf(current);
  const targetIdx = STAGE_ORDER.indexOf(target);

  if (targetIdx <= currentIdx) {
    throw new BadRequestError(`Cannot move backward from '${current}' to '${target}'`);
  }
}

export async function moveApplicationStage(
  userId: string,
  applicationId: string,
  targetStage: Stage,
) {
  const company = await getRecruiterCompany(userId);
  if (!company) throw new ForbiddenError('No company workspace found.');

  const application = await repo.findApplicationForCompany(applicationId, company.companyId);
  if (!application) throw new NotFoundError('Application not found');

  assertValidTransition(application.stage as Stage, targetStage);

  return repo.updateApplicationStage(applicationId, targetStage);
}


export async function scheduleInterview(
  userId: string,
  applicationId: string,
  body: { scheduledAt: string; meetingLink: string; notes?: string },
) {
  const company = await getRecruiterCompany(userId);
  if (!company) throw new ForbiddenError('No company workspace found.');

  const application = await repo.findApplicationWithApplicant(applicationId, company.companyId);
  if (!application) throw new NotFoundError('Application not found');
  


  // Validate scheduledAt
  const scheduled = new Date(body.scheduledAt);
  if (isNaN(scheduled.getTime())) {
    throw new BadRequestError('scheduledAt is not a valid date');
  }
  if (scheduled <= new Date()) {
    throw new BadRequestError('scheduledAt must be in the future');
  }


  // Advance stage to 'interview' if not already at or past it
  const currentStageIdx = STAGE_ORDER.indexOf(application.stage as Stage);
  const interviewIdx = STAGE_ORDER.indexOf('interview');
  if (currentStageIdx < interviewIdx) {
    await repo.updateApplicationStage(applicationId, 'interview');
  }

  const interview = await repo.createInterview(
    applicationId,
    new Date(body.scheduledAt),
    body.meetingLink,
    body.notes ?? null,
  );

  await sendInterviewNotification(
    application.applicant_email,
    application.job_title,
    new Date(body.scheduledAt),
    body.meetingLink,
    body.notes ?? null,
  );

  return interview;
}

// To_do : wrap updateInterviewFeedback + updateApplicationStage in a transaction (ch52 pattern)
export async function recordInterviewFeedback(
  userId: string,
  interviewId: string,
  body: { feedback: string; outcome: 'moved_forward' | 'rejected' },
) {
  const company = await getRecruiterCompany(userId);
  if (!company) throw new ForbiddenError('No company workspace found.');

  const interview = await repo.findInterviewForCompany(interviewId, company.companyId);
  if (!interview) throw new NotFoundError('Interview not found');

  if (interview.outcome !== 'pending') {
    throw new BadRequestError('Feedback has already been recorded for this interview');
  }

  // Update the interview record
  const updatedInterview = await repo.updateInterviewFeedback(
    interviewId,
    body.feedback,
    body.outcome,
  );

  // Advance or terminate the application based on outcome
  let updatedApplication: Record<string, unknown> | null = null;

  if (body.outcome === 'rejected') {
    updatedApplication = await repo.updateApplicationStage(interview.application_id, 'rejected');
  } else {
    // outcome === 'moved_forward': advance to the next stage
    const currentStage = interview.application_stage as Stage;
    const currentIdx = STAGE_ORDER.indexOf(currentStage);
    const nextStage = STAGE_ORDER[currentIdx + 1];

    if (!nextStage || TERMINAL_STAGES.has(currentStage)) {
      // Already at a terminal or no next stage — do not change stage
    } else {
      updatedApplication = await repo.updateApplicationStage(interview.application_id, nextStage);
    }
  }

  return { interview: updatedInterview, application: updatedApplication };
}


export async function getCompanyPipeline(userId: string) {
  const company = await getRecruiterCompany(userId);
  if (!company) throw new ForbiddenError('No company workspace found.');

  const applications = await repo.findApplicationsForCompany(company.companyId);

  const pipeline: Record<string, typeof applications> = Object.fromEntries(
    STAGE_ORDER.map((stage) => [stage, []]),
  );

  for (const app of applications) {
    pipeline[app.stage]?.push(app);
  }

  return pipeline;
}