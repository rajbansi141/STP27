import prisma from '@/lib/prisma';

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MINUTES = 15;
export const FORGOT_PASSWORD_COOLDOWN_SECONDS = 60;
export const CODE_EXPIRY_MINUTES = 10;
export const MAX_CODE_ATTEMPTS = 5;

/**
 * Checks if a user is currently locked out due to excessive failed attempts.
 */
export async function checkLoginLockout(user: {
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}): Promise<{ isLocked: boolean; remainingMinutes: number }> {
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const diffMs = user.lockedUntil.getTime() - Date.now();
    const remainingMinutes = Math.max(1, Math.ceil(diffMs / 60000));
    return { isLocked: true, remainingMinutes };
  }
  return { isLocked: false, remainingMinutes: 0 };
}

/**
 * Records a failed login attempt and applies a lockout if threshold is exceeded.
 */
export async function recordFailedLogin(userId: string, currentAttempts: number) {
  const newAttempts = currentAttempts + 1;
  const isNowLocked = newAttempts >= MAX_LOGIN_ATTEMPTS;
  const lockedUntil = isNowLocked
    ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
    : null;

  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: newAttempts,
      lockedUntil,
    },
  });

  return { isNowLocked, remainingAttempts: Math.max(0, MAX_LOGIN_ATTEMPTS - newAttempts) };
}

/**
 * Resets failed login counters after successful authentication.
 */
export async function resetFailedLogins(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });
}

/**
 * Verifies if a password reset code can be re-sent based on a 60-second cooldown.
 */
export async function canRequestPasswordReset(email: string): Promise<boolean> {
  const latestRequest = await prisma.passwordResetCode.findFirst({
    where: { email: email.toLowerCase().trim() },
    orderBy: { createdAt: 'desc' },
  });

  if (!latestRequest) return true;

  const secondsSinceLast = (Date.now() - latestRequest.createdAt.getTime()) / 1000;
  return secondsSinceLast >= FORGOT_PASSWORD_COOLDOWN_SECONDS;
}
