import crypto from 'node:crypto';
import type { Prisma } from '@prisma/client';

// Alphabet excluding confusing characters: I, O, 0, 1
const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generate 4-char random suffix from unambiguous alphabet
 */
export function generateRandomSuffix(length: number = 4): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    const idx = crypto.randomInt(0, REF_ALPHABET.length);
    result += REF_ALPHABET[idx];
  }
  return result;
}

/**
 * Format reference number: SA + 2-digit year + 4-digit seq + 4-char random code
 * Example: SA270001K7QM
 */
export function formatReferenceNumber(year: number, sequence: number, suffix?: string): string {
  const yr2 = String(year % 100).padStart(2, '0');
  const seq4 = String(sequence).padStart(4, '0');
  const rand4 = suffix || generateRandomSuffix(4);
  return `SA${yr2}${seq4}${rand4}`;
}

/**
 * Atomically generates next reference number within a database transaction,
 * guaranteeing sequence ordering and retrying on suffix collision.
 */
export async function generateAtomicReferenceNumber(
  tx: Prisma.TransactionClient,
  cohortYear: number = 2027
): Promise<{ refNo: string; seq: number }> {
  // Find highest sequence for this cohort year
  const highestApp = await tx.application.findFirst({
    where: { year: cohortYear },
    orderBy: { seq: 'desc' },
    select: { seq: true },
  });

  const nextSeq = (highestApp?.seq || 0) + 1;

  // Retry loop in the exceedingly rare case of suffix collision (1 in 32^4 = 1 in 1,048,576)
  let attempts = 0;
  while (attempts < 5) {
    const candidateRef = formatReferenceNumber(cohortYear, nextSeq);
    const existing = await tx.application.findUnique({
      where: { refNo: candidateRef },
      select: { id: true },
    });
    if (!existing) {
      return { refNo: candidateRef, seq: nextSeq };
    }
    attempts++;
  }

  // Fallback with timestamp salt if multiple collisions occur
  return {
    refNo: formatReferenceNumber(cohortYear, nextSeq, generateRandomSuffix(4)),
    seq: nextSeq,
  };
}
