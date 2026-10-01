import { Router } from 'express';
import { authMiddleware } from '../../shared/auth-middleware';
import { requireRole } from '../../shared/require-role';
import * as service from './applicants.service';

const router = Router();

// Every route on this router requires a valid token with role 'applicant'.
router.use(authMiddleware, requireRole('applicant'));

router.post('/profile', async (req, res, next) => {
  try {
    const { full_name, headline, location, attributes } = req.body;
    const profile = await service.createProfile(req.user!.userId, {
      full_name,
      headline,
      location,
      attributes,
    });
    res.status(201).json(profile);
  } catch (err) {
    next(err);
  }
});

router.get('/profile', async (req, res, next) => {
  try {
    const profile = await service.getProfile(req.user!.userId);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

router.patch('/profile', async (req, res, next) => {
  try {
    const { full_name, headline, location, attributes } = req.body;
    const profile = await service.updateProfile(req.user!.userId, {
      full_name,
      headline,
      location,
      attributes,
    });
    res.json(profile);
  } catch (err) {
    next(err);
  }
});


router.post('/profile/resume-upload', async (req, res, next) => {
  try {
    const result = await service.getResumeUploadUrl(req.user!.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/profile/resume', async (req, res, next) => {
  try {
    const { key, filename } = req.body;
    const resume = await service.confirmResumeUpload(req.user!.userId, { key, filename });
    res.status(201).json(resume);
  } catch (err) {
    next(err);
  }
});

router.post('/shortlist', async (req, res, next) => {
  try {
    const { jobId } = req.body;
    const item = await service.addJobToShortlist(req.user!.userId, jobId);
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

router.get('/shortlist', async (req, res, next) => {
  try {
    const items = await service.getShortlist(req.user!.userId);
    res.json({ shortlist: items });
  } catch (err) {
    next(err);
  }
});

router.delete('/shortlist/:jobId', async (req, res, next) => {
  try {
    await service.removeJobFromShortlist(req.user!.userId, req.params.jobId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.post('/apply', async (req, res, next) => {
  try {
    const { jobIds, answers = {} } = req.body;
    const result = await service.applyToJobs(req.user!.userId, { jobIds, answers });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/applications', async (req, res, next) => {
  try {
    const applications = await service.getMyApplications(req.user!.userId);
    res.json({ applications });
  } catch (err) {
    next(err);
  }
});

export { router as applicantsRouter };