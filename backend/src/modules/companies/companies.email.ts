// src/modules/companies/companies.email.ts

import { config } from '../../shared/config';
import { sendMail } from '../../shared/mailer';

export async function sendInvitationEmail(toEmail: string, rawToken: string) {
  const link = `${config.APP_BASE_URL}/auth/accept-invitation?token=${rawToken}`;
  await sendMail({
    to: toEmail,
    subject: 'You have been invited to join a company workspace',
    text: `You have been invited to join a company workspace. Accept your invitation here:\n\n${link}\n\nThis link expires in ${config.INVITATION_EXPIRES_IN_HOURS} hours.`,
  });
}