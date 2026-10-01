// src/worker/handlers/cleanupExpiredTokens.ts
import db from '../../shared/db';
import logger from '../../shared/logger';

// Deletes refresh token rows that have passed their expiry time.
export async function cleanupExpiredTokens(): Promise<void> {
  const result = await db.query(`DELETE FROM refresh_tokens WHERE expires_at < NOW()`);
  logger.info({ deletedCount: result.rowCount }, '[cleanup] Deleted expired refresh token rows');
}