'use server';

import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { z } from 'zod';
import { sendEmail } from '@/lib/email/service';
import { revalidatePath } from 'next/cache';
import {
  ON_HOLD_CATEGORY_MAP,
  REJECTION_REASON_MAP,
  PhoneInterviewSchedule,
  PHONE_CALL_OUTCOME_MAP,
} from '@/lib/constants/applicationReview';

const reviewSubmissionSchema = z.object({
  applicationId: z.string().min(1, 'Application ID is required'),
  stage: z.string().nullish().transform((v) => v || undefined),
  academicScore: z.coerce.number().min(0, 'Academic score must be at least 0').max(10, 'Academic score cannot exceed 10').default(0),
  motivationScore: z.coerce.number().min(0, 'Motivation score must be at least 0').max(10, 'Motivation score cannot exceed 10').default(0),
  communicationScore: z.coerce.number().min(0, 'Communication score must be at least 0').max(10, 'Communication score cannot exceed 10').default(0),
  leadershipScore: z.coerce.number().min(0, 'Leadership score must be at least 0').max(10, 'Leadership score cannot exceed 10').default(0),
  comment: z.string().nullish().transform((v) => v || ''),
  recommendation: z.enum(['ADVANCE', 'HOLD', 'REJECT']).default('ADVANCE'),
  holdCategory: z.string().nullish().transform((v) => v || undefined),
  rejectionCategory: z.string().nullish().transform((v) => v || undefined),
  docChecks: z
    .object({
      citizenship: z.boolean().optional(),
      degree: z.boolean().optional(),
      slc: z.boolean().optional(),
    })
    .nullish()
    .transform((v) => v || {}),
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
      const fieldErrors = validated.error.flatten().fieldErrors;
      const errorMsg = Object.entries(fieldErrors)
        .map(([k, v]) => `${k}: ${v?.join(', ')}`)
        .join('; ');
      return {
        success: false,
        message: errorMsg ? `Invalid rubric submission: ${errorMsg}` : 'Invalid rubric submission.',
        errors: fieldErrors,
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
      holdCategory,
      rejectionCategory,
      docChecks,
    } = validated.data;

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        applicant: true,
        assignments: true,
      },
    });

    if (!application) {
      return { success: false, message: 'Application not found.' };
    }

    // RBAC: Reviewer must be assigned to this application
    if (user.role === 'REVIEWER') {
      const isAssigned = application.assignments.some((a) => a.reviewerId === user.id);
      if (!isAssigned) {
        return {
          success: false,
          message: 'Access restricted: You are not assigned to evaluate this candidate.',
        };
      }
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

      // Workflow progression based on recommendation:
      // ADVANCE -> Moves candidate to next stage
      // HOLD -> Puts candidate ON_HOLD
      // REJECT -> Rejects candidate
      if (recommendation === 'ADVANCE') {
        const activeStages = await tx.stage.findMany({
          where: { isActive: true },
          orderBy: { order: 'asc' },
        });

        const currentIndex = activeStages.findIndex((s) => s.code === application.stage);
        if (currentIndex !== -1 && currentIndex < activeStages.length - 1) {
          const nextStage = activeStages[currentIndex + 1];

          await tx.application.update({
            where: { id: applicationId },
            data: {
              stage: nextStage.code,
              status: 'SHORTLISTED',
            },
          });

          await tx.stageHistory.create({
            data: {
              applicationId,
              fromStage: application.stage,
              toStage: nextStage.code,
              actorId: user.id,
              note: `Upgraded to ${nextStage.nameEn} following review evaluation (Score: ${totalScore}/40).`,
            },
          });

          await tx.notification.create({
            data: {
              userId: application.applicantId,
              title: `Application Advanced to ${nextStage.nameEn} / छनोट चरण स्तरोन्नति`,
              body: `Congratulations! Your application (${application.refNo}) has successfully advanced to: ${nextStage.nameEn}.`,
            },
          });

          // Bilingual Email
          const isNe = application.applicant.locale === 'ne';
          const emailSubject = isNe
            ? `बधाई छ! तपाईंको आवेदन नयाँ चरणमा सिफारिस भएको छ (${application.refNo}) - साथी शिक्षक कार्यक्रम २०२७`
            : `Congratulations! Application Advanced to ${nextStage.nameEn} (${application.refNo}) - STP 2027`;

          const emailHtml = isNe
            ? `
              <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="color: #166534;">साथी शिक्षक कार्यक्रम २०२७</h2>
                <p>आदरणीय <strong>${application.applicant.name}</strong>,</p>
                <p>बधाई छ! छनोट समितिद्वारा मूल्याङ्कन पश्चात् तपाईंको आवेदन (दर्ता नं: <strong>${application.refNo}</strong>) आगामी चरण <strong>${nextStage.nameNe} (${nextStage.nameEn})</strong> मा सिफारिस भएको छ।</p>
                <p>तपाईंको ड्यासबोर्डमा नयाँ चरणको विवरण र आगामी प्रक्रियाहरू अपडेट गरिएको छ। कृपया आफ्नो ड्यासबोर्ड नियमित रूपमा अवलोकन गर्नुहोस्।</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="font-size: 12px; color: #64748b;">साथी शिक्षक कार्यक्रम (STP) २०२७ छनोट समिति</p>
              </div>
            `
            : `
              <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="color: #166534;">Saathi Teachers Programme 2027</h2>
                <p>Dear <strong>${application.applicant.name}</strong>,</p>
                <p>Congratulations! Following review by the selection committee, your application (Ref: <strong>${application.refNo}</strong>) has successfully advanced to the next stage: <strong>${nextStage.nameEn}</strong>.</p>
                <p>Your applicant dashboard has been updated with information about this upcoming stage.</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="font-size: 12px; color: #64748b;">Saathi Teachers Programme (STP) 2027 Selection Committee</p>
              </div>
            `;
          sendEmail({ to: application.applicant.email, subject: emailSubject, html: emailHtml }).catch(console.error);
        } else {
          // Final stage reached
          await tx.application.update({
            where: { id: applicationId },
            data: { status: 'FINAL_SELECTED' },
          });

          await tx.notification.create({
            data: {
              userId: application.applicantId,
              title: 'Final Selection Confirmed / अन्तिम छनोट सम्पन्न',
              body: `Congratulations! Your placement for Saathi Teachers Programme 2027 has been finalized.`,
            },
          });
        }
      } else if (recommendation === 'HOLD') {
        const catKey = holdCategory || 'GENERAL_HOLD';
        const catMeta = ON_HOLD_CATEGORY_MAP[catKey] || ON_HOLD_CATEGORY_MAP.GENERAL_HOLD;
        const currentData = typeof application.data === 'string'
          ? JSON.parse(application.data)
          : application.data || {};

        const updatedData = {
          ...currentData,
          holdDetails: {
            category: catKey,
            categoryNameEn: catMeta.en,
            categoryNameNe: catMeta.ne,
            placedAt: new Date().toISOString(),
            placedBy: user.name || user.username || 'Reviewer',
            expectedResolutionDate: null,
            reason: comment || catMeta.desc,
          },
        };

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
            actorId: user.id,
            note: `Placed on Hold (${catMeta.en}) following evaluation (Score: ${totalScore}/40). ${comment ? `Notes: ${comment}` : ''}`,
          },
        });

        await tx.notification.create({
          data: {
            userId: application.applicantId,
            title: `Application Status: On Hold (${catMeta.en}) / आवेदन समिति छलफलमा`,
            body: `Your application (${application.refNo}) has been placed on temporary hold for committee deliberation (${catMeta.en}). Please review your applicant portal.`,
          },
        });
      } else if (recommendation === 'REJECT') {
        const reasonKey = rejectionCategory || 'SCORE_CUTOFF';
        const reasonMeta = REJECTION_REASON_MAP[reasonKey] || REJECTION_REASON_MAP.SCORE_CUTOFF;
        const currentData = typeof application.data === 'string'
          ? JSON.parse(application.data)
          : application.data || {};

        const updatedData = {
          ...currentData,
          rejectionDetails: {
            category: reasonKey,
            categoryNameEn: reasonMeta.en,
            categoryNameNe: reasonMeta.ne,
            rejectedAt: new Date().toISOString(),
            rejectedBy: user.name || user.username || 'Reviewer',
            stageAtRejection: targetStage,
            feedbackNote: comment || reasonMeta.defaultNote,
            canReapplyCohort: true,
          },
          holdDetails: null,
          clarificationRequest: null,
        };

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
            actorId: user.id,
            note: `Candidate selection concluded: ${reasonMeta.en} (Score: ${totalScore}/40). ${comment ? `Notes: ${comment}` : ''}`,
          },
        });

        await tx.notification.create({
          data: {
            userId: application.applicantId,
            title: 'Application Status Update / आवेदन स्थिति जानकारी',
            body: `Thank you for applying to STP 2027. Your application (${application.refNo}) has concluded for this cohort cycle. Please check your applicant portal for feedback and future pathways.`,
          },
        });

        const isNe = application.applicant.locale === 'ne';
        const emailSubject = isNe
          ? `आवेदन स्थिति जानकारी (${application.refNo}) - साथी शिक्षक कार्यक्रम २०२७`
          : `Application Status Update (${application.refNo}) - STP 2027`;

        const emailHtml = isNe
          ? `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #166534;">साथी शिक्षक कार्यक्रम २०२७</h2>
              <p>आदरणीय <strong>${application.applicant.name}</strong>,</p>
              <p>साथी शिक्षक कार्यक्रम २०२७ मा आवेदन दिनुभएकोमा हार्दिक धन्यवाद। यस पटकको प्रतिस्पर्धात्मक छनोट प्रक्रियामा तपाईंको आवेदन अर्को चरणका लागि सिफारिस हुन नसकेको जानकारी गराउन चाहन्छौं।</p>
              <p><strong>निर्णय सारांश:</strong> ${reasonMeta.ne}</p>
              ${comment ? `<p style="font-style: italic; background: #f8fafc; padding: 12px; border-radius: 8px;">"${comment}"</p>` : ''}
              <p>हामी तपाईंलाई आगामी <strong>२०२८ कोहोर्ट</strong> मा पुनः आवेदन दिन हार्दिक आमन्त्रण गर्दछौं। तपाईं आफ्नो आवेदक पोर्टलमा आधिकारिक सहभागिता पत्र (Certificate of Participation) अवलोकन गर्न सक्नुहुन्छ।</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="font-size: 12px; color: #64748b;">साथी शिक्षक कार्यक्रम (STP) २०२७ छनोट समिति</p>
            </div>
          `
          : `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #166534;">Saathi Teachers Programme 2027</h2>
              <p>Dear <strong>${application.applicant.name}</strong>,</p>
              <p>Thank you for your interest and application to the Saathi Teachers Programme 2027. Due to high competition, your application was not selected to advance further in this cycle.</p>
              <p><strong>Committee Summary:</strong> ${reasonMeta.en}</p>
              ${comment ? `<p style="font-style: italic; background: #f8fafc; padding: 12px; border-radius: 8px;">"${comment}"</p>` : ''}
              <p>We warmly encourage you to reapply for our <strong>2028 Cohort</strong>. You may also access your official Certificate of Participation directly from your applicant portal.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="font-size: 12px; color: #64748b;">Saathi Teachers Programme (STP) 2027 Selection Committee</p>
            </div>
          `;
        sendEmail({ to: application.applicant.email, subject: emailSubject, html: emailHtml }).catch(console.error);
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
            holdCategory: recommendation === 'HOLD' ? (holdCategory || 'GENERAL_HOLD') : undefined,
            rejectionCategory: recommendation === 'REJECT' ? (rejectionCategory || 'SCORE_CUTOFF') : undefined,
            isLocked: true,
          },
        },
      });
    });

    revalidatePath('/review');
    revalidatePath(`/review/${applicationId}`);
    revalidatePath('/reviewer');
    revalidatePath(`/reviewer/${applicationId}`);
    revalidatePath('/applicant');
    revalidatePath('/dashboard');
    revalidatePath('/admin/candidates');

    return {
      success: true,
      message: 'Evaluation submitted. Stage progression and notifications updated.',
    };
  } catch (err) {
    console.error('Submit review error:', err);
    return { success: false, message: 'Server error while saving evaluation.' };
  }
}

/**
 * Simple, direct authority to resolve an On-Hold application.
 * Directly Advances candidate to next stage or Rejects them.
 * No complicated deliberation, reasoning, or committee meeting bureaucracy required.
 */
export async function resolveHoldApplicationAction(
  applicationId: string,
  decision: 'ADVANCE' | 'REJECT',
  note?: string
): Promise<ReviewActionState> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized: Only administrators have authority to advance or reject on-hold applications.' };
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
      holdDetails: null,
      clarificationRequest: null,
    };

    if (decision === 'ADVANCE') {
      const activeStages = await prisma.stage.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
      });
      const currentIndex = activeStages.findIndex((s) => s.code === application.stage);
      const nextStage = currentIndex !== -1 && currentIndex < activeStages.length - 1
        ? activeStages[currentIndex + 1]
        : null;

      await prisma.$transaction(async (tx) => {
        await tx.application.update({
          where: { id: applicationId },
          data: {
            stage: nextStage ? nextStage.code : application.stage,
            status: 'SHORTLISTED',
            data: JSON.stringify(updatedData),
          },
        });

        await tx.stageHistory.create({
          data: {
            applicationId,
            fromStage: application.stage,
            toStage: nextStage ? nextStage.code : application.stage,
            actorId: user.id,
            note: `Advanced to ${nextStage ? nextStage.nameEn : 'next stage'} from On-Hold status.${note ? ` Note: ${note}` : ''}`,
          },
        });

        await tx.notification.create({
          data: {
            userId: application.applicantId,
            title: 'Application Advanced / छनोट चरण स्तरोन्नति',
            body: `Your application (${application.refNo}) has advanced to ${nextStage ? nextStage.nameEn : 'the next stage'}.`,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: user.id,
            role: user.role,
            action: 'RESOLVE_HOLD_ADVANCE',
            entity: 'Application',
            entityId: applicationId,
            meta: { refNo: application.refNo, nextStage: nextStage?.code, note },
          },
        });
      });

      revalidatePath('/review');
      revalidatePath(`/review/${applicationId}`);
      revalidatePath('/reviewer');
      revalidatePath(`/reviewer/${applicationId}`);
      revalidatePath('/admin/candidates');
      revalidatePath(`/admin/candidates/${applicationId}`);
      revalidatePath('/applicant');

      return {
        success: true,
        message: `Candidate successfully advanced to ${nextStage ? nextStage.nameEn : 'the next stage'}!`,
      };
    } else {
      // REJECT
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
            actorId: user.id,
            note: `Rejected from On-Hold status.${note ? ` Note: ${note}` : ''}`,
          },
        });

        await tx.notification.create({
          data: {
            userId: application.applicantId,
            title: 'Selection Outcome Update / छनोट परिणाम',
            body: `The selection process for STP 2027 (${application.refNo}) has concluded.`,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: user.id,
            role: user.role,
            action: 'RESOLVE_HOLD_REJECT',
            entity: 'Application',
            entityId: applicationId,
            meta: { refNo: application.refNo, note },
          },
        });
      });

      revalidatePath('/review');
      revalidatePath(`/review/${applicationId}`);
      revalidatePath('/reviewer');
      revalidatePath(`/reviewer/${applicationId}`);
      revalidatePath('/admin/candidates');
      revalidatePath(`/admin/candidates/${applicationId}`);
      revalidatePath('/applicant');

      return {
        success: true,
        message: 'Candidate marked as Rejected.',
      };
    }
  } catch (err) {
    console.error('Resolve hold error:', err);
    return { success: false, message: 'Server error while resolving application hold.' };
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

// Backward-compatible delegates to canonical admin actions module
import {
  adminDecisionAction as canonicalAdminDecisionAction,
  adminUnlockReviewAction as canonicalAdminUnlockReviewAction,
} from '@/app/api/admin/actions';

export async function adminDecisionAction(args: {
  reviewId: string;
  decision: 'APPROVE' | 'RETURN' | 'ADVANCE';
  returnReason?: string;
  nextStageCode?: string;
  note?: string;
}) {
  return canonicalAdminDecisionAction(args);
}

export async function adminUnlockReviewAction(args: {
  reviewId: string;
  reason: string;
}) {
  return canonicalAdminUnlockReviewAction(args);
}

/**
 * Advances an application to a new selection stage.
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
          note: note || `Advanced to ${nextStageCode} by ${user.name || user.username}`,
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
    revalidatePath('/reviewer');
    revalidatePath(`/reviewer/${applicationId}`);
    revalidatePath('/admin/candidates');
    revalidatePath(`/admin/candidates/${applicationId}`);

    return { success: true, message: 'Candidate successfully progressed to next stage.' };
  } catch (err) {
    console.error('Advance stage error:', err);
    return { success: false, message: 'Server error advancing stage.' };
  }
}

/**
 * Logs phone interview call outcome, notes, and duration by Reviewer or Admin.
 * Updates application.data.phoneInterviewSchedule, records stageHistory & notification.
 */
export async function logPhoneCallOutcomeAction({
  applicationId,
  outcome,
  callNotes,
  durationMinutes,
}: {
  applicationId: string;
  outcome:
    | 'PENDING'
    | 'COMPLETED'
    | 'UNREACHABLE_ATTEMPT_1'
    | 'UNREACHABLE_ATTEMPT_2'
    | 'UNREACHABLE_ATTEMPT_3'
    | 'RESCHEDULE_REQUESTED';
  callNotes?: string;
  durationMinutes?: number;
}): Promise<ReviewActionState> {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'REVIEWER' && user.role !== 'ADMIN')) {
      return { success: false, message: 'Unauthorized. Reviewer or Admin credentials required.' };
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { applicant: true },
    });

    if (!application) {
      return { success: false, message: 'Application not found.' };
    }

    const currentData =
      typeof application.data === 'string'
        ? JSON.parse(application.data)
        : application.data || {};

    const existingSchedule: PhoneInterviewSchedule = currentData.phoneInterviewSchedule || {
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      timeWindow: '10:00 AM – 5:00 PM NPT (Office Hours / कार्यालय समय)',
      scheduledAt: new Date().toISOString(),
      scheduledBy: 'System / Reviewer',
    };

    const updatedSchedule: PhoneInterviewSchedule = {
      ...existingSchedule,
      callOutcome: outcome,
      callOutcomeNote: callNotes || (outcome === 'PENDING' ? '' : existingSchedule.callOutcomeNote || ''),
      calledAt: outcome === 'PENDING' ? undefined : new Date().toISOString(),
      calledBy: outcome === 'PENDING' ? undefined : (user.name || user.username || 'Reviewer'),
      callDurationMinutes:
        outcome === 'PENDING' ? undefined : (durationMinutes !== undefined ? durationMinutes : existingSchedule.callDurationMinutes),
    };

    const updatedData = {
      ...currentData,
      phoneInterviewSchedule: updatedSchedule,
    };

    const outcomeMeta = PHONE_CALL_OUTCOME_MAP[outcome] || { en: outcome, ne: outcome };

    await prisma.$transaction(async (tx) => {
      // 1. Update application data
      await tx.application.update({
        where: { id: applicationId },
        data: {
          data: JSON.stringify(updatedData),
        },
      });

      // 2. Add stageHistory record
      await tx.stageHistory.create({
        data: {
          applicationId,
          fromStage: application.stage,
          toStage: application.stage,
          actorId: user.id,
          note: `Phone Interview Call: ${outcomeMeta.en} (${outcomeMeta.ne}). ${
            durationMinutes ? `Duration: ${durationMinutes} min. ` : ''
          }${callNotes ? `Notes: ${callNotes}` : ''}`,
        },
      });

      // 3. Send candidate in-app notification if unreachable or completed
      if (outcome === 'COMPLETED') {
        await tx.notification.create({
          data: {
            userId: application.applicantId,
            title: 'Phone Interview Call Completed / टेलिफोन अन्तर्वार्ता सम्पन्न',
            body: `Your phone screening interview has been conducted and logged. The selection committee is processing your evaluation.`,
          },
        });
      } else if (outcome.startsWith('UNREACHABLE')) {
        await tx.notification.create({
          data: {
            userId: application.applicantId,
            title: 'Phone Call Attempt Unreachable / फोन सम्पर्क हुन सकेन',
            body: `Our interview team attempted to contact you during office hours, but could not reach your phone. Please ensure your registered mobile number is switched on and within network coverage during office hours (10:00 AM – 5:00 PM).`,
          },
        });
      } else if (outcome === 'RESCHEDULE_REQUESTED') {
        await tx.notification.create({
          data: {
            userId: application.applicantId,
            title: 'Phone Interview Reschedule Noted / अन्तर्वार्ता समय परिवर्तन',
            body: `Your request to reschedule the phone call has been noted by the reviewer. You will be contacted again during office hours.`,
          },
        });
      }

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          role: user.role,
          action: 'LOG_PHONE_CALL_OUTCOME',
          entity: 'Application',
          entityId: applicationId,
          meta: JSON.stringify({
            refNo: application.refNo,
            outcome,
            durationMinutes,
            callNotes,
            reviewer: user.name || user.username,
          }),
        },
      });
    });

    revalidatePath('/review');
    revalidatePath(`/review/${applicationId}`);
    revalidatePath('/reviewer');
    revalidatePath(`/reviewer/${applicationId}`);
    revalidatePath('/admin/candidates');
    revalidatePath(`/admin/candidates/${applicationId}`);
    revalidatePath('/applicant');

    return {
      success: true,
      message: `Phone call status "${outcomeMeta.en}" successfully recorded.`,
    };
  } catch (err) {
    console.error('Log phone call outcome error:', err);
    return { success: false, message: 'Server error logging phone call outcome.' };
  }
}

/**
 * Direct decision action based on Phone Screening Call:
 * - ADVANCE_ASC: Advances candidate to Assessment Saathi Candidates (ASC) stage & updates status to SHORTLISTED
 * - REJECT: Rejects candidate with structured reason (e.g. UNREACHABLE_INTERVIEW or INTERVIEW_PERFORMANCE)
 * - HOLD: Places on hold for further deliberation
 */
export async function decidePhoneInterviewAction({
  applicationId,
  decision,
  reasonCategory,
  notes,
}: {
  applicationId: string;
  decision: 'ADVANCE_ASC' | 'REJECT' | 'HOLD';
  reasonCategory?: string;
  notes?: string;
}): Promise<ReviewActionState> {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'REVIEWER' && user.role !== 'ADMIN')) {
      return { success: false, message: 'Unauthorized. Reviewer or Admin credentials required.' };
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { applicant: true },
    });

    if (!application) {
      return { success: false, message: 'Application not found.' };
    }

    const currentData =
      typeof application.data === 'string'
        ? JSON.parse(application.data)
        : application.data || {};

    const isNe = application.applicant.locale === 'ne';

    if (decision === 'ADVANCE_ASC') {
      const updatedSchedule: PhoneInterviewSchedule = {
        ...(currentData.phoneInterviewSchedule || {
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          timeWindow: '10:00 AM – 5:00 PM NPT',
          scheduledAt: new Date().toISOString(),
          scheduledBy: user.name || 'Staff',
        }),
        callOutcome: 'COMPLETED',
        calledAt: currentData.phoneInterviewSchedule?.calledAt || new Date().toISOString(),
        calledBy: currentData.phoneInterviewSchedule?.calledBy || user.name || 'Reviewer',
        callOutcomeNote: notes || currentData.phoneInterviewSchedule?.callOutcomeNote || 'Interview completed. Recommended for Assessment Saathi Candidates (ASC).',
      };

      const updatedData = {
        ...currentData,
        phoneInterviewSchedule: updatedSchedule,
        holdDetails: null,
      };

      await prisma.$transaction(async (tx) => {
        await tx.application.update({
          where: { id: applicationId },
          data: {
            stage: 'ASC',
            status: 'SHORTLISTED',
            data: JSON.stringify(updatedData),
          },
        });

        await tx.stageHistory.create({
          data: {
            applicationId,
            fromStage: application.stage,
            toStage: 'ASC',
            actorId: user.id,
            note: `Phone Screening: Advanced to Assessment Saathi Candidates (ASC) by ${user.name || user.username}.${notes ? ` Note: ${notes}` : ''}`,
          },
        });

        await tx.notification.create({
          data: {
            userId: application.applicantId,
            title: isNe
              ? 'बधाई छ! तपाईं Assessment Saathi Candidates (ASC) चरणका लागि छनोट हुनुभयो'
              : 'Congratulations! Advanced to Assessment Saathi Candidates (ASC) Stage',
            body: isNe
              ? `तपाईंको फोन अन्तर्वार्ता सफलतापूर्वक सम्पन्न भई आवेदन (${application.refNo}) अर्को चरण 'Assessment Saathi Candidates (ASC)' का लागि छनोट भएको छ। विस्तृत विवरण छिट्टै पठाइनेछ।`
              : `Your phone screening interview was successful! Your application (${application.refNo}) has progressed to the Assessment Saathi Candidates (ASC) stage. Detailed instructions will follow shortly.`,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: user.id,
            role: user.role,
            action: 'PHONE_INTERVIEW_ADVANCE_ASC',
            entity: 'Application',
            entityId: applicationId,
            meta: JSON.stringify({
              refNo: application.refNo,
              fromStage: application.stage,
              toStage: 'ASC',
              notes,
            }),
          },
        });
      });

      // Send congratulations email
      const emailSubject = isNe
        ? `छनोट चरण अपडेट: Assessment Saathi Candidates (ASC) - साथी शिक्षक कार्यक्रम २०२७ (${application.refNo})`
        : `Progression Update: Assessment Saathi Candidates (ASC) - Saathi Teachers Programme 2027 (${application.refNo})`;

      const emailHtml = isNe
        ? `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff;">
            <h2 style="color: #166534; margin-top: 0;">साथी शिक्षक कार्यक्रम २०२७</h2>
            <p>आदरणीय <strong>${application.applicant.name}</strong>,</p>
            <p>हार्दिक बधाई छ! तपाईंको टेलिफोन अन्तर्वार्ताको आधारमा तपाईंको आवेदन (दर्ता नं: <strong>${application.refNo}</strong>) अर्को महत्वपूर्ण चरण <strong>Assessment Saathi Candidates (ASC)</strong> का लागि छनोट भएको छ।</p>
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0; color: #166534; font-weight: bold;">आगामी चरण: Assessment Saathi Candidates (ASC)</p>
              <p style="margin: 4px 0 0; font-size: 13px; color: #1e293b;">यस सम्बन्धी मिति, स्थान र कार्यतालिकाको पूर्ण विवरण छनोट समितिले छिट्टै इमेल तथा आवेदक पोर्टलमा उपलब्ध गराउनेछ।</p>
            </div>
            <p style="font-size: 13px; color: #64748b;">साथी शिक्षक कार्यक्रम (STP) २०२७ छनोट समिति</p>
          </div>
        `
        : `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff;">
            <h2 style="color: #166534; margin-top: 0;">Saathi Teachers Programme 2027</h2>
            <p>Dear <strong>${application.applicant.name}</strong>,</p>
            <p>Congratulations! Following your phone screening interview, your application (Ref: <strong>${application.refNo}</strong>) has advanced to the <strong>Assessment Saathi Candidates (ASC)</strong> stage.</p>
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0; color: #166534; font-weight: bold;">Next Stage: Assessment Saathi Candidates (ASC)</p>
              <p style="margin: 4px 0 0; font-size: 13px; color: #1e293b;">Detailed venue, schedules, and preparatory guidance will be sent to your email and accessible in your applicant portal.</p>
            </div>
            <p style="font-size: 13px; color: #64748b;">Selection Committee • Saathi Teachers Programme 2027</p>
          </div>
        `;

      sendEmail({
        to: application.applicant.email,
        subject: emailSubject,
        html: emailHtml,
      }).catch(console.error);

      revalidatePath('/review');
      revalidatePath(`/review/${applicationId}`);
      revalidatePath('/reviewer');
      revalidatePath(`/reviewer/${applicationId}`);
      revalidatePath('/admin/candidates');
      revalidatePath(`/admin/candidates/${applicationId}`);
      revalidatePath('/applicant');

      return {
        success: true,
        message: 'Candidate successfully advanced to Assessment Saathi Candidates (ASC)!',
      };
    } else if (decision === 'REJECT') {
      const reasonKey = reasonCategory || 'INTERVIEW_PERFORMANCE';
      const reasonMeta = REJECTION_REASON_MAP[reasonKey] || REJECTION_REASON_MAP.OTHER;

      const updatedData = {
        ...currentData,
        rejectionDetails: {
          category: reasonKey,
          categoryNameEn: reasonMeta.en,
          categoryNameNe: reasonMeta.ne,
          rejectedAt: new Date().toISOString(),
          rejectedBy: user.name || user.username || 'Reviewer/Admin',
          stageAtRejection: application.stage,
          feedbackNote: notes || reasonMeta.defaultNote,
          canReapplyCohort: true,
        },
        holdDetails: null,
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
            actorId: user.id,
            note: `Phone Screening Concluded / Rejected: ${reasonMeta.en}.${notes ? ` Note: ${notes}` : ''}`,
          },
        });

        await tx.notification.create({
          data: {
            userId: application.applicantId,
            title: isNe
              ? 'छनोट परिणाम अद्यावधिक / साथी शिक्षक कार्यक्रम २०२७'
              : 'Selection Outcome Update / Saathi Teachers Programme 2027',
            body: isNe
              ? `साथी शिक्षक कार्यक्रम २०२७ का लागि तपाईंको आवेदन (${application.refNo}) को छनोट प्रक्रिया हाललाई निष्कर्षमा पुगेको छ। सहभागिताका लागि धन्यवाद।`
              : `The selection process for STP 2027 (${application.refNo}) has concluded for this cycle. We thank you sincerely for your interest and participation.`,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: user.id,
            role: user.role,
            action: 'PHONE_INTERVIEW_REJECT',
            entity: 'Application',
            entityId: applicationId,
            meta: JSON.stringify({
              refNo: application.refNo,
              reasonCategory: reasonKey,
              notes,
            }),
          },
        });
      });

      revalidatePath('/review');
      revalidatePath(`/review/${applicationId}`);
      revalidatePath('/reviewer');
      revalidatePath(`/reviewer/${applicationId}`);
      revalidatePath('/admin/candidates');
      revalidatePath(`/admin/candidates/${applicationId}`);
      revalidatePath('/applicant');

      return {
        success: true,
        message: 'Candidate application marked as Rejected.',
      };
    } else if (decision === 'HOLD') {
      const holdKey = reasonCategory || 'BORDERLINE_SCORE';
      const holdMeta = ON_HOLD_CATEGORY_MAP[holdKey] || ON_HOLD_CATEGORY_MAP.GENERAL_HOLD;

      const updatedData = {
        ...currentData,
        holdDetails: {
          category: holdKey,
          categoryNameEn: holdMeta.en,
          categoryNameNe: holdMeta.ne,
          placedAt: new Date().toISOString(),
          placedBy: user.name || user.username || 'Reviewer/Admin',
          reason: notes || holdMeta.desc,
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
            actorId: user.id,
            note: `Phone Screening Placed on Hold: ${holdMeta.en}.${notes ? ` Note: ${notes}` : ''}`,
          },
        });

        await tx.notification.create({
          data: {
            userId: application.applicantId,
            title: isNe ? 'आवेदन प्रतिक्षारत / On Hold' : 'Application Under Deliberation / On Hold',
            body: isNe
              ? `तपाईंको आवेदन (${application.refNo}) टेलिफोन अन्तर्वार्तापछि समितिमा थप छलफलका लागि प्रतिक्षारत (On Hold) सूचीमा राखिएको छ।`
              : `Your application (${application.refNo}) is currently under committee deliberation following the phone interview.`,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: user.id,
            role: user.role,
            action: 'PHONE_INTERVIEW_HOLD',
            entity: 'Application',
            entityId: applicationId,
            meta: JSON.stringify({
              refNo: application.refNo,
              holdCategory: holdKey,
              notes,
            }),
          },
        });
      });

      revalidatePath('/review');
      revalidatePath(`/review/${applicationId}`);
      revalidatePath('/reviewer');
      revalidatePath(`/reviewer/${applicationId}`);
      revalidatePath('/admin/candidates');
      revalidatePath(`/admin/candidates/${applicationId}`);
      revalidatePath('/applicant');

      return {
        success: true,
        message: 'Candidate placed in On-Hold queue for further deliberation.',
      };
    }

    return { success: false, message: 'Invalid decision specified.' };
  } catch (err) {
    console.error('Decide phone interview error:', err);
    return { success: false, message: 'Server error processing interview decision.' };
  }
}

