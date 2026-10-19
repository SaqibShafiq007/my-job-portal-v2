import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

import { errorHandler } from './shared/error-handler';
import { globalLimiter } from './shared/rateLimiter';
import { requestIdMiddleware } from './middleware/requestId';
import { httpLogger } from './middleware/httpLogger';
import healthRouter from './routes/health';
import { config } from './shared/config';

import { authRouter } from './modules/auth/auth.routes';
import { companiesRouter } from './modules/companies/companies.routes';
import { applicantsRouter } from './modules/applicants/applicants.routes';
import { adminRouter } from './modules/admin/admin.routes';
import { jobsRouter } from './modules/jobs/jobs.routes';
import { publicRouter } from './modules/public/publicRouter';
import { applicationsRouter } from './modules/applications/applications.routes';

export function buildApp() {
  const app = express();
  app.set('trust proxy', 1);

  // Express-level setup
  app.disable('x-powered-by');

  // Security & CORS
  app.use(helmet());
  app.use(
    cors({
      origin: config.FRONTEND_URL,
      credentials: true,
    })
  );

  app.use(express.json());
  app.use(requestIdMiddleware);
  app.use(httpLogger);

  // Health check routes
  app.use(healthRouter);

  // Rate Limiting
  app.use(globalLimiter);

  // Feature Routes
  app.use('/api/public', publicRouter);
  app.use('/auth', authRouter);
  app.use('/api/companies', companiesRouter);
  app.use('/api/applicants', applicantsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/jobs', jobsRouter);
  app.use('/api/companies/applications', applicationsRouter);
  app.use('/api/companies/interviews', applicationsRouter);

  // Global Error Handler
  app.use(errorHandler);

  return app;
}

// Instantiate and export app directly for Vercel
const app = buildApp();
export default app;