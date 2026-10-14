'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import prisma from '@/lib/prisma';
import { hashPassword, verifyPassword, generateNumericCode, hashCode, verifyCode } from '@/lib/auth/password';
import { createSession, destroySession, getCurrentUser, invalidateAllUserSessions } from '@/lib/auth/session';
import {
  checkLoginLockout,
  recordFailedLogin,
  resetFailedLogins,
  canRequestPasswordReset,
  CODE_EXPIRY_MINUTES,
  MAX_CODE_ATTEMPTS,
} from '@/lib/auth/rate-limit';
import {
  loginSchema,
  signupSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '@/lib/validations/auth';
import { sendSignupVerificationEmail, sendPasswordResetEmail } from '@/lib/email/service';
import { getServerLocale } from '@/lib/i18n/server';
import { translations } from '@/lib/i18n/translations';

// Helper to record audit logs safely
async function createAuditLog(
  action: string,
  entity: string,
  actorId?: string | null,
  role?: string | null,
  entityId?: string | null,
  meta?: Record<string, unknown>
) {
  try {
    const headerList = await headers();
    const ip = headerList.get('x-forwarded-for') || headerList.get('x-real-ip') || 'unknown';
    const userAgent = headerList.get('user-agent') || 'unknown';

    await prisma.auditLog.create({
      data: {
        action,
        entity,
        actorId: actorId || null,
        role: role || null,
        entityId: entityId || null,
        meta: meta ? (meta as object) : undefined,
        ip,
        userAgent,
      },
    });
  } catch (err) {
    console.error('AuditLog error:', err);
  }
}

export type ActionState = {
  success?: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  data?: Record<string, unknown>;
};

/**
 * Log In action for Applicants (email) & Reviewers/Admins (email or username)
 */
export async function loginAction(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const rawData = {
    identifier: formData.get('identifier')?.toString() || '',
    password: formData.get('password')?.toString() || '',
    rememberMe: formData.get('rememberMe') === 'on',
  };

  const returnUrl = formData.get('returnUrl')?.toString();

  const validated = loginSchema.safeParse(rawData);
  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const { identifier, password } = validated.data;
  const isEmail = identifier.includes('@');
  const normalizedIdentifier = identifier.trim().toLowerCase();

  const user = await prisma.user.findFirst({
    where: isEmail
      ? { email: normalizedIdentifier }
      : {
          OR: [
            { username: identifier.trim() },
            { username: normalizedIdentifier },
          ],
        },
  });

  const locale = await getServerLocale();
  const t = translations[locale].auth;

  if (!user) {
    return {
      success: false,
      message: t.invalidCredentials,
    };
  }

  if (!user.isActive) {
    return {
      success: false,
      message: t.accountInactive,
    };
  }

  // Lockout check
  const lockout = await checkLoginLockout(user);
  if (lockout.isLocked) {
    return {
      success: false,
      message: t.accountLocked.replace('{minutes}', String(lockout.remainingMinutes)),
    };
  }

  // Verify Argon2 password
  const isValidPassword = await verifyPassword(user.passwordHash, password);
  if (!isValidPassword) {
    const failed = await recordFailedLogin(user.id, user.failedLoginAttempts);
    await createAuditLog('FAILED_LOGIN', 'User', user.id, user.role, user.id, {
      remainingAttempts: failed.remainingAttempts,
    });

    if (failed.isNowLocked) {
      return {
        success: false,
        message: t.accountLocked.replace('{minutes}', '15'),
      };
    }

    return {
      success: false,
      message: t.invalidCredentials,
    };
  }

  // Email verification check for applicants
  if (user.role === 'APPLICANT' && !user.emailVerified) {
    return {
      success: false,
      message: t.emailNotVerified,
      data: { needsVerification: true, email: user.email },
    };
  }

  // Successful login
  await resetFailedLogins(user.id);
  await createSession(user.id);
  await createAuditLog('LOGIN', 'User', user.id, user.role, user.id);

  if (user.mustChangePassword) {
    redirect('/change-password');
  }

  let defaultPath = '/dashboard';
  if (user.role === 'ADMIN') {
    defaultPath = '/admin';
  } else if (user.role === 'REVIEWER') {
    defaultPath = '/reviewer';
  }

  const targetPath =
    returnUrl && returnUrl.startsWith('/') && returnUrl !== '/dashboard'
      ? returnUrl
      : defaultPath;
  redirect(targetPath);
}

/**
 * Applicant Sign Up action
 */
export async function signupAction(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const rawData = {
    name: formData.get('name')?.toString() || '',
    email: formData.get('email')?.toString() || '',
    password: formData.get('password')?.toString() || '',
    confirmPassword: formData.get('confirmPassword')?.toString() || '',
  };

  const validated = signupSchema.safeParse(rawData);
  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const { name, email, password } = validated.data;
  const locale = await getServerLocale();
  const t = translations[locale].auth;

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    return {
      success: false,
      errors: {
        email: ['An account with this email address already exists.'],
      },
    };
  }

  const passwordHash = await hashPassword(password);

  // Generate lastname_firstname username for applicant
  const nameParts = name.trim().split(/\s+/).filter(Boolean);
  let baseUsername = '';
  if (nameParts.length >= 2) {
    const firstName = nameParts[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const lastName = nameParts[nameParts.length - 1].toLowerCase().replace(/[^a-z0-9]/g, '');
    baseUsername = `${lastName}_${firstName}`;
  } else if (nameParts.length === 1) {
    baseUsername = nameParts[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  } else {
    baseUsername = 'applicant';
  }

  let uniqueUsername = baseUsername;
  let uCounter = 1;
  while (true) {
    const uExisting = await prisma.user.findFirst({
      where: { username: uniqueUsername },
    });
    if (!uExisting) break;
    uniqueUsername = `${baseUsername}_${uCounter}`;
    uCounter++;
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      username: uniqueUsername,
      passwordHash,
      role: 'APPLICANT',
      locale,
      mustChangePassword: false,
      isActive: true,
    },
  });

  // Generate 6-digit verification code
  const code = generateNumericCode(6);
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.verificationCode.create({
    data: {
      email,
      userId: user.id,
      codeHash,
      expiresAt,
    },
  });

  // Send verification email
  await sendSignupVerificationEmail(email, name, code, locale);
  await createAuditLog('REGISTER', 'User', user.id, user.role, user.id);

  return {
    success: true,
    message: t.signupSuccess,
    data: { email },
  };
}

/**
 * Verify 6-digit signup email code
 */
export async function verifyEmailAction(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const rawData = {
    email: formData.get('email')?.toString() || '',
    code: formData.get('code')?.toString() || '',
  };

  const validated = verifyEmailSchema.safeParse(rawData);
  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const { email, code } = validated.data;
  const locale = await getServerLocale();
  const t = translations[locale].auth;

  const verification = await prisma.verificationCode.findFirst({
    where: {
      email,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!verification) {
    return {
      success: false,
      message: t.codeInvalidOrExpired,
    };
  }

  if (verification.attempts >= MAX_CODE_ATTEMPTS) {
    return {
      success: false,
      message: t.codeMaxAttemptsExceeded,
    };
  }

  const isMatch = verifyCode(code, verification.codeHash);
  if (!isMatch) {
    await prisma.verificationCode.update({
      where: { id: verification.id },
      data: { attempts: { increment: 1 } },
    });
    return {
      success: false,
      message: t.codeInvalidOrExpired,
    };
  }

  // Update user as verified
  const user = await prisma.user.update({
    where: { email },
    data: { emailVerified: new Date() },
  });

  // Clean up verification codes
  await prisma.verificationCode.deleteMany({ where: { email } });
  await createAuditLog('EMAIL_VERIFIED', 'User', user.id, user.role, user.id);

  // Auto-login user
  await createSession(user.id);
  redirect('/dashboard');
}

/**
 * Forgot Password - Send 6-digit reset code (generic response to prevent email enumeration)
 */
export async function forgotPasswordAction(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const rawData = {
    email: formData.get('email')?.toString() || '',
  };

  const validated = forgotPasswordSchema.safeParse(rawData);
  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const { email } = validated.data;
  const locale = await getServerLocale();
  const t = translations[locale].auth;

  // Rate limit cooldown check (60s)
  const allowed = await canRequestPasswordReset(email);
  if (!allowed) {
    return {
      success: false,
      message: t.resendTooFast,
    };
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (user && user.isActive) {
    const code = generateNumericCode(6);
    const codeHash = hashCode(code);
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    await prisma.passwordResetCode.create({
      data: {
        email,
        userId: user.id,
        codeHash,
        expiresAt,
      },
    });

    await sendPasswordResetEmail(email, code, locale);
    await createAuditLog('PASSWORD_RESET_REQUEST', 'User', user.id, user.role, user.id);
  }

  // Generic anti-enumeration response
  return {
    success: true,
    message: t.genericNotice,
    data: { email },
  };
}

/**
 * Reset Password - verify 6-digit code and set new password
 */
export async function resetPasswordAction(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const rawData = {
    email: formData.get('email')?.toString() || '',
    code: formData.get('code')?.toString() || '',
    newPassword: formData.get('newPassword')?.toString() || '',
    confirmPassword: formData.get('confirmPassword')?.toString() || '',
  };

  const validated = resetPasswordSchema.safeParse(rawData);
  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const { email, code, newPassword } = validated.data;
  const locale = await getServerLocale();
  const t = translations[locale].auth;

  const resetRecord = await prisma.passwordResetCode.findFirst({
    where: {
      email,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!resetRecord) {
    return {
      success: false,
      message: t.codeInvalidOrExpired,
    };
  }

  if (resetRecord.attempts >= MAX_CODE_ATTEMPTS) {
    return {
      success: false,
      message: t.codeMaxAttemptsExceeded,
    };
  }

  const isValid = verifyCode(code, resetRecord.codeHash);
  if (!isValid) {
    await prisma.passwordResetCode.update({
      where: { id: resetRecord.id },
      data: { attempts: { increment: 1 } },
    });
    return {
      success: false,
      message: t.codeInvalidOrExpired,
    };
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return {
      success: false,
      message: t.codeInvalidOrExpired,
    };
  }

  // Update password with Argon2
  const newHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newHash,
      failedLoginAttempts: 0,
      lockedUntil: null,
      mustChangePassword: false,
    },
  });

  // Invalidate all prior sessions for security!
  await invalidateAllUserSessions(user.id);
  await prisma.passwordResetCode.deleteMany({ where: { email } });
  await createAuditLog('PASSWORD_RESET_COMPLETE', 'User', user.id, user.role, user.id);

  return {
    success: true,
    message: t.resetSuccess,
  };
}

/**
 * Mandatory Password Change action (e.g. for reviewer on initial login)
 */
export async function changePasswordAction(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const rawData = {
    currentPassword: formData.get('currentPassword')?.toString() || '',
    newPassword: formData.get('newPassword')?.toString() || '',
    confirmPassword: formData.get('confirmPassword')?.toString() || '',
  };

  const validated = changePasswordSchema.safeParse(rawData);
  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const { currentPassword, newPassword } = validated.data;
  const locale = await getServerLocale();
  const t = translations[locale].auth;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!dbUser) {
    redirect('/login');
  }

  const isCurrentValid = await verifyPassword(dbUser.passwordHash, currentPassword);
  if (!isCurrentValid) {
    return {
      success: false,
      message: t.invalidCredentials,
    };
  }

  const newHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newHash,
      mustChangePassword: false,
    },
  });

  await createAuditLog('PASSWORD_CHANGED', 'User', user.id, user.role, user.id);
  redirect('/dashboard');
}

/**
 * Sign Out action
 */
export async function logoutAction(): Promise<void> {
  const user = await getCurrentUser();
  if (user) {
    await createAuditLog('LOGOUT', 'User', user.id, user.role, user.id);
  }
  await destroySession();
  redirect('/login');
}
