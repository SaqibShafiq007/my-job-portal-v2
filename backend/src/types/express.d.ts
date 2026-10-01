declare namespace Express {
  interface Request {
    user?: {
      userId: string;
      role:   'admin' | 'recruiter' | 'applicant';
    };
  }
}