import { Queue, DefaultJobOptions } from 'bullmq';
import { config } from './config';

// All background jobs go into this single queue
export type JobName =
  | 'send-application-confirmation'
  | 'send-interview-notification'
  | 'process-resume'
  | 'cleanup-expired-otps'
  | 'cleanup-expired-refresh-tokens'
  | 'send-recruiter-digest';

// Default retry/backoff/cleanup behavior applied to every job unless overridden per-call.
const defaultJobOptions: DefaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000, // 1s, then 2s, then 4s
  },
  removeOnComplete: { count: 100 }, // keep last 100 completed jobs for inspection
  removeOnFail: { count: 50 },      // keep last 50 failed jobs
};

// BullMQ Queue uses its own Redis connection (not the shared cache client)
const queue = new Queue('jobs', {
  connection: { url: config.REDIS_URL },
  defaultJobOptions,
});

export default queue;