// src/modules/auth/auth.routes.ts
import { Router } from 'express';
import { validateBody } from '../../shared/validate';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  acceptInvitationSchema,
} from './auth.schema';
import {
  register,
  login,
  refresh,
  logout,
  verifyEmail,
  resendVerification,
  acceptInvitation,
} from './auth.service';
import { authLimiter } from '../../shared/rateLimiter';

const router = Router();

router.post('/register',authLimiter  , async (req, res, next) => {
  try {
    const body = validateBody(registerSchema, req.body);
    const result = await register(body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/login',authLimiter , async (req, res, next) => {
  try {
    const body = validateBody(loginSchema, req.body);
    const result = await login(body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = validateBody(refreshSchema, req.body);
    const tokens = await refresh(refreshToken);
    res.status(200).json(tokens);
  } catch (err) {
    next(err);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = validateBody(logoutSchema, req.body);
    await logout(refreshToken);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.post('/verify-email',authLimiter , async (req, res, next) => {
  try {
    const { email, otp } = validateBody(verifyEmailSchema, req.body);
    await verifyEmail(email, otp);
    res.status(200).json({ message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
});

router.post('/resend-verification', authLimiter ,async (req, res, next) => {
  try {
    const { email } = validateBody(resendVerificationSchema, req.body);
    await resendVerification(email);
    res.status(200).json({ message: 'If that email is pending verification, a new code has been sent' });
  } catch (err) {
    next(err);
  }
});


// No authMiddleware — the raw token is the credential
router.post('/accept-invitation', async (req, res, next) => {
  try {
    const input = validateBody(acceptInvitationSchema, req.body);
    const tokens = await acceptInvitation(input);
    res.status(200).json(tokens);
  } catch (err) {
    next(err);
  }
});

export { router as authRouter };