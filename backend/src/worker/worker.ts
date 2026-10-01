import 'dotenv/config';
import { Worker, Job, Queue } from 'bullmq';
import { config } from '../shared/config';
import { JobName } from '../shared/queue';
import { sendApplicationConfirmationEmail } from '../shared/mailer';
import { processResume } from './handlers/processResume';
import { cleanupExpiredOtps } from './handlers/cleanupExpiredOtps';
import { cleanupExpiredTokens } from './handlers/cleanupExpiredTokens';
import { sendRecruiterDigest } from './handlers/sendRecruiterDigest';
import logger from '../shared/logger';

const schedulerQueue = new Queue('jobs', {
  connection: { url: config.REDIS_URL },
});

// Registers the recurring cleanup jobs using BullMQ v6's Job Scheduler API.
// upsertJobScheduler is idempotent — calling it again with the same id updates
// the existing schedule instead of creating a duplicate.
async function registerRepeatableJobs() {
  await schedulerQueue.upsertJobScheduler(
    'cleanup-expired-otps-scheduler',
    { pattern: '0 0 * * *' }, // daily at midnight UTC
    { name: 'cleanup-expired-otps', data: {} },
  );

  await schedulerQueue.upsertJobScheduler(
    'cleanup-expired-refresh-tokens-scheduler',
    { pattern: '0 1 * * *' }, // daily at 01:00 UTC
    { name: 'cleanup-expired-refresh-tokens', data: {} },
  );

  await schedulerQueue.upsertJobScheduler(
    'send-recruiter-digest-scheduler',
    { pattern: '0 8 * * 1' }, // every Monday at 08:00 UTC
    { name: 'send-recruiter-digest', data: {} },
  );

  const schedulers = await schedulerQueue.getJobSchedulers();
  logger.info({ jobNames: schedulers.map((s) => s.name) }, '[worker] Job schedulers registered');
}

const worker = new Worker(
  'jobs',
  async (job: Job) => {
    logger.info({ jobName: job.name, jobId: job.id }, '[worker] Processing job');

    switch (job.name as JobName) {
      case 'send-application-confirmation': {
        const { applicantEmail, jobTitle, companyName } = job.data;
        await sendApplicationConfirmationEmail(applicantEmail, jobTitle, companyName);
        break;
      }
      case 'process-resume': {
        const { resumeId, s3Key } = job.data;
        await processResume(resumeId, s3Key);
        break;
      }
      case 'cleanup-expired-otps': {
        await cleanupExpiredOtps();
        break;
      }
      case 'cleanup-expired-refresh-tokens': {
        await cleanupExpiredTokens();
        break;
      }
      case 'send-recruiter-digest': {
        await sendRecruiterDigest();
        break;
      }
      default:
        logger.warn({ jobName: job.name }, '[worker] Unknown job name, skipping');
    }
  },
  {
    connection: { url: config.REDIS_URL },
    concurrency: 5,
  },
);

registerRepeatableJobs().catch((err) => logger.error({ err }, '[worker] Failed to register repeatable jobs'));

async function shutdown(signal: string) {
  logger.info(`Worker ${signal} received — closing`);
  await worker.close();
  logger.info('Worker closed');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));