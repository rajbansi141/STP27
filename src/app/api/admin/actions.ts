'use server';

import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/password';
import { sendEmail } from '@/lib/email/service';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  REJECTION_REASON_MAP,
  ON_HOLD_CATEGORY_MAP,
  type PhoneInterviewSchedule,
} from '@/lib/constants/applicationReview';

export interface AdminActionState {
  success?: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}

const createReviewerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * Creates a new Selection Committee Reviewer account.
 * RBAC: ADMIN only.
 * Reviewer is created with mustChangePassword = true.
 */
export async function createReviewerAction(
  data: z.infer<typeof createReviewerSchema>
): Promise<AdminActionState> {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized. Admin credentials required.' };
    }

    const validated = createReviewerSchema.safeParse(data);
    if (!validated.success) {
      return {
        success: false,
        message: 'Invalid reviewer account data.',
        errors: validated.error.flatten().fieldErrors,
      };
    }

    const { name, email, username, password } = validated.data;

    // Check existing email
    const existingEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existingEmail) {
      return {
        success: false,
        errors: { email: ['An account with this email address already exists.'] },
      };
    }

    // Check existing username
    const existingUsername = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });
    if (existingUsername) {
      return {
        success: false,
        errors: { username: ['This username is already taken.'] },
      };
    }

    const passwordHash = await hashPassword(password);

    await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          username: username.toLowerCase(),
          passwordHash,
          role: 'REVIEWER',
          mustChangePassword: true,
          isActive: true,
          emailVerified: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          role: admin.role,
          action: 'CREATE_REVIEWER',
          entity: 'User',
          entityId: newUser.id,
          meta: JSON.stringify({
            createdUserId: newUser.id,
            username: newUser.username,
            email: newUser.email,
          }),
        },
      });
    });

    revalidatePath('/admin/users');
    return { success: true, message: 'Reviewer account provisioned successfully.' };
  } catch (err) {
    console.error('Create reviewer error:', err);
    return { success: false, message: 'Server error provisioning reviewer account.' };
  }
}

/**
 * Toggles a user's active/suspended status.
 * RBAC: ADMIN only.
 */
export async function toggleUserStatusAction(userId: string): Promise<AdminActionState> {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized.' };
    }

    if (admin.id === userId) {
      return { success: false, message: 'Administrators cannot suspend their own account.' };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return { success: false, message: 'User not found.' };
    }

    const newStatus = !targetUser.isActive;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { isActive: newStatus },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          role: admin.role,
          action: newStatus ? 'ACTIVATE_USER' : 'SUSPEND_USER',
          entity: 'User',
          entityId: userId,
          meta: JSON.stringify({
            targetEmail: targetUser.email,
            newStatus,
          }),
        },
      });
    });

    revalidatePath('/admin/users');
    return { success: true, message: 'User status successfully updated.' };
  } catch (err) {
    console.error('Toggle user status error:', err);
    return { success: false, message: 'Server error updating user status.' };
  }
}

const adminCreateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['ADMIN', 'REVIEWER', 'APPLICANT']),
  mustChangePassword: z.boolean().optional(),
});

/**
 * Creates a new user account with specified role (ADMIN, REVIEWER, APPLICANT).
 * RBAC: ADMIN only.
 */
export async function adminCreateUserAction(
  data: z.infer<typeof adminCreateUserSchema>
): Promise<AdminActionState> {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized. Admin credentials required.' };
    }

    const validated = adminCreateUserSchema.safeParse(data);
    if (!validated.success) {
      return {
        success: false,
        message: 'Invalid user account data.',
        errors: validated.error.flatten().fieldErrors,
      };
    }

    const { name, email, username, password, role, mustChangePassword } = validated.data;

    // Check existing email
    const existingEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existingEmail) {
      return {
        success: false,
        errors: { email: ['An account with this email address already exists.'] },
      };
    }

    // Check existing username
    const existingUsername = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });
    if (existingUsername) {
      return {
        success: false,
        errors: { username: ['This username is already taken.'] },
      };
    }

    const passwordHash = await hashPassword(password);

    await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          username: username.toLowerCase(),
          passwordHash,
          role,
          mustChangePassword: mustChangePassword ?? true,
          isActive: true,
          emailVerified: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          role: admin.role,
          action: `CREATE_${role}`,
          entity: 'User',
          entityId: newUser.id,
          meta: JSON.stringify({
            createdUserId: newUser.id,
            role,
            username: newUser.username,
            email: newUser.email,
          }),
        },
      });
    });

    revalidatePath('/admin/users');
    return { success: true, message: `${role} account provisioned successfully.` };
  } catch (err) {
    console.error('Admin create user error:', err);
    return { success: false, message: 'Server error provisioning user account.' };
  }
}

/**
 * Resets a user's password and unsets locks/attempts.
 * RBAC: ADMIN only.
 */
export async function adminResetUserPasswordAction(data: {
  userId: string;
  newPassword: string;
  mustChangePassword?: boolean;
}): Promise<AdminActionState> {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized.' };
    }

    if (!data.newPassword || data.newPassword.length < 8) {
      return { success: false, message: 'Password must be at least 8 characters long.' };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: data.userId },
    });
    if (!targetUser) {
      return { success: false, message: 'User not found.' };
    }

    const passwordHash = await hashPassword(data.newPassword);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: data.userId },
        data: {
          passwordHash,
          mustChangePassword: data.mustChangePassword ?? true,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          role: admin.role,
          action: 'RESET_USER_PASSWORD',
          entity: 'User',
          entityId: data.userId,
          meta: JSON.stringify({
            targetEmail: targetUser.email,
            mustChangePassword: data.mustChangePassword ?? true,
          }),
        },
      });
    });

    revalidatePath('/admin/users');
    return { success: true, message: 'Password reset successfully.' };
  } catch (err) {
    console.error('Admin reset password error:', err);
    return { success: false, message: 'Server error resetting password.' };
  }
}

/**
 * Updates a user's role (ADMIN, REVIEWER, APPLICANT).
 * RBAC: ADMIN only.
 */
export async function adminUpdateUserRoleAction(data: {
  userId: string;
  role: 'ADMIN' | 'REVIEWER' | 'APPLICANT';
}): Promise<AdminActionState> {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized.' };
    }

    if (admin.id === data.userId && data.role !== 'ADMIN') {
      return { success: false, message: 'Administrators cannot demote their own account.' };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: data.userId },
    });
    if (!targetUser) {
      return { success: false, message: 'User not found.' };
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: data.userId },
        data: { role: data.role },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          role: admin.role,
          action: 'UPDATE_USER_ROLE',
          entity: 'User',
          entityId: data.userId,
          meta: JSON.stringify({
            targetEmail: targetUser.email,
            oldRole: targetUser.role,
            newRole: data.role,
          }),
        },
      });
    });

    revalidatePath('/admin/users');
    return { success: true, message: `User role updated to ${data.role}.` };
  } catch (err) {
    console.error('Admin update user role error:', err);
    return { success: false, message: 'Server error updating user role.' };
  }
}

/**
 * Updates basic details (name, email, username) of a user.
 * RBAC: ADMIN only.
 */
export async function adminUpdateUserDetailsAction(data: {
  userId: string;
  name: string;
  email: string;
  username?: string | null;
}): Promise<AdminActionState> {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized.' };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: data.userId },
    });
    if (!targetUser) {
      return { success: false, message: 'User not found.' };
    }

    const normalizedEmail = data.email.toLowerCase().trim();
    const normalizedUsername = data.username ? data.username.toLowerCase().trim() : null;

    // Check unique email if changed
    if (normalizedEmail !== targetUser.email.toLowerCase()) {
      const emailConflict = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (emailConflict && emailConflict.id !== data.userId) {
        return { success: false, message: 'Email address is already in use by another account.' };
      }
    }

    // Check unique username if changed
    if (normalizedUsername && normalizedUsername !== targetUser.username?.toLowerCase()) {
      const usernameConflict = await prisma.user.findUnique({
        where: { username: normalizedUsername },
      });
      if (usernameConflict && usernameConflict.id !== data.userId) {
        return { success: false, message: 'Username is already in use by another account.' };
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: data.userId },
        data: {
          name: data.name.trim(),
          email: normalizedEmail,
          username: normalizedUsername,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          role: admin.role,
          action: 'UPDATE_USER_DETAILS',
          entity: 'User',
          entityId: data.userId,
          meta: JSON.stringify({
            oldEmail: targetUser.email,
            newEmail: normalizedEmail,
            oldName: targetUser.name,
            newName: data.name.trim(),
            oldUsername: targetUser.username,
            newUsername: normalizedUsername,
          }),
        },
      });
    });

    revalidatePath('/admin/users');
    return { success: true, message: 'User details updated successfully.' };
  } catch (err) {
    console.error('Admin update user details error:', err);
    return { success: false, message: 'Server error updating user details.' };
  }
}

/**
 * Unlocks a locked user account (clears failed attempts and lock expiry).
 * RBAC: ADMIN only.
 */
export async function adminUnlockUserAction(userId: string): Promise<AdminActionState> {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized.' };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!targetUser) {
      return { success: false, message: 'User not found.' };
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          isActive: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          role: admin.role,
          action: 'UNLOCK_USER',
          entity: 'User',
          entityId: userId,
          meta: JSON.stringify({
            targetEmail: targetUser.email,
          }),
        },
      });
    });

    revalidatePath('/admin/users');
    return { success: true, message: 'User account unlocked successfully.' };
  } catch (err) {
    console.error('Admin unlock user error:', err);
    return { success: false, message: 'Server error unlocking user.' };
  }
}

/**
 * Batch activate or suspend users.
 * RBAC: ADMIN only.
 */
export async function adminBatchToggleStatusAction(data: {
  userIds: string[];
  setActive: boolean;
}): Promise<AdminActionState> {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized.' };
    }

    // Filter out current admin so they don't self-suspend
    const targetIds = data.userIds.filter((id) => id !== admin.id);
    if (targetIds.length === 0) {
      return { success: false, message: 'No valid user accounts to update.' };
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { id: { in: targetIds } },
        data: { isActive: data.setActive },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          role: admin.role,
          action: data.setActive ? 'BATCH_ACTIVATE_USERS' : 'BATCH_SUSPEND_USERS',
          entity: 'User',
          entityId: 'BATCH',
          meta: JSON.stringify({
            targetUserIds: targetIds,
            setActive: data.setActive,
          }),
        },
      });
    });

    revalidatePath('/admin/users');
    return {
      success: true,
      message: `${targetIds.length} user account(s) successfully ${data.setActive ? 'activated' : 'suspended'}.`,
    };
  } catch (err) {
    console.error('Admin batch toggle status error:', err);
    return { success: false, message: 'Server error updating user accounts.' };
  }
}

/**
 * Batch force password reset on next login for selected users.
 * RBAC: ADMIN only.
 */
export async function adminBatchForcePasswordResetAction(data: {
  userIds: string[];
}): Promise<AdminActionState> {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized.' };
    }

    const targetIds = data.userIds.filter((id) => id !== admin.id);
    if (targetIds.length === 0) {
      return { success: false, message: 'No valid user accounts selected.' };
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { id: { in: targetIds } },
        data: { mustChangePassword: true },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          role: admin.role,
          action: 'BATCH_FORCE_PASSWORD_RESET',
          entity: 'User',
          entityId: 'BATCH',
          meta: JSON.stringify({
            targetUserIds: targetIds,
          }),
        },
      });
    });

    revalidatePath('/admin/users');
    return {
      success: true,
      message: `Password reset flag enabled for ${targetIds.length} user account(s).`,
    };
  } catch (err) {
    console.error('Admin batch password reset error:', err);
    return { success: false, message: 'Server error enforcing password reset.' };
  }
}

/**
 * Deletes a user account if safe (no historical reviews submitted).
 * RBAC: ADMIN only.
 */
export async function adminDeleteUserAction(userId: string): Promise<AdminActionState> {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized.' };
    }

    if (admin.id === userId) {
      return { success: false, message: 'Administrators cannot delete their own account.' };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            reviews: true,
            applications: true,
            reviewerAssignments: true,
          },
        },
      },
    });

    if (!targetUser) {
      return { success: false, message: 'User not found.' };
    }

    if (targetUser._count.reviews > 0) {
      return {
        success: false,
        message:
          'Cannot delete user who has submitted candidate evaluation reviews. Suspend the account instead to maintain evaluation audit integrity.',
      };
    }

    await prisma.$transaction(async (tx) => {
      // Clean up sessions, verification codes, password reset codes, audit logs actor if any
      await tx.session.deleteMany({ where: { userId } });
      await tx.verificationCode.deleteMany({ where: { userId } });
      await tx.passwordResetCode.deleteMany({ where: { userId } });
      await tx.reviewerAssignment.deleteMany({ where: { reviewerId: userId } });
      await tx.reviewerProfile.deleteMany({ where: { userId } });
      await tx.stageAssignment.deleteMany({ where: { reviewerId: userId } });

      await tx.user.delete({
        where: { id: userId },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          role: admin.role,
          action: 'DELETE_USER',
          entity: 'User',
          entityId: userId,
          meta: JSON.stringify({
            deletedUserEmail: targetUser.email,
            deletedUserName: targetUser.name,
            deletedUserRole: targetUser.role,
          }),
        },
      });
    });

    revalidatePath('/admin/users');
    return { success: true, message: `Account for ${targetUser.name} deleted successfully.` };
  } catch (err) {
    console.error('Admin delete user error:', err);
    return { success: false, message: 'Server error deleting user account.' };
  }
}

/**
 * Allocates or re-assigns a candidate to a Selection Committee Reviewer.
 * RBAC: ADMIN only.
 */
export async function assignReviewerAction({
  applicationId,
  reviewerId,
}: {
  applicationId: string;
  reviewerId: string;
}): Promise<AdminActionState> {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized.' };
    }

    const [application, reviewer] = await Promise.all([
      prisma.application.findUnique({
        where: { id: applicationId },
        include: { applicant: true },
      }),
      prisma.user.findUnique({
        where: { id: reviewerId },
      }),
    ]);

    if (!application || !reviewer) {
      return { success: false, message: 'Application or Reviewer not found.' };
    }

    await prisma.$transaction(async (tx) => {
      // Upsert assignment
      await tx.reviewerAssignment.upsert({
        where: {
          applicationId_reviewerId: {
            applicationId,
            reviewerId,
          },
        },
        create: {
          applicationId,
          reviewerId,
          assignedById: admin.id,
        },
        update: {
          assignedById: admin.id,
          assignedAt: new Date(),
        },
      });

      // Notify the reviewer
      await tx.notification.create({
        data: {
          userId: reviewerId,
          title: `New Candidate Assigned: ${application.refNo}`,
          body: `You have been allocated candidate ${application.applicant.name} (${application.refNo}) for evaluation.`,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          role: admin.role,
          action: 'ASSIGN_REVIEWER',
          entity: 'Application',
          entityId: applicationId,
          meta: JSON.stringify({
            refNo: application.refNo,
            reviewerId,
            reviewerName: reviewer.name,
          }),
        },
      });
    });

    revalidatePath('/admin/candidates');
    revalidatePath('/review');
    revalidatePath('/reviewer');
    return { success: true, message: 'Candidate successfully assigned to reviewer.' };
  } catch (err) {
    console.error('Assign reviewer error:', err);
    return { success: false, message: 'Server error allocating reviewer.' };
  }
}

/**
 * Admin directly transitions or advances candidate to a destination stage.
 * Dispatches candidate email and records full stage history.
 * RBAC: ADMIN only.
 */
export async function adminAdvanceStageAction({
  applicationId,
  nextStageCode,
  note,
}: {
  applicationId: string;
  nextStageCode: string;
  note?: string;
}): Promise<AdminActionState> {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized.' };
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { applicant: true },
    });

    if (!application) {
      return { success: false, message: 'Application not found.' };
    }

    const fromStage = application.stage;

    await prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: applicationId },
        data: { stage: nextStageCode },
      });

      await tx.stageHistory.create({
        data: {
          applicationId,
          fromStage,
          toStage: nextStageCode,
          actorId: admin.id,
          note: note || `Stage updated to ${nextStageCode} by Administrator`,
        },
      });

      await tx.notification.create({
        data: {
          userId: application.applicantId,
          title: `Application Progressed - ${nextStageCode}`,
          body: `Your application (${application.refNo}) has moved to stage: ${nextStageCode}.`,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          role: admin.role,
          action: 'ADMIN_TRANSITION_STAGE',
          entity: 'Application',
          entityId: applicationId,
          meta: JSON.stringify({
            refNo: application.refNo,
            fromStage,
            toStage: nextStageCode,
          }),
        },
      });
    });

    // Send email notification to candidate
    const isNe = application.applicant.locale === 'ne';
    const emailSubject = isNe
      ? `छनोट चरण अपडेट (${application.refNo}) - साथी शिक्षक कार्यक्रम २०२७`
      : `Selection Stage Progression (Ref: ${application.refNo}) - Saathi Teachers Programme 2027`;

    const emailHtml = isNe
      ? `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #166534;">साथी शिक्षक कार्यक्रम २०२७</h2>
          <p>आदरणीय <strong>${application.applicant.name}</strong>,</p>
          <p>तपाईंको आवेदन (दर्ता नं: <strong>${application.refNo}</strong>) नयाँ चरण <strong>${nextStageCode}</strong> मा सिफारिस गरिएको छ।</p>
          <p>छनोट समितिको टोलीले आगामी चरणको थप जानकारी छिट्टै तपाईंको इमेलमा पठाउनेछ।</p>
        </div>
      `
      : `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #166534;">Saathi Teachers Programme 2027</h2>
          <p>Dear <strong>${application.applicant.name}</strong>,</p>
          <p>Your application (Ref: <strong>${application.refNo}</strong>) has progressed to the selection stage: <strong>${nextStageCode}</strong>.</p>
          <p>Our Selection Committee will contact you with specific instructions regarding the upcoming assessment.</p>
        </div>
      `;

    await sendEmail({
      to: application.applicant.email,
      subject: emailSubject,
      html: emailHtml,
    });

    revalidatePath('/admin');
    revalidatePath('/admin/candidates');
    revalidatePath(`/admin/candidates/${applicationId}`);
    revalidatePath('/review');
    revalidatePath(`/review/${applicationId}`);
    revalidatePath('/reviewer');
    revalidatePath(`/reviewer/${applicationId}`);

    return { success: true, message: 'Candidate successfully progressed to new stage.' };
  } catch (err) {
    console.error('Admin advance stage error:', err);
    return { success: false, message: 'Server error transitioning stage.' };
  }
}

/**
 * Updates application cycle settings (application deadline, cohort year, cycle label).
 * Enforces immediate countdown update on public landing page.
 * RBAC: ADMIN only.
 */
export async function updateSettingsAction(data: {
  deadline: string;
  cohortYear: number;
  cycleLabel: string;
}): Promise<AdminActionState> {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized.' };
    }

    const deadlineDate = new Date(data.deadline);
    if (isNaN(deadlineDate.getTime())) {
      return { success: false, message: 'Invalid deadline date/time format.' };
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.settings.upsert({
        where: { id: 'default' },
        create: {
          id: 'default',
          deadline: deadlineDate,
          cohortYear: data.cohortYear,
          cycleLabel: data.cycleLabel,
        },
        update: {
          deadline: deadlineDate,
          cohortYear: data.cohortYear,
          cycleLabel: data.cycleLabel,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          role: admin.role,
          action: 'UPDATE_SETTINGS',
          entity: 'Settings',
          entityId: updated.id,
          meta: JSON.stringify({
            deadline: deadlineDate.toISOString(),
            cohortYear: data.cohortYear,
            cycleLabel: data.cycleLabel,
          }),
        },
      });
    });

    revalidatePath('/');
    revalidatePath('/apply');
    revalidatePath('/admin/settings');
    return { success: true, message: 'Cycle settings updated successfully.' };
  } catch (err) {
    console.error('Update settings error:', err);
    return { success: false, message: 'Server error saving settings.' };
  }
}

/**
 * Updates an individual stage's details and active toggle in the pipeline.
 * RBAC: ADMIN only.
 */
export async function updateStageAction(data: {
  id: string;
  nameEn: string;
  nameNe: string;
  isActive: boolean;
}): Promise<AdminActionState> {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized.' };
    }

    await prisma.$transaction(async (tx) => {
      const updatedStage = await tx.stage.update({
        where: { id: data.id },
        data: {
          nameEn: data.nameEn,
          nameNe: data.nameNe,
          isActive: data.isActive,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          role: admin.role,
          action: 'UPDATE_STAGE',
          entity: 'Stage',
          entityId: data.id,
          meta: JSON.stringify({
            code: updatedStage.code,
            nameEn: data.nameEn,
            nameNe: data.nameNe,
            isActive: data.isActive,
          }),
        },
      });
    });

    revalidatePath('/admin/settings');
    revalidatePath('/review');
    revalidatePath('/');
    return { success: true, message: 'Stage details updated successfully.' };
  } catch (err) {
    console.error('Update stage error:', err);
    return { success: false, message: 'Server error updating stage.' };
  }
}

/**
 * Updates subject and HTML body of a bilingual EmailTemplate.
 * RBAC: ADMIN only.
 */
export async function updateEmailTemplateAction(data: {
  id: string;
  subject: string;
  body: string;
}): Promise<AdminActionState> {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized.' };
    }

    await prisma.$transaction(async (tx) => {
      const updatedTmpl = await tx.emailTemplate.update({
        where: { id: data.id },
        data: {
          subject: data.subject,
          body: data.body,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          role: admin.role,
          action: 'UPDATE_EMAIL_TEMPLATE',
          entity: 'EmailTemplate',
          entityId: data.id,
          meta: JSON.stringify({
            code: updatedTmpl.code,
            locale: updatedTmpl.locale,
            subject: data.subject,
          }),
        },
      });
    });

    revalidatePath('/admin/templates');
    return { success: true, message: 'Email template updated successfully.' };
  } catch (err) {
    console.error('Update email template error:', err);
    return { success: false, message: 'Server error updating email template.' };
  }
}

/**
 * Triggers manual flush of pending email outbox queue from admin dashboard.
 * RBAC: ADMIN only.
 */
export async function flushOutboxAction(): Promise<{
  success: boolean;
  message: string;
  processed?: number;
  succeeded?: number;
  failed?: number;
}> {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized.' };
    }

    const { processEmailOutbox } = await import('@/lib/email/queue');
    const result = await processEmailOutbox();

    revalidatePath('/admin/templates');
    return {
      success: true,
      message: `Processed ${result.processed} emails (${result.succeeded} sent, ${result.failed} failed).`,
      ...result,
    };
  } catch (err) {
    console.error('Flush outbox error:', err);
    return { success: false, message: 'Server error flushing email outbox.' };
  }
}

/**
 * Auto-assigns applications to active reviewers in a balanced / round-robin manner.
 * Supports filtering by target stage and unassigned status.
 * RBAC: ADMIN only.
 */
export async function autoAssignReviewersAction({
  stageCode,
  onlyUnassigned = true,
}: {
  stageCode?: string;
  onlyUnassigned?: boolean;
}): Promise<AdminActionState & { assignedCount?: number }> {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized. Admin credentials required.' };
    }

    // 1. Fetch active reviewers
    const activeReviewers = await prisma.user.findMany({
      where: { role: 'REVIEWER', isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { createdAt: 'asc' },
    });

    if (activeReviewers.length === 0) {
      return {
        success: false,
        message: 'No active reviewers available in the committee. Please activate reviewers first.',
      };
    }

    // 2. Fetch target applications (not draft)
    const applications = await prisma.application.findMany({
      where: {
        status: { not: 'DRAFT' },
        ...(stageCode && stageCode !== 'ALL' ? { stage: stageCode } : {}),
        ...(onlyUnassigned ? { assignments: { none: {} } } : {}),
      },
      include: {
        applicant: true,
        assignments: true,
      },
      orderBy: { submittedAt: 'asc' },
    });

    if (applications.length === 0) {
      return {
        success: false,
        message: onlyUnassigned
          ? `No unassigned candidates found${stageCode && stageCode !== 'ALL' ? ` in stage ${stageCode}` : ''}.`
          : 'No candidate applications found to assign.',
      };
    }

    // 3. Count current assignments per reviewer to balance workloads
    const reviewerWorkloads = await prisma.reviewerAssignment.groupBy({
      by: ['reviewerId'],
      _count: { applicationId: true },
    });

    const workloadMap = new Map<string, number>();
    activeReviewers.forEach((r) => workloadMap.set(r.id, 0));
    reviewerWorkloads.forEach((w) => {
      if (workloadMap.has(w.reviewerId)) {
        workloadMap.set(w.reviewerId, w._count.applicationId);
      }
    });

    // 4. Distribute applications evenly (selecting reviewer with minimum current assignments)
    const assignmentsToCreate: { applicationId: string; reviewerId: string; assignedById: string }[] = [];
    const notificationMap = new Map<string, number>();

    // Copy array for mutable sorting
    const sortedReviewers = [...activeReviewers];

    for (const app of applications) {
      // Sort reviewers by current workload ascending
      sortedReviewers.sort((a, b) => (workloadMap.get(a.id) || 0) - (workloadMap.get(b.id) || 0));
      const chosenReviewer = sortedReviewers[0];

      // Avoid duplicate assignment if not onlyUnassigned
      const alreadyAssigned = app.assignments.some((a) => a.reviewerId === chosenReviewer.id);
      if (!alreadyAssigned) {
        assignmentsToCreate.push({
          applicationId: app.id,
          reviewerId: chosenReviewer.id,
          assignedById: admin.id,
        });

        // Increment workload counter
        workloadMap.set(chosenReviewer.id, (workloadMap.get(chosenReviewer.id) || 0) + 1);
        notificationMap.set(chosenReviewer.id, (notificationMap.get(chosenReviewer.id) || 0) + 1);
      }
    }

    if (assignmentsToCreate.length === 0) {
      return {
        success: false,
        message: 'All matching applications are already allocated to the available reviewers.',
      };
    }

    await prisma.$transaction(async (tx) => {
      // Batch create assignments using upsert
      for (const item of assignmentsToCreate) {
        await tx.reviewerAssignment.upsert({
          where: {
            applicationId_reviewerId: {
              applicationId: item.applicationId,
              reviewerId: item.reviewerId,
            },
          },
          create: item,
          update: {
            assignedById: admin.id,
            assignedAt: new Date(),
          },
        });
      }

      // Notify reviewers who received new candidates
      for (const [reviewerId, count] of notificationMap.entries()) {
        await tx.notification.create({
          data: {
            userId: reviewerId,
            title: `New Candidates Assigned (${count})`,
            body: `You have been allocated ${count} candidate applications${stageCode && stageCode !== 'ALL' ? ` in ${stageCode}` : ''} for review.`,
          },
        });
      }

      // Audit Log
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          role: admin.role,
          action: 'AUTO_ASSIGN_REVIEWERS',
          entity: 'ReviewerAssignment',
          meta: JSON.stringify({
            stage: stageCode || 'ALL',
            totalApplicationsAssigned: assignmentsToCreate.length,
            reviewersCount: activeReviewers.length,
          }),
        },
      });
    });

    revalidatePath('/admin/candidates');
    revalidatePath('/review');
    revalidatePath('/reviewer');

    return {
      success: true,
      assignedCount: assignmentsToCreate.length,
      message: `Successfully allocated ${assignmentsToCreate.length} candidate(s) evenly across ${activeReviewers.length} reviewer(s).`,
    };
  } catch (err) {
    console.error('Auto-assign error:', err);
    return { success: false, message: 'Server error during auto-assignment.' };
  }
}

/**
 * Manually assigns a batch of candidates to a specific reviewer.
 * RBAC: ADMIN only.
 */
export async function batchAssignReviewerAction({
  applicationIds,
  reviewerId,
}: {
  applicationIds: string[];
  reviewerId: string;
}): Promise<AdminActionState> {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized.' };
    }

    if (!applicationIds || applicationIds.length === 0) {
      return { success: false, message: 'No candidates selected for assignment.' };
    }

    const reviewer = await prisma.user.findUnique({
      where: { id: reviewerId },
    });

    if (!reviewer || reviewer.role !== 'REVIEWER') {
      return { success: false, message: 'Invalid reviewer selected.' };
    }

    await prisma.$transaction(async (tx) => {
      for (const appId of applicationIds) {
        await tx.reviewerAssignment.upsert({
          where: {
            applicationId_reviewerId: {
              applicationId: appId,
              reviewerId,
            },
          },
          create: {
            applicationId: appId,
            reviewerId,
            assignedById: admin.id,
          },
          update: {
            assignedById: admin.id,
            assignedAt: new Date(),
          },
        });
      }

      // Notify the reviewer
      await tx.notification.create({
        data: {
          userId: reviewerId,
          title: `Candidates Assigned (${applicationIds.length})`,
          body: `You have been allocated ${applicationIds.length} candidate(s) by administrator for review.`,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          role: admin.role,
          action: 'BATCH_ASSIGN_REVIEWER',
          entity: 'ReviewerAssignment',
          meta: JSON.stringify({
            reviewerId,
            reviewerName: reviewer.name,
            count: applicationIds.length,
            applicationIds,
          }),
        },
      });
    });

    revalidatePath('/admin/candidates');
    revalidatePath('/review');
    revalidatePath('/reviewer');

    return {
      success: true,
      message: `Successfully assigned ${applicationIds.length} candidate(s) to ${reviewer.name}.`,
    };
  } catch (err) {
    console.error('Batch assign error:', err);
    return { success: false, message: 'Server error during batch assignment.' };
  }
}

/**
 * Unassigns a specific reviewer or all reviewers from a single application.
 * RBAC: ADMIN only.
 */
export async function unassignReviewerAction({
  applicationId,
  reviewerId,
}: {
  applicationId: string;
  reviewerId?: string;
}): Promise<AdminActionState> {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized. Admin credentials required.' };
    }

    const whereClause: { applicationId: string; reviewerId?: string } = { applicationId };
    if (reviewerId) {
      whereClause.reviewerId = reviewerId;
    }

    const deleted = await prisma.reviewerAssignment.deleteMany({
      where: whereClause,
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        role: admin.role,
        action: 'UNASSIGN_REVIEWER',
        entity: 'ReviewerAssignment',
        meta: JSON.stringify({
          applicationId,
          reviewerId: reviewerId || 'ALL',
          deletedCount: deleted.count,
        }),
      },
    });

    revalidatePath('/admin/candidates');
    revalidatePath('/review');
    revalidatePath('/reviewer');

    return {
      success: true,
      message: reviewerId
        ? 'Reviewer successfully unassigned.'
        : 'All reviewer allocations removed for this candidate.',
    };
  } catch (err) {
    console.error('Unassign reviewer error:', err);
    return { success: false, message: 'Server error removing reviewer assignment.' };
  }
}

/**
 * Batch unassigns reviewers from multiple applications.
 * RBAC: ADMIN only.
 */
export async function batchUnassignReviewersAction({
  applicationIds,
  reviewerId,
}: {
  applicationIds: string[];
  reviewerId?: string;
}): Promise<AdminActionState> {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized. Admin credentials required.' };
    }

    if (!applicationIds || applicationIds.length === 0) {
      return { success: false, message: 'No candidates selected for unassignment.' };
    }

    const whereClause: { applicationId: { in: string[] }; reviewerId?: string } = {
      applicationId: { in: applicationIds },
    };
    if (reviewerId) {
      whereClause.reviewerId = reviewerId;
    }

    const deleted = await prisma.reviewerAssignment.deleteMany({
      where: whereClause,
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        role: admin.role,
        action: 'BATCH_UNASSIGN_REVIEWERS',
        entity: 'ReviewerAssignment',
        meta: JSON.stringify({
          applicationIds,
          reviewerId: reviewerId || 'ALL',
          deletedCount: deleted.count,
        }),
      },
    });

    revalidatePath('/admin/candidates');
    revalidatePath('/review');
    revalidatePath('/reviewer');

    return {
      success: true,
      message: `Successfully removed assignments for ${deleted.count} allocation(s).`,
    };
  } catch (err) {
    console.error('Batch unassign error:', err);
    return { success: false, message: 'Server error during batch unassignment.' };
  }
}

/**
 * Updates application status (e.g. SHORTLISTED, ON_HOLD, REJECTED, FINAL_SELECTED)
 * RBAC: ADMIN only.
 */
export async function adminUpdateStatusAction({
  applicationId,
  status,
  note,
}: {
  applicationId: string;
  status: string;
  note?: string;
}): Promise<AdminActionState> {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized. Admin credentials required.' };
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { applicant: true },
    });

    if (!application) {
      return { success: false, message: 'Application not found.' };
    }

    const previousStatus = application.status;

    await prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: applicationId },
        data: { status },
      });

      await tx.stageHistory.create({
        data: {
          applicationId,
          fromStage: application.stage,
          toStage: application.stage,
          actorId: admin.id,
          note: note || `Status changed from ${previousStatus} to ${status} by Administrator`,
        },
      });

      await tx.notification.create({
        data: {
          userId: application.applicantId,
          title: `Application Status Updated: ${status}`,
          body: `Your application (${application.refNo}) status has been updated to: ${status}.`,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          role: admin.role,
          action: 'ADMIN_UPDATE_STATUS',
          entity: 'Application',
          entityId: applicationId,
          meta: JSON.stringify({
            refNo: application.refNo,
            fromStatus: previousStatus,
            toStatus: status,
            note,
          }),
        },
      });
    });

    revalidatePath('/admin');
    revalidatePath('/admin/candidates');
    revalidatePath(`/admin/candidates/${applicationId}`);
    return { success: true, message: `Application status updated to ${status}.` };
  } catch (err) {
    console.error('Update status error:', err);
    return { success: false, message: 'Server error updating status.' };
  }
}

/**
 * Requests specific clarification or missing information from a candidate.
 * Puts candidate on hold and notifies them via email and portal.
 * RBAC: ADMIN or REVIEWER.
 */
export async function requestCandidateClarificationAction({
  applicationId,
  message,
  category,
}: {
  applicationId: string;
  message: string;
  category?: string;
}): Promise<AdminActionState> {
  try {
    const admin = await getCurrentUser();
    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'REVIEWER')) {
      return { success: false, message: 'Unauthorized. Staff permissions required.' };
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { applicant: true },
    });

    if (!application) {
      return { success: false, message: 'Application not found.' };
    }

    const currentData = typeof application.data === 'string'
      ? JSON.parse(application.data)
      : application.data || {};

    const clarificationRequest = {
      id: `clr_${Date.now()}`,
      message,
      category: category || 'General Clarification',
      requestedAt: new Date().toISOString(),
      requestedById: admin.id,
      requestedByName: admin.name,
    };

    const updatedData = {
      ...currentData,
      clarificationRequest,
    };

    await prisma.$transaction(async (tx) => {
      // Put candidate on hold while clarification is pending
      await tx.application.update({
        where: { id: applicationId },
        data: {
          status: 'ON_HOLD',
          data: JSON.stringify(updatedData),
        },
      });

      await tx.stageHistory.create({
        data: {
          applicationId,
          fromStage: application.stage,
          toStage: application.stage,
          actorId: admin.id,
          note: `Clarification requested: "${message.slice(0, 100)}${message.length > 100 ? '...' : ''}"`,
        },
      });

      await tx.notification.create({
        data: {
          userId: application.applicantId,
          title: 'Action Required: Information Requested / थप जानकारी आवश्यक',
          body: `The Selection Committee has requested clarification regarding your application (${application.refNo}): ${message}`,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          role: admin.role,
          action: 'REQUEST_CANDIDATE_CLARIFICATION',
          entity: 'Application',
          entityId: applicationId,
          meta: JSON.stringify({
            refNo: application.refNo,
            message,
            category,
          }),
        },
      });
    });

    // Send email to applicant
    const isNe = application.applicant.locale === 'ne';
    const emailSubject = isNe
      ? `छनोट समितिबाट थप जानकारी अनुरोध (${application.refNo}) - साथी शिक्षक कार्यक्रम २०२७`
      : `Clarification Requested (${application.refNo}) - Saathi Teachers Programme 2027`;

    const emailHtml = isNe
      ? `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #166534;">साथी शिक्षक कार्यक्रम २०२७</h2>
          <p>आदरणीय <strong>${application.applicant.name}</strong>,</p>
          <p>तपाईंको आवेदन (दर्ता नं: <strong>${application.refNo}</strong>) मूल्याङ्कनको क्रममा छनोट समितिले निम्न विषयमा थप जानकारी/स्पष्टीकरण अनुरोध गरेको छ:</p>
          <div style="background-color: #fef3c7; border-left: 4px solid #d97706; padding: 12px; margin: 16px 0; border-radius: 4px;">
            <strong>समितिको अनुरोध:</strong><br/>
            ${message}
          </div>
          <p>कृपया आफ्नो पोर्टलमा लगइन गरी थप विवरण हेर्नुहोला।</p>
        </div>
      `
      : `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #166534;">Saathi Teachers Programme 2027</h2>
          <p>Dear <strong>${application.applicant.name}</strong>,</p>
          <p>During the review of your application (Ref: <strong>${application.refNo}</strong>), the Selection Committee has requested the following clarification:</p>
          <div style="background-color: #fef3c7; border-left: 4px solid #d97706; padding: 12px; margin: 16px 0; border-radius: 4px;">
            <strong>Committee Note:</strong><br/>
            ${message}
          </div>
          <p>Please log in to your candidate dashboard to review this request.</p>
        </div>
      `;

    await sendEmail({
      to: application.applicant.email,
      subject: emailSubject,
      html: emailHtml,
    });

    revalidatePath('/admin');
    revalidatePath('/admin/candidates');
    revalidatePath(`/admin/candidates/${applicationId}`);
    revalidatePath(`/review/${applicationId}`);
    revalidatePath('/applicant');

    return { success: true, message: 'Clarification request sent to candidate successfully.' };
  } catch (err) {
    console.error('Clarification request error:', err);
    return { success: false, message: 'Failed to send clarification request.' };
  }
}

/**
 * Resolves an application on hold (Advance to Stage, Shortlist, Waitlist, or Reject).
 * RBAC: ADMIN only.
 */
export async function resolveHoldStatusAction({
  applicationId,
  decision,
  targetStageCode,
  note,
}: {
  applicationId: string;
  decision: 'ADVANCE' | 'SHORTLIST' | 'WAITLIST' | 'REJECT';
  targetStageCode?: string;
  note?: string;
}): Promise<AdminActionState> {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized. Admin credentials required.' };
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { applicant: true },
    });

    if (!application) {
      return { success: false, message: 'Application not found.' };
    }

    let newStatus = application.status;
    let newStage = application.stage;

    if (decision === 'ADVANCE') {
      newStatus = 'SHORTLISTED';
      if (targetStageCode) {
        newStage = targetStageCode;
      } else {
        const activeStages = await prisma.stage.findMany({
          where: { isActive: true },
          orderBy: { order: 'asc' },
        });
        const currentIndex = activeStages.findIndex((s) => s.code === application.stage);
        if (currentIndex !== -1 && currentIndex < activeStages.length - 1) {
          newStage = activeStages[currentIndex + 1].code;
        }
      }
    } else if (decision === 'SHORTLIST') {
      newStatus = 'SHORTLISTED';
    } else if (decision === 'WAITLIST') {
      newStatus = 'ON_HOLD';
    } else if (decision === 'REJECT') {
      newStatus = 'REJECTED';
    }

    const currentData = typeof application.data === 'string'
      ? JSON.parse(application.data)
      : application.data || {};

    const updatedData = {
      ...currentData,
      holdDetails: decision === 'WAITLIST' ? currentData.holdDetails : null,
      holdResolution: {
        decision,
        resolvedAt: new Date().toISOString(),
        resolvedBy: admin.name,
        note: note || '',
      },
      // Clear pending clarification request if advanced, shortlisted, or rejected
      clarificationRequest: decision === 'WAITLIST' ? currentData.clarificationRequest : null,
    };

    await prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: applicationId },
        data: {
          status: newStatus,
          stage: newStage,
          data: JSON.stringify(updatedData),
        },
      });

      await tx.stageHistory.create({
        data: {
          applicationId,
          fromStage: application.stage,
          toStage: newStage,
          actorId: admin.id,
          note: note || `Hold resolved with decision: ${decision} (${newStatus})`,
        },
      });

      await tx.notification.create({
        data: {
          userId: application.applicantId,
          title: decision === 'ADVANCE' || decision === 'SHORTLIST'
            ? 'Application Progressed / आवेदन अगाडि बढ्यो'
            : decision === 'REJECT'
            ? 'Selection Update / छनोट अद्यावधिक'
            : 'Application Status Update / आवेदन स्थिति अद्यावधिक',
          body: decision === 'ADVANCE'
            ? `Your application (${application.refNo}) has progressed to stage: ${newStage}.`
            : decision === 'SHORTLIST'
            ? `Your application (${application.refNo}) has been shortlisted by the committee.`
            : `Your application (${application.refNo}) status is now: ${newStatus}.`,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          role: admin.role,
          action: 'RESOLVE_HOLD_DECISION',
          entity: 'Application',
          entityId: applicationId,
          meta: JSON.stringify({
            refNo: application.refNo,
            decision,
            newStatus,
            newStage,
            note,
          }),
        },
      });
    });

    revalidatePath('/admin');
    revalidatePath('/admin/candidates');
    revalidatePath(`/admin/candidates/${applicationId}`);
    revalidatePath(`/review/${applicationId}`);
    revalidatePath('/applicant');

    return { success: true, message: `Hold successfully resolved: ${decision}.` };
  } catch (err) {
    console.error('Resolve hold error:', err);
    return { success: false, message: 'Server error resolving hold status.' };
  }
}

function buildRejectionEmailHtml({
  applicantName,
  refNo,
  stageName,
  reasonTitle,
  feedbackNote,
  locale = 'en',
}: {
  applicantName: string;
  refNo: string;
  stageName: string;
  reasonTitle: string;
  feedbackNote?: string;
  locale?: string;
}) {
  const isNe = locale === 'ne';
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #065f46; margin: 0; font-size: 22px;">साथी शिक्षक कार्यक्रम २०२७</h2>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Saathi Teachers Programme 2027 • Selection Committee</p>
      </div>
      <p style="font-size: 15px;">${isNe ? 'आदरणीय' : 'Dear'} <strong>${applicantName}</strong>,</p>
      <p style="line-height: 1.6; font-size: 14px;">
        ${
          isNe
            ? 'साथी शिक्षक कार्यक्रम २०२७ मा आफ्नो आवेदन र समय प्रदान गर्नुभएकोमा हार्दिक धन्यवाद व्यक्त गर्दछौं। नेपालको सार्वजनिक शिक्षा रूपान्तरणका लागि तपाईंले देखाउनुभएको समर्पण र दृढ इच्छाशक्तिको हामी उच्च मूल्याङ्कन गर्दछौं।'
            : 'Thank you for your sincere interest, effort, and dedication in applying for the Saathi Teachers Programme 2027. We deeply appreciate the passion and conviction you demonstrated for improving education in community schools across Nepal.'
        }
      </p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0;">
        <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">
          ${isNe ? 'दर्ता नम्बर' : 'Reference'}: ${refNo}
        </p>
        <p style="margin: 0 0 6px 0; font-size: 13px; color: #334155;">
          <strong>${isNe ? 'पुग्नुभएको छनोट चरण:' : 'Selection Stage Reached:'}</strong> ${stageName}
        </p>
        <p style="margin: 0 0 6px 0; font-size: 13px; color: #334155;">
          <strong>${isNe ? 'समिति सारांश:' : 'Committee Summary:'}</strong> ${reasonTitle}
        </p>
        ${
          feedbackNote
            ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #475569; font-style: italic; background-color: #f1f5f9; padding: 10px; border-radius: 8px;">"${feedbackNote}"</p>`
            : ''
        }
      </div>
      <p style="line-height: 1.6; font-size: 14px;">
        ${
          isNe
            ? 'अत्यधिक संख्यामा उत्कृष्ट आवेदनहरू र हाम्रा साझेदार विद्यालयहरूमा विषयगत कोटा सीमित भएका कारण यस वर्षको कोहोर्टमा तपाईंको आवेदनलाई अगाडि बढाउन असमर्थ भएको जानकारी गराउँदछौं।'
            : 'Due to an extraordinarily competitive applicant pool and strictly bounded subject quotas for our partner schools, we are unable to advance your application into the final cohort this year.'
        }
      </p>
      <p style="line-height: 1.6; font-size: 14px;">
        ${
          isNe
            ? 'यस नतिजाले तपाईंको सम्भावना र योग्यतालाई कुनै कमी गर्दैन। हाम्रा धेरै सफल फेलोहरूले एकभन्दा बढी पटक आवेदन दिएका थिए। हामी तपाईंलाई आगामी <strong>२०२८ कोहोर्ट</strong> मा पुनः आवेदन दिन हार्दिक आमन्त्रण गर्दछौं।'
            : 'Please know that this decision in no way diminishes your potential. Many of our strongest fellows applied multiple times before their eventual fellowship. We warmly invite you to <strong>reapply for the 2028 Cohort</strong>.'
        }
      </p>
      <p style="line-height: 1.6; font-size: 14px;">
        ${
          isNe
            ? 'तपाईं आफ्नो आवेदक पोर्टलमा लगइन गरी यस छनोट प्रक्रियामा सहभागी भएको <strong>आधिकारिक सहभागिता पत्र (Certificate of Participation)</strong> अवलोकन तथा सुरक्षित गर्न सक्नुहुन्छ।'
            : 'You may log in to your applicant portal at any time to view and retain your <strong>Official Certificate of Participation</strong> acknowledging your milestone progression.'
        }
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
        साथी शिक्षक कार्यक्रम (STP) २०२७ छनोट समिति • काठमाडौं, नेपाल
      </p>
    </div>
  `;
}

/**
 * Rejects an individual application with structured reason, audit history, and respectful notification.
 * RBAC: ADMIN only.
 */
export async function adminRejectApplicationAction({
  applicationId,
  reasonCategory,
  feedbackNote,
  sendNotificationEmail = true,
}: {
  applicationId: string;
  reasonCategory: string;
  feedbackNote?: string;
  sendNotificationEmail?: boolean;
}): Promise<AdminActionState> {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized. Admin credentials required.' };
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { applicant: true },
    });

    if (!application) {
      return { success: false, message: 'Application not found.' };
    }

    const reasonMeta = REJECTION_REASON_MAP[reasonCategory] || REJECTION_REASON_MAP.OTHER;
    const currentData = typeof application.data === 'string'
      ? JSON.parse(application.data)
      : application.data || {};

    const updatedData = {
      ...currentData,
      rejectionDetails: {
        category: reasonCategory,
        categoryNameEn: reasonMeta.en,
        categoryNameNe: reasonMeta.ne,
        rejectedAt: new Date().toISOString(),
        rejectedBy: admin.name,
        stageAtRejection: application.stage,
        feedbackNote: feedbackNote || reasonMeta.defaultNote,
        canReapplyCohort: true,
      },
      // Clear pending hold/clarification
      holdDetails: null,
      clarificationRequest: null,
    };

    await prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: applicationId },
        data: {
          status: 'REJECTED',
          data: JSON.stringify(updatedData),
        },
      });

      await tx.stageHistory.create({
        data: {
          applicationId,
          fromStage: application.stage,
          toStage: application.stage,
          actorId: admin.id,
          note: `Application rejected (${reasonMeta.en})${feedbackNote ? `: ${feedbackNote}` : ''}`,
        },
      });

      await tx.notification.create({
        data: {
          userId: application.applicantId,
          title: 'Selection Outcome Update / छनोट परिणाम अद्यावधिक',
          body: `The selection process for STP 2027 (${application.refNo}) has concluded: ${reasonMeta.en}. We thank you sincerely for your participation and invite you to reapply for STP 2028.`,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          role: admin.role,
          action: 'REJECT_APPLICATION',
          entity: 'Application',
          entityId: applicationId,
          meta: JSON.stringify({
            refNo: application.refNo,
            stage: application.stage,
            reasonCategory,
            feedbackNote,
          }),
        },
      });
    });

    if (sendNotificationEmail && application.applicant.email) {
      const emailHtml = buildRejectionEmailHtml({
        applicantName: application.applicant.name,
        refNo: application.refNo,
        stageName: application.stage,
        reasonTitle: reasonMeta.en,
        feedbackNote: feedbackNote || reasonMeta.defaultNote,
        locale: application.applicant.locale,
      });

      sendEmail({
        to: application.applicant.email,
        subject: `Selection Process Update (${application.refNo}) - Saathi Teachers Programme 2027`,
        html: emailHtml,
      }).catch(console.error);
    }

    revalidatePath('/admin');
    revalidatePath('/admin/candidates');
    revalidatePath(`/admin/candidates/${applicationId}`);
    revalidatePath('/applicant');

    return { success: true, message: 'Application has been successfully marked as REJECTED with feedback logged.' };
  } catch (err) {
    console.error('Admin reject error:', err);
    return { success: false, message: 'Server error processing rejection.' };
  }
}

/**
 * Batch rejects multiple applications with structured reason and respectful communication.
 * RBAC: ADMIN only.
 */
export async function adminBatchRejectApplicationsAction({
  applicationIds,
  reasonCategory,
  feedbackNote,
  sendNotificationEmail = true,
}: {
  applicationIds: string[];
  reasonCategory: string;
  feedbackNote?: string;
  sendNotificationEmail?: boolean;
}): Promise<AdminActionState & { count?: number }> {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized. Admin credentials required.' };
    }

    if (!applicationIds || applicationIds.length === 0) {
      return { success: false, message: 'No applications selected for rejection.' };
    }

    const applications = await prisma.application.findMany({
      where: { id: { in: applicationIds } },
      include: { applicant: true },
    });

    if (applications.length === 0) {
      return { success: false, message: 'No matching applications found.' };
    }

    const reasonMeta = REJECTION_REASON_MAP[reasonCategory] || REJECTION_REASON_MAP.OTHER;

    for (const app of applications) {
      const currentData = typeof app.data === 'string' ? JSON.parse(app.data) : app.data || {};
      const updatedData = {
        ...currentData,
        rejectionDetails: {
          category: reasonCategory,
          categoryNameEn: reasonMeta.en,
          categoryNameNe: reasonMeta.ne,
          rejectedAt: new Date().toISOString(),
          rejectedBy: admin.name,
          stageAtRejection: app.stage,
          feedbackNote: feedbackNote || reasonMeta.defaultNote,
          canReapplyCohort: true,
        },
        holdDetails: null,
        clarificationRequest: null,
      };

      await prisma.$transaction(async (tx) => {
        await tx.application.update({
          where: { id: app.id },
          data: {
            status: 'REJECTED',
            data: JSON.stringify(updatedData),
          },
        });

        await tx.stageHistory.create({
          data: {
            applicationId: app.id,
            fromStage: app.stage,
            toStage: app.stage,
            actorId: admin.id,
            note: `Batch Rejected (${reasonMeta.en})${feedbackNote ? `: ${feedbackNote}` : ''}`,
          },
        });

        await tx.notification.create({
          data: {
            userId: app.applicantId,
            title: 'Selection Outcome Update / छनोट परिणाम अद्यावधिक',
            body: `The selection process for STP 2027 (${app.refNo}) has concluded: ${reasonMeta.en}. We thank you sincerely for your participation and invite you to reapply for STP 2028.`,
          },
        });
      });

      if (sendNotificationEmail && app.applicant.email) {
        const emailHtml = buildRejectionEmailHtml({
          applicantName: app.applicant.name,
          refNo: app.refNo,
          stageName: app.stage,
          reasonTitle: reasonMeta.en,
          feedbackNote: feedbackNote || reasonMeta.defaultNote,
          locale: app.applicant.locale,
        });

        sendEmail({
          to: app.applicant.email,
          subject: `Selection Process Update (${app.refNo}) - Saathi Teachers Programme 2027`,
          html: emailHtml,
        }).catch(console.error);
      }
    }

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        role: admin.role,
        action: 'BATCH_REJECT_APPLICATIONS',
        entity: 'Application',
        meta: JSON.stringify({
          count: applications.length,
          applicationIds,
          reasonCategory,
          feedbackNote,
        }),
      },
    });

    revalidatePath('/admin');
    revalidatePath('/admin/candidates');
    revalidatePath('/applicant');

    return {
      success: true,
      count: applications.length,
      message: `Successfully processed rejection for ${applications.length} candidate(s).`,
    };
  } catch (err) {
    console.error('Batch reject error:', err);
    return { success: false, message: 'Server error during batch rejection.' };
  }
}

/**
 * Places an individual application on hold with structured category and timeline.
 * RBAC: ADMIN only.
 */
export async function adminPlaceOnHoldAction({
  applicationId,
  holdCategory,
  reason,
  expectedResolutionDate,
}: {
  applicationId: string;
  holdCategory: string;
  reason?: string;
  expectedResolutionDate?: string;
}): Promise<AdminActionState> {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized. Admin credentials required.' };
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { applicant: true },
    });

    if (!application) {
      return { success: false, message: 'Application not found.' };
    }

    const categoryMeta = ON_HOLD_CATEGORY_MAP[holdCategory] || ON_HOLD_CATEGORY_MAP.GENERAL_HOLD;
    const currentData = typeof application.data === 'string'
      ? JSON.parse(application.data)
      : application.data || {};

    const updatedData = {
      ...currentData,
      holdDetails: {
        category: holdCategory,
        categoryNameEn: categoryMeta.en,
        categoryNameNe: categoryMeta.ne,
        placedAt: new Date().toISOString(),
        placedBy: admin.name,
        expectedResolutionDate: expectedResolutionDate || null,
        reason: reason || categoryMeta.desc,
      },
    };

    await prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: applicationId },
        data: {
          status: 'ON_HOLD',
          data: JSON.stringify(updatedData),
        },
      });

      await tx.stageHistory.create({
        data: {
          applicationId,
          fromStage: application.stage,
          toStage: application.stage,
          actorId: admin.id,
          note: `Placed on Hold (${categoryMeta.en})${reason ? `: ${reason}` : ''}`,
        },
      });

      await tx.notification.create({
        data: {
          userId: application.applicantId,
          title: 'Application Under Comparative Review / प्रतिक्षारत',
          body: `Your application (${application.refNo}) has been placed in comparative committee review for: ${categoryMeta.en}.`,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          role: admin.role,
          action: 'PLACE_APPLICATION_ON_HOLD',
          entity: 'Application',
          entityId: applicationId,
          meta: JSON.stringify({
            refNo: application.refNo,
            holdCategory,
            reason,
            expectedResolutionDate,
          }),
        },
      });
    });

    revalidatePath('/admin');
    revalidatePath('/admin/candidates');
    revalidatePath(`/admin/candidates/${applicationId}`);
    revalidatePath('/applicant');

    return { success: true, message: `Candidate placed ON_HOLD (${categoryMeta.en}).` };
  } catch (err) {
    console.error('Place on hold error:', err);
    return { success: false, message: 'Server error placing candidate on hold.' };
  }
}

/**
 * Batch places multiple applications on hold with structured category and timeline.
 * RBAC: ADMIN only.
 */
export async function adminBatchPlaceOnHoldAction({
  applicationIds,
  holdCategory,
  reason,
  expectedResolutionDate,
}: {
  applicationIds: string[];
  holdCategory: string;
  reason?: string;
  expectedResolutionDate?: string;
}): Promise<AdminActionState & { count?: number }> {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized. Admin credentials required.' };
    }

    if (!applicationIds || applicationIds.length === 0) {
      return { success: false, message: 'No applications selected.' };
    }

    const applications = await prisma.application.findMany({
      where: { id: { in: applicationIds } },
      include: { applicant: true },
    });

    if (applications.length === 0) {
      return { success: false, message: 'No matching applications found.' };
    }

    const categoryMeta = ON_HOLD_CATEGORY_MAP[holdCategory] || ON_HOLD_CATEGORY_MAP.GENERAL_HOLD;

    for (const app of applications) {
      const currentData = typeof app.data === 'string' ? JSON.parse(app.data) : app.data || {};
      const updatedData = {
        ...currentData,
        holdDetails: {
          category: holdCategory,
          categoryNameEn: categoryMeta.en,
          categoryNameNe: categoryMeta.ne,
          placedAt: new Date().toISOString(),
          placedBy: admin.name,
          expectedResolutionDate: expectedResolutionDate || null,
          reason: reason || categoryMeta.desc,
        },
      };

      await prisma.$transaction(async (tx) => {
        await tx.application.update({
          where: { id: app.id },
          data: {
            status: 'ON_HOLD',
            data: JSON.stringify(updatedData),
          },
        });

        await tx.stageHistory.create({
          data: {
            applicationId: app.id,
            fromStage: app.stage,
            toStage: app.stage,
            actorId: admin.id,
            note: `Batch Placed on Hold (${categoryMeta.en})${reason ? `: ${reason}` : ''}`,
          },
        });

        await tx.notification.create({
          data: {
            userId: app.applicantId,
            title: 'Application Under Comparative Review / प्रतिक्षारत',
            body: `Your application (${app.refNo}) is in comparative committee review for: ${categoryMeta.en}.`,
          },
        });
      });
    }

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        role: admin.role,
        action: 'BATCH_PLACE_ON_HOLD',
        entity: 'Application',
        meta: JSON.stringify({
          count: applications.length,
          applicationIds,
          holdCategory,
          reason,
        }),
      },
    });

    revalidatePath('/admin');
    revalidatePath('/admin/candidates');
    revalidatePath('/applicant');

    return {
      success: true,
      count: applications.length,
      message: `Successfully placed ${applications.length} candidate(s) in On-Hold queue.`,
    };
  } catch (err) {
    console.error('Batch place on hold error:', err);
    return { success: false, message: 'Server error placing batch on hold.' };
  }
}

/**
 * Reopens / reconsiders a rejected or on-hold application (e.g. upon successful appeal or quota adjustment).
 * RBAC: ADMIN only.
 */
export async function adminReopenApplicationAction({
  applicationId,
  targetStatus = 'UNDER_REVIEW',
  targetStageCode,
  reason,
}: {
  applicationId: string;
  targetStatus?: string;
  targetStageCode?: string;
  reason: string;
}): Promise<AdminActionState> {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized. Admin credentials required.' };
    }

    if (!reason || !reason.trim()) {
      return { success: false, message: 'Reconsideration rationale is required.' };
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { applicant: true },
    });

    if (!application) {
      return { success: false, message: 'Application not found.' };
    }

    const currentData = typeof application.data === 'string'
      ? JSON.parse(application.data)
      : application.data || {};

    const updatedData = {
      ...currentData,
      reopenedDetails: {
        reopenedAt: new Date().toISOString(),
        reopenedBy: admin.name,
        previousStatus: application.status,
        rationale: reason.trim(),
      },
      rejectionDetails: null, // Clear rejection lock
      holdDetails: null, // Clear hold lock
    };

    const newStage = targetStageCode || application.stage;

    await prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: applicationId },
        data: {
          status: targetStatus,
          stage: newStage,
          data: JSON.stringify(updatedData),
        },
      });

      await tx.stageHistory.create({
        data: {
          applicationId,
          fromStage: application.stage,
          toStage: newStage,
          actorId: admin.id,
          note: `Application Reconsidered & Restored to ${targetStatus}: ${reason}`,
        },
      });

      await tx.notification.create({
        data: {
          userId: application.applicantId,
          title: 'Application Re-entered Review / आवेदन पुनः समीक्षामा',
          body: `Good news! Your application (${application.refNo}) has been reconsidered by the Selection Committee and restored to: ${targetStatus}.`,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          role: admin.role,
          action: 'REOPEN_APPLICATION',
          entity: 'Application',
          entityId: applicationId,
          meta: JSON.stringify({
            refNo: application.refNo,
            previousStatus: application.status,
            targetStatus,
            newStage,
            reason,
          }),
        },
      });
    });

    revalidatePath('/admin');
    revalidatePath('/admin/candidates');
    revalidatePath(`/admin/candidates/${applicationId}`);
    revalidatePath('/applicant');

    return { success: true, message: `Application reconsidered and restored to ${targetStatus}.` };
  } catch (err) {
    console.error('Reopen application error:', err);
    return { success: false, message: 'Server error reopening application.' };
  }
}

function buildPhoneInterviewScheduleEmailHtml({
  applicantName,
  refNo,
  startDate,
  endDate,
  timeWindow,
  instructions,
  locale = 'en',
}: {
  applicantName: string;
  refNo: string;
  startDate: string;
  endDate: string;
  timeWindow: string;
  instructions?: string;
  locale?: string;
}) {
  const isNe = locale === 'ne';
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #065f46; margin: 0; font-size: 22px;">साथी शिक्षक कार्यक्रम २०२७</h2>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Saathi Teachers Programme 2027 • Selection Committee</p>
      </div>

      <p style="font-size: 15px;">${isNe ? 'आदरणीय' : 'Dear'} <strong>${applicantName}</strong>,</p>

      <p style="line-height: 1.6; font-size: 14px;">
        ${
          isNe
            ? `बधाई छ! तपाईंको आवेदन (दर्ता नं: <strong>${refNo}</strong>) साथी शिक्षक कार्यक्रम २०२७ को दोस्रो चरण <strong>टेलिफोन अन्तर्वार्ता (Phone Interview Stage)</strong> का लागि छनोट भएको छ।`
            : `Congratulations! Your application (Ref: <strong>${refNo}</strong>) has advanced to the second stage of our selection process: the <strong>Phone Interview Stage</strong>.`
        }
      </p>

      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <h3 style="color: #166534; margin: 0 0 12px 0; font-size: 16px;">
          📞 ${isNe ? 'टेलिफोन अन्तर्वार्ता समय तालिका' : 'Official Phone Call Schedule Window'}
        </h3>
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #1e293b;">
          <strong>${isNe ? 'सम्पर्क गरिने मिति:' : 'Calling Date Range:'}</strong> <span style="color: #065f46; font-weight: bold;">${startDate} — ${endDate}</span>
        </p>
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #1e293b;">
          <strong>${isNe ? 'सम्पर्क समय:' : 'Office Hours Window:'}</strong> ${timeWindow}
        </p>
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #1e293b;">
          <strong>${isNe ? 'समय अवधि:' : 'Duration:'}</strong> ${isNe ? 'करिब १५–२० मिनेट' : 'Approximately 15–20 minutes'}
        </p>
        ${
          instructions
            ? `<div style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed #bbf7d0; font-size: 13px; color: #15803d;">
                <strong>${isNe ? 'समितिको विशेष निर्देशन:' : 'Committee Instructions:'}</strong> ${instructions}
               </div>`
            : ''
        }
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0;">
        <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #334155;">
          💡 ${isNe ? 'अन्तर्वार्ता पूर्व तयारी सुझावहरू:' : 'Important Preparation Checklist:'}
        </h4>
        <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #475569; line-height: 1.6;">
          <li>${isNe ? 'तोकिएका मितिहरूमा कार्यालय समय (१०:०० देखि ५:००) भित्र आफ्नो फोन अन र साथमै राख्नुहोला।' : 'Ensure your registered mobile phone is switched on and kept with you during office hours on the scheduled dates.'}</li>
          <li>${isNe ? 'फोन आउँदा शान्त वातावरणमा बसेर कुरा गर्न सकिने अवस्था बनाउनुहोला।' : 'Please take the call in a quiet environment free from background noise and distractions.'}</li>
          <li>${isNe ? '२ वर्षे ग्रामीण शिक्षण प्रतिबद्धता, अध्यापन अभिरुचि र अनुकूलनताका विषयमा छलफलका लागि तयार रहनुहोला।' : 'Be prepared to discuss your motivation, rural adaptability, and 2-year fellowship commitment.'}</li>
        </ul>
      </div>

      <p style="line-height: 1.6; font-size: 14px;">
        ${
          isNe
            ? 'तपाईं आफ्नो आवेदक पोर्टलमा लगइन गरी यस तालिकाको सम्पूर्ण विवरण तथा अद्यावधिक अवस्था अवलोकन गर्न सक्नुहुन्छ।'
            : 'You can also log in to your applicant portal at any time to verify the schedule and view real-time stage updates.'
        }
      </p>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
        साथी शिक्षक कार्यक्रम (STP) २०२७ छनोट समिति • काठमाडौं, नेपाल
      </p>
    </div>
  `;
}

/**
 * Schedules a Phone Interview calling window for an individual candidate.
 * Stores schedule in application.data, sends in-app notification & bilingual email.
 * RBAC: ADMIN only.
 */
export async function adminSchedulePhoneInterviewAction({
  applicationId,
  startDate,
  endDate,
  timeWindow = '10:00 AM – 5:00 PM NPT (Office Hours / कार्यालय समय)',
  instructions,
  sendNotificationEmail = true,
}: {
  applicationId: string;
  startDate: string;
  endDate: string;
  timeWindow?: string;
  instructions?: string;
  sendNotificationEmail?: boolean;
}): Promise<AdminActionState> {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized. Admin credentials required.' };
    }

    if (!startDate || !endDate) {
      return { success: false, message: 'Please provide both start date and end date for calling window.' };
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { applicant: true },
    });

    if (!application) {
      return { success: false, message: 'Application not found.' };
    }

    const currentData = typeof application.data === 'string'
      ? JSON.parse(application.data)
      : application.data || {};

    const scheduleData: PhoneInterviewSchedule = {
      startDate,
      endDate,
      timeWindow: timeWindow || '10:00 AM – 5:00 PM NPT (Office Hours / कार्यालय समय)',
      timezone: 'NPT (Nepal Time)',
      instructions: instructions || 'Please ensure your phone is switched on and kept with you in a quiet area during office hours.',
      scheduledAt: new Date().toISOString(),
      scheduledBy: admin.name || admin.username || 'Admin Coordinator',
      callOutcome: currentData.phoneInterviewSchedule?.callOutcome || 'PENDING',
      callOutcomeNote: currentData.phoneInterviewSchedule?.callOutcomeNote,
      calledAt: currentData.phoneInterviewSchedule?.calledAt,
      calledBy: currentData.phoneInterviewSchedule?.calledBy,
      callDurationMinutes: currentData.phoneInterviewSchedule?.callDurationMinutes,
    };

    const updatedData = {
      ...currentData,
      phoneInterviewSchedule: scheduleData,
    };

    await prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: applicationId },
        data: {
          data: JSON.stringify(updatedData),
        },
      });

      await tx.stageHistory.create({
        data: {
          applicationId,
          fromStage: application.stage,
          toStage: application.stage,
          actorId: admin.id,
          note: `Phone Interview scheduled: ${startDate} to ${endDate} (${scheduleData.timeWindow})`,
        },
      });

      await tx.notification.create({
        data: {
          userId: application.applicantId,
          title: 'Phone Interview Call Scheduled / टेलिफोन अन्तर्वार्ता तालिका',
          body: `Your phone screening call will occur between ${startDate} and ${endDate} during office hours (${scheduleData.timeWindow}). Please check your portal for preparation tips.`,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          role: admin.role,
          action: 'SCHEDULE_PHONE_INTERVIEW',
          entity: 'Application',
          entityId: applicationId,
          meta: JSON.stringify({
            refNo: application.refNo,
            startDate,
            endDate,
            timeWindow: scheduleData.timeWindow,
          }),
        },
      });
    });

    if (sendNotificationEmail) {
      const emailSubject = application.applicant.locale === 'ne'
        ? `टेलिफोन अन्तर्वार्ता समय तालिका (${application.refNo}) - साथी शिक्षक कार्यक्रम २०२७`
        : `Important: Phone Interview Call Schedule (${application.refNo}) - STP 2027`;

      const emailHtml = buildPhoneInterviewScheduleEmailHtml({
        applicantName: application.applicant.name,
        refNo: application.refNo,
        startDate,
        endDate,
        timeWindow: scheduleData.timeWindow,
        instructions: scheduleData.instructions,
        locale: application.applicant.locale,
      });

      sendEmail({ to: application.applicant.email, subject: emailSubject, html: emailHtml }).catch(console.error);
    }

    revalidatePath('/admin');
    revalidatePath('/admin/candidates');
    revalidatePath(`/admin/candidates/${applicationId}`);
    revalidatePath('/applicant');
    revalidatePath('/review');
    revalidatePath(`/review/${applicationId}`);
    revalidatePath('/reviewer');
    revalidatePath(`/reviewer/${applicationId}`);

    return {
      success: true,
      message: `Phone interview calling window scheduled for ${startDate} – ${endDate}. Notification dispatched.`,
    };
  } catch (err) {
    console.error('Schedule phone interview error:', err);
    return { success: false, message: 'Server error scheduling phone interview.' };
  }
}

/**
 * Batch schedules Phone Interview calling window for multiple candidates in PHONE_INTERVIEW stage.
 * RBAC: ADMIN only.
 */
export async function adminBatchSchedulePhoneInterviewAction({
  applicationIds,
  startDate,
  endDate,
  timeWindow = '10:00 AM – 5:00 PM NPT (Office Hours / कार्यालय समय)',
  instructions,
  sendNotificationEmail = true,
}: {
  applicationIds: string[];
  startDate: string;
  endDate: string;
  timeWindow?: string;
  instructions?: string;
  sendNotificationEmail?: boolean;
}): Promise<AdminActionState & { count?: number }> {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized. Admin credentials required.' };
    }

    if (!applicationIds || applicationIds.length === 0) {
      return { success: false, message: 'No candidates selected.' };
    }

    if (!startDate || !endDate) {
      return { success: false, message: 'Please provide both start date and end date.' };
    }

    const applications = await prisma.application.findMany({
      where: { id: { in: applicationIds } },
      include: { applicant: true },
    });

    if (applications.length === 0) {
      return { success: false, message: 'No matching applications found.' };
    }

    const resolvedTimeWindow = timeWindow || '10:00 AM – 5:00 PM NPT (Office Hours / कार्यालय समय)';
    const resolvedInstructions = instructions || 'Please ensure your phone is switched on and kept with you in a quiet area during office hours.';

    for (const app of applications) {
      const currentData = typeof app.data === 'string' ? JSON.parse(app.data) : app.data || {};

      const scheduleData: PhoneInterviewSchedule = {
        startDate,
        endDate,
        timeWindow: resolvedTimeWindow,
        timezone: 'NPT (Nepal Time)',
        instructions: resolvedInstructions,
        scheduledAt: new Date().toISOString(),
        scheduledBy: admin.name || admin.username || 'Admin Coordinator',
        callOutcome: currentData.phoneInterviewSchedule?.callOutcome || 'PENDING',
        callOutcomeNote: currentData.phoneInterviewSchedule?.callOutcomeNote,
        calledAt: currentData.phoneInterviewSchedule?.calledAt,
        calledBy: currentData.phoneInterviewSchedule?.calledBy,
        callDurationMinutes: currentData.phoneInterviewSchedule?.callDurationMinutes,
      };

      const updatedData = {
        ...currentData,
        phoneInterviewSchedule: scheduleData,
      };

      await prisma.$transaction(async (tx) => {
        await tx.application.update({
          where: { id: app.id },
          data: { data: JSON.stringify(updatedData) },
        });

        await tx.stageHistory.create({
          data: {
            applicationId: app.id,
            fromStage: app.stage,
            toStage: app.stage,
            actorId: admin.id,
            note: `Batch Phone Interview scheduled: ${startDate} to ${endDate} (${resolvedTimeWindow})`,
          },
        });

        await tx.notification.create({
          data: {
            userId: app.applicantId,
            title: 'Phone Interview Call Scheduled / टेलिफोन अन्तर्वार्ता तालिका',
            body: `Your phone screening call will occur between ${startDate} and ${endDate} during office hours (${resolvedTimeWindow}). Please check your portal for preparation tips.`,
          },
        });
      });

      if (sendNotificationEmail) {
        const emailSubject = app.applicant.locale === 'ne'
          ? `टेलिफोन अन्तर्वार्ता समय तालिका (${app.refNo}) - साथी शिक्षक कार्यक्रम २०२७`
          : `Important: Phone Interview Call Schedule (${app.refNo}) - STP 2027`;

        const emailHtml = buildPhoneInterviewScheduleEmailHtml({
          applicantName: app.applicant.name,
          refNo: app.refNo,
          startDate,
          endDate,
          timeWindow: resolvedTimeWindow,
          instructions: resolvedInstructions,
          locale: app.applicant.locale,
        });

        sendEmail({ to: app.applicant.email, subject: emailSubject, html: emailHtml }).catch(console.error);
      }
    }

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        role: admin.role,
        action: 'BATCH_SCHEDULE_PHONE_INTERVIEW',
        entity: 'Application',
        entityId: 'multiple',
        meta: JSON.stringify({
          count: applications.length,
          startDate,
          endDate,
          timeWindow: resolvedTimeWindow,
        }),
      },
    });

    revalidatePath('/admin');
    revalidatePath('/admin/candidates');
    revalidatePath('/applicant');
    revalidatePath('/review');
    revalidatePath('/reviewer');

    return {
      success: true,
      count: applications.length,
      message: `Successfully scheduled phone interview calling window for ${applications.length} candidates.`,
    };
  } catch (err) {
    console.error('Batch schedule phone interview error:', err);
    return { success: false, message: 'Server error batch scheduling phone interviews.' };
  }
}

/**
 * Administrator directly updates or corrects candidate dossier particulars
 * (e.g., misspelled name, wrong contact number, degree, track, address, or ASC booking).
 * RBAC: ADMIN only.
 */
export async function adminUpdateCandidateDossierAction({
  applicationId,
  fullName,
  phone,
  teachingSubject,
  highestLevel,
  address,
  ascBookedDate,
  ascReportingTime,
  ascVenue,
  adminNote,
}: {
  applicationId: string;
  fullName?: string;
  phone?: string;
  teachingSubject?: string;
  highestLevel?: string;
  address?: string;
  ascBookedDate?: string;
  ascReportingTime?: string;
  ascVenue?: string;
  adminNote?: string;
}): Promise<AdminActionState> {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized: Admin credentials required.' };
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { applicant: true },
    });

    if (!application) {
      return { success: false, message: 'Application record not found.' };
    }

    const currentData =
      typeof application.data === 'string'
        ? JSON.parse(application.data)
        : application.data || {};

    const updatedData = { ...currentData };

    if (fullName && fullName.trim()) {
      updatedData.fullName = fullName.trim();
      await prisma.user.update({
        where: { id: application.applicantId },
        data: { name: fullName.trim() },
      });
    }

    if (phone !== undefined) {
      const cleanPhone = phone.trim();
      updatedData.contactNumber = cleanPhone;
      updatedData.phone = cleanPhone;
      updatedData.mobileNumber = cleanPhone;
    }

    if (teachingSubject && teachingSubject.trim()) {
      updatedData.teachingSubject = teachingSubject.trim();
      updatedData.subject = teachingSubject.trim();
    }

    if (highestLevel && highestLevel.trim()) {
      updatedData.highestLevel = highestLevel.trim();
      updatedData.highestDegree = highestLevel.trim();
    }

    if (address !== undefined) {
      updatedData.permanentMunicipality = address.trim();
      updatedData.address = address.trim();
    }

    if (ascBookedDate || ascReportingTime || ascVenue) {
      const existingBooking = updatedData.ascBooking || {};
      updatedData.ascBooking = {
        ...existingBooking,
        bookedDate: ascBookedDate || existingBooking.bookedDate,
        reportingTime: ascReportingTime || existingBooking.reportingTime,
        venue: ascVenue || existingBooking.venue,
        status: existingBooking.status || 'CONFIRMED',
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: applicationId },
        data: {
          data: JSON.stringify(updatedData),
        },
      });

      await tx.stageHistory.create({
        data: {
          applicationId,
          fromStage: application.stage,
          toStage: application.stage,
          actorId: admin.id,
          note: adminNote?.trim() || 'Candidate particulars / dossier data corrected by Administrator',
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          role: admin.role,
          action: 'ADMIN_UPDATE_CANDIDATE_DOSSIER',
          entity: 'Application',
          entityId: applicationId,
          meta: JSON.stringify({
            refNo: application.refNo,
            fullName,
            phone,
            teachingSubject,
            highestLevel,
            address,
            ascBookedDate,
            ascReportingTime,
            ascVenue,
          }),
        },
      });
    });

    revalidatePath('/admin');
    revalidatePath('/admin/candidates');
    revalidatePath(`/admin/candidates/${applicationId}`);
    revalidatePath('/admin/asc');
    revalidatePath('/applicant');

    return {
      success: true,
      message: 'Candidate dossier particulars updated successfully.',
    };
  } catch (err) {
    console.error('adminUpdateCandidateDossierAction error:', err);
    return { success: false, message: 'Server error updating candidate particulars.' };
  }
}

/**
 * Admin decides on a submitted evaluation:
 * - APPROVE: locks as approved
 * - RETURN: returns to reviewer with reason, unlocks for revision
 * - ADVANCE: moves candidate to next stage and dispatches candidate email
 */
export async function adminDecisionAction({
  reviewId,
  decision,
  returnReason,
  nextStageCode,
  note,
}: {
  reviewId: string;
  decision: 'APPROVE' | 'RETURN' | 'ADVANCE';
  returnReason?: string;
  nextStageCode?: string;
  note?: string;
}): Promise<AdminActionState> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized: Admin role required.' };
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        application: { include: { applicant: true } },
        reviewer: true,
      },
    });

    if (!review) {
      return { success: false, message: 'Review not found.' };
    }

    if (decision === 'RETURN') {
      if (!returnReason?.trim()) {
        return { success: false, message: 'A return reason is required.' };
      }

      await prisma.$transaction(async (tx) => {
        // Unlock review and mark as RETURNED
        await tx.review.update({
          where: { id: reviewId },
          data: {
            status: 'RETURNED',
            adminDecision: 'RETURNED',
            returnReason: returnReason.trim(),
            isLocked: false,
          },
        });

        // In-app notification to the reviewer
        await tx.notification.create({
          data: {
            userId: review.reviewerId,
            title: `Evaluation Returned - ${review.application.refNo}`,
            body: `Admin returned your evaluation for ${review.application.applicant.name} (${review.application.refNo}). Reason: ${returnReason.trim()}`,
          },
        });

        // Audit log
        await tx.auditLog.create({
          data: {
            actorId: user.id,
            role: user.role,
            action: 'RETURN_REVIEW',
            entity: 'Review',
            entityId: reviewId,
            meta: {
              reviewerId: review.reviewerId,
              applicationId: review.applicationId,
              returnReason: returnReason.trim(),
            },
          },
        });
      });

      revalidatePath('/review');
      revalidatePath(`/review/${review.applicationId}`);
      revalidatePath('/reviewer');
      revalidatePath(`/reviewer/${review.applicationId}`);
      revalidatePath('/admin/candidates');
      return { success: true, message: 'Review successfully returned to the reviewer.' };
    }

    if (decision === 'APPROVE') {
      await prisma.$transaction(async (tx) => {
        await tx.review.update({
          where: { id: reviewId },
          data: {
            status: 'APPROVED',
            adminDecision: 'APPROVED',
            returnReason: null,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: user.id,
            role: user.role,
            action: 'APPROVE_REVIEW',
            entity: 'Review',
            entityId: reviewId,
            meta: {
              reviewerId: review.reviewerId,
              applicationId: review.applicationId,
            },
          },
        });
      });

      revalidatePath('/review');
      revalidatePath(`/review/${review.applicationId}`);
      revalidatePath('/reviewer');
      revalidatePath(`/reviewer/${review.applicationId}`);
      revalidatePath('/admin/candidates');
      return { success: true, message: 'Review evaluation officially approved.' };
    }

    if (decision === 'ADVANCE') {
      if (!nextStageCode) {
        return { success: false, message: 'Next stage code is required to advance candidate.' };
      }

      await prisma.$transaction(async (tx) => {
        await tx.review.update({
          where: { id: reviewId },
          data: {
            status: 'APPROVED',
            adminDecision: 'APPROVED',
          },
        });
      });

      return await adminAdvanceStageAction({
        applicationId: review.applicationId,
        nextStageCode,
        note,
      });
    }

    return { success: false, message: 'Invalid decision option.' };
  } catch (err) {
    console.error('Admin decision error:', err);
    return { success: false, message: 'Failed to process admin decision.' };
  }
}

/**
 * Admin unlocks a locked evaluation submission with required reason.
 */
export async function adminUnlockReviewAction({
  reviewId,
  reason,
}: {
  reviewId: string;
  reason: string;
}): Promise<AdminActionState> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized: Admin role required to unlock evaluations.' };
    }

    if (!reason.trim()) {
      return { success: false, message: 'Reason for unlocking is required.' };
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { application: true },
    });

    if (!review) {
      return { success: false, message: 'Review not found.' };
    }

    await prisma.$transaction(async (tx) => {
      await tx.review.update({
        where: { id: reviewId },
        data: {
          isLocked: false,
          unlockedReason: reason.trim(),
          status: 'DRAFT',
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          role: user.role,
          action: 'UNLOCK_REVIEW',
          entity: 'Review',
          entityId: reviewId,
          meta: {
            applicationId: review.applicationId,
            refNo: review.application.refNo,
            reviewerId: review.reviewerId,
            reason: reason.trim(),
          },
        },
      });
    });

    revalidatePath('/review');
    revalidatePath(`/review/${review.applicationId}`);
    revalidatePath('/reviewer');
    revalidatePath(`/reviewer/${review.applicationId}`);
    revalidatePath('/admin/candidates');

    return { success: true, message: 'Evaluation successfully unlocked for reviewer.' };
  } catch (err) {
    console.error('Unlock review error:', err);
    return { success: false, message: 'Failed to unlock review.' };
  }
}
