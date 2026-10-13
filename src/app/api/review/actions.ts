'use server';

import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { z } from 'zod';
import { sendEmail } from '@/lib/email/service';
import { revalidatePath } from 'next/cache';

const reviewSubmissionSchema = z.object({
  applicationId: z.string().min(1, 'Application ID is required'),
  stage: z.string().optional(),
  academicScore: z.number().min(1).max(10),
  motivationScore: z.number().min(1).max(10),
  communicationScore: z.number().min(1).max(10),
  leadershipScore: z.number().min(1).max(10),
  comment: z.string().min(5, 'Please provide qualitative comments (min. 5 chars)'),
  recommendation: z.enum(['ADVANCE', 'HOLD', 'REJECT']),
  docChecks: z
    .object({
      citizenship: z.boolean().optional(),
      degree: z.boolean().optional(),
      slc: z.boolean().optional(),
    })
    .optional(),
});

export interface ReviewActionState {
  success?: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}

/**
 * Track reviewer viewing an application dossier
 */
export async function trackReviewerViewAction(applicationId: string): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) return;

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        role: user.role,
        action: 'VIEW_APPLICATION',
        entity: 'Application',
        entityId: applicationId,
        meta: { reviewer: user.username || user.email },
      },
    });
  } catch (err) {
    console.error('Failed to log review view:', err);
  }
}

/**
 * Submits and locks an official evaluation rubric for an application and stage.
 * Reviewers can evaluate across any stage. Once submitted, it is locked.
 */
export async function submitReviewAction(
  data: z.infer<typeof reviewSubmissionSchema>
): Promise<ReviewActionState> {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'REVIEWER' && user.role !== 'ADMIN')) {
      return { success: false, message: 'Unauthorized: Reviewer credentials required.' };
    }

    const validated = reviewSubmissionSchema.safeParse(data);
    if (!validated.success) {
      return {
        success: false,
        message: 'Invalid rubric submission.',
        errors: validated.error.flatten().fieldErrors,
      };
    }

    const {
      applicationId,
      stage,
      academicScore,
      motivationScore,
      communicationScore,
      leadershipScore,
      comment,
      recommendation,
      docChecks,
    } = validated.data;

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { applicant: true },
    });

    if (!application) {
      return { success: false, message: 'Application not found.' };
    }

    const targetStage = stage || application.stage;
    const totalScore = academicScore + motivationScore + communicationScore + leadershipScore;

    const scoresPayload = {
      academic: academicScore,
      motivation: motivationScore,
      communication: communicationScore,
      leadership: leadershipScore,
      docChecks: docChecks || {},
    };

    // Check if reviewer has existing review for this application and stage
    const existing = await prisma.review.findFirst({
      where: {
        applicationId,
        reviewerId: user.id,
        stage: targetStage,
      },
    });

    if (existing && existing.isLocked && user.role !== 'ADMIN') {
      return {
        success: false,
        message: 'This evaluation has already been submitted and locked. Contact an admin to unlock.',
      };
    }

    await prisma.$transaction(async (tx) => {
      let savedReviewId = existing?.id;

      if (existing) {
        const updated = await tx.review.update({
          where: { id: existing.id },
          data: {
            stage: targetStage,
            scores: JSON.stringify(scoresPayload),
            totalScore,
            comment,
            recommendation,
            status: 'SUBMITTED',
            isLocked: true,
            submittedAt: new Date(),
            unlockedReason: null,
            at: new Date(),
          },
        });
        savedReviewId = updated.id;
      } else {
        const created = await tx.review.create({
          data: {
            applicationId,
            reviewerId: user.id,
            stage: targetStage,
            scores: JSON.stringify(scoresPayload),
            totalScore,
            comment,
            recommendation,
            status: 'SUBMITTED',
            isLocked: true,
            submittedAt: new Date(),
          },
        });
        savedReviewId = created.id;
      }

      // Record in Audit Log
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          role: user.role,
          action: 'SUBMIT_REVIEW',
          entity: 'Review',
          entityId: savedReviewId,
          meta: {
            applicationId,
            refNo: application.refNo,
            stage: targetStage,
            totalScore,
            recommendation,
            isLocked: true,
          },
        },
      });
    });

    revalidatePath('/review');
    revalidatePath(`/review/${applicationId}`);
    revalidatePath('/reviewer');

    return {
      success: true,
      message: 'Evaluation successfully submitted and locked for admin review.',
    };
  } catch (err) {
    console.error('Submit review error:', err);
    return { success: false, message: 'Server error while saving evaluation.' };
  }
}

/**
 * Reviewer submits full evaluation batch to Admin.
 * Marks the batch as SUBMITTED and creates an in-app notification for Admins.
 */
export async function submitBatchToAdminAction(): Promise<ReviewActionState> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'REVIEWER') {
      return { success: false, message: 'Unauthorized: Only reviewers can submit evaluation batches.' };
    }

    // Fetch reviewer's active submitted reviews
    const myReviews = await prisma.review.findMany({
      where: { reviewerId: user.id },
      select: { id: true, applicationId: true },
    });

    if (myReviews.length === 0) {
      return { success: false, message: 'No evaluations have been completed yet to submit.' };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Create or update review batch
      const batch = await tx.reviewBatch.create({
        data: {
          reviewerId: user.id,
          status: 'SUBMITTED',
          submittedAt: new Date(),
        },
      });

      // 2. Link reviews to batch
      await tx.review.updateMany({
        where: { reviewerId: user.id },
        data: {
          batchId: batch.id,
          status: 'SUBMITTED',
          isLocked: true,
        },
      });

      // 3. Notify all Admins in-app
      const admins = await tx.user.findMany({
        where: { role: 'ADMIN', isActive: true },
        select: { id: true },
      });

      const reviewerName = user.username || user.name;
      for (const admin of admins) {
        await tx.notification.create({
          data: {
            userId: admin.id,
            title: 'Review Batch Submitted',
            body: `Reviewer @${reviewerName} has finalized and submitted ${myReviews.length} evaluations for admin review.`,
          },
        });
      }

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          role: user.role,
          action: 'SUBMIT_BATCH_TO_ADMIN',
          entity: 'ReviewBatch',
          entityId: batch.id,
          meta: {
            reviewer: reviewerName,
            reviewCount: myReviews.length,
          },
        },
      });
    });

    revalidatePath('/review');
    revalidatePath('/reviewer');
    revalidatePath('/admin/committee');
    revalidatePath('/admin/candidates');

    return {
      success: true,
      message: 'Batch successfully submitted to Admin coordinators.',
    };
  } catch (err) {
    console.error('Submit batch to admin error:', err);
    return { success: false, message: 'Failed to submit batch to admin.' };
  }
}

/**
 * Admin decides on a submitted review:
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
}): Promise<ReviewActionState> {
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
      revalidatePath('/admin/candidates');
      return { success: true, message: 'Review evaluation officially approved.' };
    }

    if (decision === 'ADVANCE') {
      if (!nextStageCode) {
        return { success: false, message: 'Next stage code is required to advance candidate.' };
      }

      // Approve review and advance candidate
      await prisma.$transaction(async (tx) => {
        await tx.review.update({
          where: { id: reviewId },
          data: {
            status: 'APPROVED',
            adminDecision: 'APPROVED',
          },
        });
      });

      return await advanceStageAction({
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
}): Promise<ReviewActionState> {
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

    return { success: true, message: 'Evaluation successfully unlocked for reviewer.' };
  } catch (err) {
    console.error('Unlock review error:', err);
    return { success: false, message: 'Failed to unlock review.' };
  }
}

/**
 * Promotes an application to a new selection stage.
 * Automatically appends StageHistory, sends bilingual candidate email, and audits.
 */
export async function advanceStageAction({
  applicationId,
  nextStageCode,
  note,
}: {
  applicationId: string;
  nextStageCode: string;
  note?: string;
}): Promise<ReviewActionState> {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'REVIEWER' && user.role !== 'ADMIN')) {
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
      // 1. Update application stage
      await tx.application.update({
        where: { id: applicationId },
        data: { stage: nextStageCode },
      });

      // 2. Record stage history
      await tx.stageHistory.create({
        data: {
          applicationId,
          fromStage,
          toStage: nextStageCode,
          actorId: user.id,
          note: note || `Promoted to ${nextStageCode} by ${user.name || user.username}`,
        },
      });

      // 3. Create candidate notification
      await tx.notification.create({
        data: {
          userId: application.applicantId,
          title: `Application Advanced - ${nextStageCode}`,
          body: `Your application (${application.refNo}) has progressed to stage: ${nextStageCode}.`,
        },
      });

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          role: user.role,
          action: 'ADVANCE_STAGE',
          entity: 'Application',
          entityId: applicationId,
          meta: {
            fromStage,
            toStage: nextStageCode,
            refNo: application.refNo,
          },
        },
      });
    });

    // 5. Dispatch notification email in applicant's preferred language
    const isNe = application.applicant.locale === 'ne';
    const emailSubject = isNe
      ? `छनोट चरण अपडेट (${application.refNo}) - साथी शिक्षक कार्यक्रम २०२७`
      : `Selection Stage Progression (Ref: ${application.refNo}) - Saathi Teachers Programme 2027`;

    const emailHtml = isNe
      ? `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #166534;">साथी शिक्षक कार्यक्रम २०२७</h2>
          <p>आदरणीय <strong>${application.applicant.name}</strong>,</p>
          <p>बधाई छ! तपाईंको आवेदन (दर्ता नं: <strong>${application.refNo}</strong>) प्रारम्भिक मूल्याङ्कनपछि नयाँ चरण <strong>${nextStageCode}</strong> मा सिफारिस गरिएको छ।</p>
          <p>छनोट समितिको टोलीले आगामी चरणको थप विवरण छिट्टै तपाईंको इमेलमा पठाउनेछ।</p>
        </div>
      `
      : `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #166534;">Saathi Teachers Programme 2027</h2>
          <p>Dear <strong>${application.applicant.name}</strong>,</p>
          <p>Congratulations! Your application (Ref: <strong>${application.refNo}</strong>) has advanced to the next selection stage: <strong>${nextStageCode}</strong>.</p>
          <p>Our Selection Committee will contact you with specific instructions regarding the upcoming assessment.</p>
        </div>
      `;

    await sendEmail({
      to: application.applicant.email,
      subject: emailSubject,
      html: emailHtml,
    });

    revalidatePath('/review');
    revalidatePath(`/review/${applicationId}`);

    return { success: true, message: 'Candidate successfully progressed to next stage.' };
  } catch (err) {
    console.error('Advance stage error:', err);
    return { success: false, message: 'Server error advancing stage.' };
  }
}
