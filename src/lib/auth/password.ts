import argon2 from 'argon2';
import crypto from 'node:crypto';

/**
 * Hash a password using Argon2id
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
}

/**
 * Verify a plain password against an Argon2 hash
 */
export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch (err) {
    console.error('Password verification error:', err);
    return false;
  }
}

/**
 * Generate a cryptographically secure 6-digit numeric code
 */
export function generateNumericCode(digits: number = 6): string {
  const min = 10 ** (digits - 1);
  const max = 10 ** digits - 1;
  const num = crypto.randomInt(min, max + 1);
  return num.toString();
}

/**
 * Hash a short-lived token/code for secure DB storage
 */
export function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code.trim()).digest('hex');
}

/**
 * Verify a short-lived token/code against its hash
 */
export function verifyCode(code: string, storedHash: string): boolean {
  const codeHash = hashCode(code);
  const bufferA = Buffer.from(codeHash, 'hex');
  const bufferB = Buffer.from(storedHash, 'hex');
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
}
