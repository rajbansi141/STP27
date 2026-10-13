import { redirect } from 'next/navigation';
import { getCurrentUser, AuthenticatedUser } from './session';
import type { Role } from '@prisma/client';

/**
 * Requires an authenticated user session.
 * If not authenticated, redirects to /login preserving the returnUrl.
 * If user must change password, redirects to /change-password.
 */
export async function requireAuth(returnUrl?: string): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) {
    const encodedReturn = returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : '';
    redirect(`/login${encodedReturn}`);
  }

  if (user.mustChangePassword) {
    redirect('/change-password');
  }

  return user;
}

/**
 * Requires an authenticated user with one of the allowed roles.
 * If not authenticated, redirects to /login.
 * If unauthorized, throws or redirects to /unauthorized or dashboard.
 */
export async function requireRole(
  allowedRoles: Role[],
  returnUrl?: string
): Promise<AuthenticatedUser> {
  const user = await requireAuth(returnUrl);

  if (!allowedRoles.includes(user.role)) {
    redirect('/unauthorized');
  }

  return user;
}

/**
 * Check if the user has permission without throwing a redirect.
 */
export async function checkRole(allowedRoles: Role[]): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return allowedRoles.includes(user.role);
}
