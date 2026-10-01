// src/worker/handlers/cleanupExpiredOtps.ts
import db from '../../shared/db';
import logger from '../../shared/logger';

// Deletes OTP rows that have passed their expiry time.
export async function cleanupExpiredOtps(): Promise<void> {
  const result = await db.query(`DELETE FROM email_verifications WHERE expires_at < NOW()`);
  logger.info({ deletedCount: result.rowCount }, '[cleanup] Deleted expired OTP rows');
}