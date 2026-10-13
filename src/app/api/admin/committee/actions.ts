'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/rbac';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';
import { queueEmail } from '@/lib/email/queue';
import crypto from 'node:crypto';

import {
  createReviewerSchema,
  updateReviewerSchema,
  type CreateReviewerInput,
  type UpdateReviewerInput,
} from '@/lib/validations/reviewer';


/**
 * Generate a cryptographically secure, high-entropy 14-character password
 * satisfying uppercase, lowercase, numbers, and symbols.
 */
export async function generateSecurePassword(): Promise<string> {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*_-';
  const allChars = upper + lower + digits + symbols;

  let pass = '';
  pass += upper[crypto.randomInt(upper.length)];
  pass += lower[crypto.randomInt(lower.length)];
  pass += digits[crypto.randomInt(digits.length)];
  pass += symbols[crypto.randomInt(symbols.length)];

  for (let i = 4; i < 14; i++) {
    pass += allChars[crypto.randomInt(allChars.length)];
  }

  return pass
    .split('')
    .sort(() => crypto.randomInt(3) - 1)
    .join('');
}

/**
 * Live check for username availability.
 */
export async function checkUsernameAvailability(username: string): Promise<{
  available: boolean;
  message?: string;
}> {
  const clean = username.trim();
  if (clean.length < 4 || clean.length > 20 || !/^[a-zA-Z0-9._]+$/.test(clean)) {
    return { available: false, message: 'Invalid username format' };
  }

  const existing = await prisma.user.findUnique({
    where: { username: clean },
    select: { id: true },
  });

  return {
    available: !existing,
    message: existing ? 'Username is already taken' : 'Username is available',
  };
}

/**
 * Admin-only server action: Create Reviewer account with minimal fields.
 */
export async function createReviewer(formData: z.infer<typeof createReviewerSchema>) {
  const currentUser = await requireRole(['ADMIN'], '/admin/committee');
  const validated = createReviewerSchema.parse(formData);

  // Uniqueness check for email, username, and phone
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: validated.email }, { username: validated.username }],
    },
    select: { email: true, username: true },
  });

  if (existingUser) {
    if (existingUser.email === validated.email) {
      throw new Error(`A user with email "${validated.email}" already exists.`);
    }
    if (existingUser.username === validated.username) {
      throw new Error(`Username "${validated.username}" is already taken.`);
    }
  }

  const existingPhone = await prisma.reviewerProfile.findFirst({
    where: { phone: validated.phone },
    select: { id: true },
  });

  if (existingPhone) {
    throw new Error(`Phone number "${validated.phone}" is already associated with an account.`);
  }

  const passwordHash = await hashPassword(validated.password);

  const newUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: validated.username,
        email: validated.email,
        username: validated.username,
        passwordHash,
        role: 'REVIEWER',
        mustChangePassword: true,
        isActive: true,
        emailVerified: new Date(),
      },
    });

    await tx.reviewerProfile.create({
      data: {
        userId: user.id,
        phone: validated.phone,
        committeeRole: 'Reviewer',
        blindReview: true,
        assignedPositions: 'ALL',
        assignedStages: 'ALL',
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: currentUser.id,
        role: currentUser.role,
        action: 'CREATE_REVIEWER',
        entity: 'User',
        entityId: user.id,
        meta: {
          memberId: user.id,
          username: user.username,
          email: user.email,
          phone: validated.phone,
          role: 'REVIEWER',
        },
      },
    });

    return user;
  });

  if (validated.sendCredentialsEmail) {
    try {
      await queueEmail({
        to: validated.email,
        subject: 'Your Saathi Teachers Selection Committee Reviewer Credentials',
        html: `
          <div style="font-family: sans-serif; line-height: 1.5; color: #1c1917; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #047857; margin-top: 0;">Saathi Teachers Programme 2027</h2>
            <p>Dear Reviewer,</p>
            <p>You have been onboarded as a member of the Selection Committee. Here are your portal access credentials:</p>
            <div style="background: #f5f5f4; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 4px 0;"><strong>Username:</strong> ${validated.username}</p>
              <p style="margin: 4px 0;"><strong>Email:</strong> ${validated.email}</p>
              <p style="margin: 4px 0;"><strong>Phone:</strong> ${validated.phone}</p>
              <p style="margin: 4px 0;"><strong>Temporary Password:</strong> <code style="background: #e7e5e4; padding: 2px 6px; border-radius: 4px;">${validated.password}</code></p>
            </div>
            <p style="color: #b45309; font-weight: bold;">Important: You must change your temporary password immediately upon your first sign-in.</p>
            <p><a href="${process.env.APP_URL || 'http://localhost:3000'}/login" style="display: inline-block; background: #047857; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">Sign In to Reviewer Portal</a></p>
          </div>
        `,
      });
    } catch (err) {
      console.error('Failed to queue credentials email:', err);
    }
  }

  revalidatePath('/admin/committee');
  revalidatePath('/admin');

  return {
    success: true,
    memberId: newUser.id,
    credentials: {
      username: validated.username,
      email: validated.email,
      password: validated.password,
    },
  };
}

// Backward-compatible alias
export const createCommitteeMember = createReviewer;

/**
 * Update Reviewer (Phone & Email)
 */
export async function updateReviewer(formData: z.infer<typeof updateReviewerSchema>) {
  const currentUser = await requireRole(['ADMIN'], '/admin/committee');
  const validated = updateReviewerSchema.parse(formData);

  // Check email uniqueness
  const existingEmail = await prisma.user.findFirst({
    where: {
      email: validated.email,
      NOT: { id: validated.id },
    },
    select: { id: true },
  });

  if (existingEmail) {
    throw new Error(`Email "${validated.email}" is already in use by another account.`);
  }

  // Check phone uniqueness
  const existingPhone = await prisma.reviewerProfile.findFirst({
    where: {
      phone: validated.phone,
      NOT: { userId: validated.id },
    },
    select: { id: true },
  });

  if (existingPhone) {
    throw new Error(`Phone number "${validated.phone}" is already in use by another reviewer.`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: validated.id },
      data: { email: validated.email },
    });

    await tx.reviewerProfile.upsert({
      where: { userId: validated.id },
      update: { phone: validated.phone },
      create: {
        userId: validated.id,
        phone: validated.phone,
        committeeRole: 'Reviewer',
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: currentUser.id,
        role: currentUser.role,
        action: 'UPDATE_REVIEWER',
        entity: 'User',
        entityId: validated.id,
        meta: {
          memberId: validated.id,
          email: validated.email,
          phone: validated.phone,
        },
      },
    });
  });

  revalidatePath('/admin/committee');
  revalidatePath(`/admin/committee/${validated.id}`);
  return { success: true };
}

// Backward-compatible alias
export const updateCommitteeMember = updateReviewer;

/**
 * Suspend or reactivate reviewer account.
 */
export async function toggleMemberStatus(userId: string) {
  const currentUser = await requireRole(['ADMIN'], '/admin/committee');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isActive: true, email: true, username: true },
  });

  if (!user) throw new Error('Member not found');

  const newStatus = !user.isActive;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { isActive: newStatus },
    });

    if (!newStatus) {
      // Invalidate sessions immediately on suspension
      await tx.session.deleteMany({
        where: { userId },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: currentUser.id,
        role: currentUser.role,
        action: newStatus ? 'REACTIVATE_COMMITTEE_MEMBER' : 'SUSPEND_COMMITTEE_MEMBER',
        entity: 'User',
        entityId: userId,
        meta: { memberId: userId, email: user.email, username: user.username },
      },
    });
  });

  revalidatePath('/admin/committee');
  revalidatePath(`/admin/committee/${userId}`);
  return { success: true, isActive: newStatus };
}

/**
 * Reset Reviewer password and send notification.
 */
export async function resetMemberPassword(userId: string) {
  const currentUser = await requireRole(['ADMIN'], '/admin/committee');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, username: true, name: true },
  });

  if (!user) throw new Error('Member not found');

  const temporaryPassword = await generateSecurePassword();
  const passwordHash = await hashPassword(temporaryPassword);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    await tx.session.deleteMany({
      where: { userId },
    });

    await tx.auditLog.create({
      data: {
        actorId: currentUser.id,
        role: currentUser.role,
        action: 'RESET_COMMITTEE_MEMBER_PASSWORD',
        entity: 'User',
        entityId: userId,
        meta: { memberId: userId, email: user.email, username: user.username },
      },
    });
  });

  try {
    await queueEmail({
      to: user.email,
      subject: 'Saathi Teachers Portal - Reviewer Password Reset',
      html: `
        <div style="font-family: sans-serif; line-height: 1.5; color: #1c1917; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #047857; margin-top: 0;">Password Reset Notice</h2>
          <p>Dear Reviewer (${user.username || user.name}),</p>
          <p>Your password for the Selection Committee evaluation portal has been reset by an administrator.</p>
          <div style="background: #f5f5f4; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Username:</strong> ${user.username || user.email}</p>
            <p style="margin: 4px 0;"><strong>Temporary Password:</strong> <code style="background: #e7e5e4; padding: 2px 6px; border-radius: 4px;">${temporaryPassword}</code></p>
          </div>
          <p style="color: #b45309; font-weight: bold;">Note: You will be prompted to change this password immediately after signing in.</p>
          <p><a href="${process.env.APP_URL || 'http://localhost:3000'}/login" style="display: inline-block; background: #047857; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">Sign In to Portal</a></p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Failed to queue reset email:', err);
  }

  revalidatePath('/admin/committee');
  revalidatePath(`/admin/committee/${userId}`);

  return {
    success: true,
    credentials: {
      username: user.username || user.email,
      email: user.email,
      password: temporaryPassword,
    },
  };
}

/**
 * Delete a reviewer and clean up associated records.
 */
export async function deleteCommitteeMember(userId: string) {
  const currentUser = await requireRole(['ADMIN'], '/admin/committee');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, username: true, role: true },
  });

  if (!user) throw new Error('Member not found');
  if (user.role !== 'REVIEWER') throw new Error('Only reviewers can be deleted from committee management');

  await prisma.$transaction(async (tx) => {
    await tx.reviewerProfile.deleteMany({ where: { userId } });
    await tx.stageAssignment.deleteMany({ where: { reviewerId: userId } });
    await tx.session.deleteMany({ where: { userId } });
    await tx.reviewerAssignment.deleteMany({ where: { reviewerId: userId } });
    await tx.reviewBatch.deleteMany({ where: { reviewerId: userId } });
    await tx.review.deleteMany({ where: { reviewerId: userId } });
    await tx.user.delete({ where: { id: userId } });

    await tx.auditLog.create({
      data: {
        actorId: currentUser.id,
        role: currentUser.role,
        action: 'DELETE_COMMITTEE_MEMBER',
        entity: 'User',
        entityId: userId,
        meta: { email: user.email, username: user.username },
      },
    });
  });

  revalidatePath('/admin/committee');
  return { success: true };
}

export const revokeMemberAccess = toggleMemberStatus;
export const deleteReviewer = deleteCommitteeMember;
