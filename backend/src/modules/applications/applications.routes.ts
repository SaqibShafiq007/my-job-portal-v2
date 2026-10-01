import { Router } from 'express';
import { authMiddleware } from '../../shared/auth-middleware';
import { requireRole } from '../../shared/require-role';
import * as service from './applications.service';

const router = Router();
router.use(authMiddleware, requireRole('recruiter'));

router.patch('/:id/stage', async (req, res, next) => {
  try {
    const { stage } = req.body;
    const updated = await service.moveApplicationStage(
      req.user!.userId,
      req.params.id,
      stage,
    );
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/interview', async (req, res, next) => {
  try {
    const { scheduledAt, meetingLink, notes } = req.body;
    const interview = await service.scheduleInterview(
      req.user!.userId,
      req.params.id,
      { scheduledAt, meetingLink, notes },
    );
    res.status(201).json(interview);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/feedback', async (req, res, next) => {
  try {
    const { feedback, outcome } = req.body;
    const result = await service.recordInterviewFeedback(
      req.user!.userId,
      req.params.id,
      { feedback, outcome },
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});


router.get('/', async (req, res, next) => {
  try {
    const pipeline = await service.getCompanyPipeline(req.user!.userId);
    res.json({ pipeline });
  } catch (err) {
    next(err);
  }
});



export { router as applicationsRouter };