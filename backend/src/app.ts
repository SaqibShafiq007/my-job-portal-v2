import express from 'express'
import { errorHandler } from './shared/error-handler'
import { NotFoundError } from './shared/errors'
import { ValidationError } from './shared/validate'
import { authRouter } from './modules/auth/auth.routes';
import { companiesRouter } from './modules/companies/companies.routes';
import { applicantsRouter } from './modules/applicants/applicants.routes';
import { adminRouter } from './modules/admin/admin.routes';
import { jobsRouter } from './modules/jobs/jobs.routes';
import { z } from 'zod'
import { publicRouter } from './modules/public/publicRouter';
import { applicationsRouter } from './modules/applications/applications.routes';
import { globalLimiter } from './shared/rateLimiter';
import { requestIdMiddleware } from './middleware/requestId';
import { httpLogger } from './middleware/httpLogger';
import healthRouter from './routes/health';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './shared/config';

export function buildApp() {
  const app = express()

  // Express-level, no middleware needed — removes X-Powered-By: Express
  app.disable('x-powered-by')

  // Security headers on every response
  app.use(helmet())

  // CORS: allow only the known frontend origin, with credentials
  app.use(cors({
    origin: config.FRONTEND_URL,
    credentials: true,
  }))

  app.use(express.json())
  app.use(requestIdMiddleware)   // first: assign the ID
  app.use(httpLogger)            // second: log with the ID
  // Health checks mounted before the rate limiter so Kubernetes/Docker
  // polling /health and /ready never gets falsely rate-limited.
  app.use(healthRouter)
  
  app.use(globalLimiter)         // rate limiter

  // Feature routes registered in later chapters
  // app.use('/auth', authRoutes)
  // app.use('/jobs', jobRoutes)
  app.use('/api/public', publicRouter);
  app.use('/auth' , authRouter);
  app.use('/api/companies', companiesRouter);
  app.use('/api/applicants', applicantsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/jobs', jobsRouter);
  app.use('/api/companies/applications', applicationsRouter);
  app.use('/api/companies/interviews', applicationsRouter);
  app.use(errorHandler)

  return app
}