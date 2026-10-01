// src/shared/otp.ts
import crypto from 'node:crypto';

// [100000, 1000000) — always exactly 6 digits, cryptographically random.
export function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

// Hash a raw OTP for storage. Never store the raw value — only the hash.
export function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}