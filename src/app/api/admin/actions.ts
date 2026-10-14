'use server';

import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/password';
import { sendEmail } from '@/lib/email/service';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

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
    return { success: true, message: 'Candidate successfully assigned to reviewer.' };
  } catch (err) {
    console.error('Assign reviewer error:', err);
    return { success: false, message: 'Server error allocating reviewer.' };
  }
}

/**
 * Admin directly transitions or promotes candidate to a destination stage.
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
    revalidatePath('/review');
    revalidatePath(`/review/${applicationId}`);

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
