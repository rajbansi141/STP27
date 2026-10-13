import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import prisma from '@/lib/prisma';
import type { User, Role } from '@prisma/client';

export const SESSION_COOKIE_NAME = 'stp_session';
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  username: string | null;
  role: Role;
  locale: string;
  mustChangePassword: boolean;
  isActive: boolean;
  emailVerified: Date | null;
}

/**
 * Creates a persistent database session and sets a secure httpOnly cookie.
 */
export async function createSession(userId: string): Promise<string> {
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await prisma.session.create({
    data: {
      sessionToken,
      userId,
      expiresAt,
      lastActiveAt: new Date(),
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return sessionToken;
}

/**
 * Retrieves the currently authenticated user from the active session cookie.
 * Refreshes session activity if more than 1 hour has elapsed since lastActiveAt.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const session = await prisma.session.findUnique({
      where: { sessionToken: token },
      include: {
        user: true,
      },
    });

    if (!session || !session.user || !session.user.isActive) {
      return null;
    }

    if (session.expiresAt < new Date()) {
      // Session expired, clean up
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    // Refresh on activity (sliding window): extend if last activity was > 1 hour ago
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (session.lastActiveAt < oneHourAgo) {
      const newExpiry = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
      await prisma.session.update({
        where: { id: session.id },
        data: {
          lastActiveAt: new Date(),
          expiresAt: newExpiry,
        },
      }).catch(() => {});
    }

    const { user } = session;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      locale: user.locale,
      mustChangePassword: user.mustChangePassword,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
    };
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'digest' in err) {
      throw err;
    }
    console.error('getCurrentUser error:', err);
    return null;
  }
}

/**
 * Destroys the current user session in DB and clears the cookie.
 */
export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      await prisma.session.delete({ where: { sessionToken: token } }).catch(() => {});
      cookieStore.delete(SESSION_COOKIE_NAME);
    }
  } catch (err) {
    console.error('destroySession error:', err);
  }
}

/**
 * Invalidates all sessions for a user (e.g. after password reset).
 */
export async function invalidateAllUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { userId },
  });
}
