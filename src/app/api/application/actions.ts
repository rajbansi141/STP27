'use server';

import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { getApplicationDeadlineStatus } from '@/lib/application/deadline';
import { generateAtomicReferenceNumber } from '@/lib/application/reference';
import { fullApplicationSchema } from '@/lib/validations/application';
import { sendEmail } from '@/lib/email/service';
import { getServerLocale } from '@/lib/i18n/server';
import { translations } from '@/lib/i18n/translations';
import { headers } from 'next/headers';

export interface ApplicationActionState {
  success?: boolean;
  message?: string;
  refNo?: string;
  errors?: Record<string, string[]>;
  savedAt?: string;
}

/**
 * Autosaves the applicant's application form draft.
 * Automatically triggered every ~15s and on step changes.
 */
export async function autosaveDraftAction(
  draftState: Record<string, unknown>,
  stepNumber: number
): Promise<ApplicationActionState> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'APPLICANT') {
      return { success: false, message: 'Unauthorized' };
    }

    const { cohortYear } = await getApplicationDeadlineStatus();

    // Check existing application
    const existing = await prisma.application.findFirst({
      where: { applicantId: user.id, year: cohortYear },
    });

    if (existing && existing.status !== 'DRAFT') {
      return {
        success: false,
        message: 'Application has already been submitted and is locked.',
      };
    }

    const draftData = {
      ...draftState,
      currentStep: stepNumber,
      lastSavedAt: new Date().toISOString(),
    };

    if (existing) {
      await prisma.application.update({
        where: { id: existing.id },
        data: {
          draftData: JSON.stringify(draftData),
        },
      });
    } else {
      // Create provisional draft application record
      const tempRefNo = `DRAFT-${user.id.slice(0, 8)}-${Date.now()}`;
      await prisma.application.create({
        data: {
          refNo: tempRefNo,
          applicantId: user.id,
          year: cohortYear,
          status: 'DRAFT',
          stage: 'APPLICATION',
          draftData: JSON.stringify(draftData),
        },
      });
    }

    return {
      success: true,
      savedAt: new Date().toLocaleTimeString(),
    };
  } catch (err) {
    console.error('Autosave error:', err);
    return { success: false, message: 'Autosave failed.' };
  }
}

/**
 * Submits the completed application form.
 * Server time is the sole authority for deadline enforcement.
 * Atomically generates Reference Number in format SA270001K7QM.
 */
export async function submitApplicationAction(
  formData: Record<string, unknown>
): Promise<ApplicationActionState> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'APPLICANT') {
      return { success: false, message: 'Unauthorized. Please sign in as an applicant.' };
    }

    // 1. Server-authoritative deadline check
    const deadlineStatus = await getApplicationDeadlineStatus();
    if (!deadlineStatus.isOpen) {
      return {
        success: false,
        message:
          'Applications closed. The deadline for Saathi Teachers Programme 2027 has passed.',
      };
    }

    // 2. Server-side Zod validation
    const validated = fullApplicationSchema.safeParse(formData);
    if (!validated.success) {
      return {
        success: false,
        errors: validated.error.flatten().fieldErrors,
        message: 'Please review and complete all required fields.',
      };
    }

    const { cohortYear } = deadlineStatus;

    // 3. One application per cycle check: ensure not already submitted
    const existing = await prisma.application.findFirst({
      where: { applicantId: user.id, year: cohortYear },
    });

    if (existing && existing.status !== 'DRAFT') {
      return {
        success: false,
        message: 'You have already submitted an application for this cycle. Only one submission is permitted.',
        refNo: existing.refNo,
      };
    }

    // 4. Atomic transaction: generate Reference Number, save application, record audit & history
    const result = await prisma.$transaction(async (tx) => {
      const { refNo, seq } = await generateAtomicReferenceNumber(tx, cohortYear);

      let app;
      if (existing) {
        app = await tx.application.update({
          where: { id: existing.id },
          data: {
            refNo,
            seq,
            status: 'SUBMITTED',
            stage: 'APPLICATION',
            submittedAt: new Date(),
            data: JSON.stringify(validated.data),
            draftData: undefined,
          },
        });
      } else {
        app = await tx.application.create({
          data: {
            refNo,
            seq,
            applicantId: user.id,
            year: cohortYear,
            status: 'SUBMITTED',
            stage: 'APPLICATION',
            submittedAt: new Date(),
            data: JSON.stringify(validated.data),
            draftData: undefined,
          },
        });
      }

      // Stage history tracking
      await tx.stageHistory.create({
        data: {
          applicationId: app.id,
          fromStage: 'DRAFT',
          toStage: 'APPLICATION',
          actorId: user.id,
          note: 'Application submitted by candidate.',
          at: new Date(),
        },
      });

      // 1. Notify applicant
      await tx.notification.create({
        data: {
          userId: user.id,
          title: `Application Submitted - ${refNo}`,
          body: `Your application for Saathi Teachers Programme 2027 has been successfully submitted and received. Reference: ${refNo}`,
        },
      });

      // 2. Notify all active administrators
      const activeAdmins = await tx.user.findMany({
        where: { role: 'ADMIN', isActive: true },
        select: { id: true },
      });
      for (const adm of activeAdmins) {
        await tx.notification.create({
          data: {
            userId: adm.id,
            title: `New Application Received - ${refNo}`,
            body: `Candidate ${user.name} (${user.email}) has submitted an application for Saathi Teachers Programme 2027.`,
          },
        });
      }

      return { app, refNo };
    });

    // 5. Send bilingual confirmation email
    const locale = await getServerLocale();
    const isNe = locale === 'ne';
    const emailSubject = isNe
      ? `आवेदन सफलतापूर्वक दर्ता भयो (दर्ता नं: ${result.refNo}) - साथी शिक्षक कार्यक्रम २०२७`
      : `Application Received (Ref: ${result.refNo}) - Saathi Teachers Programme 2027`;

    const emailHtml = isNe
      ? `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #166534;">साथी शिक्षक कार्यक्रम २०२७</h2>
          <p>आदरणीय <strong>${user.name}</strong>,</p>
          <p>तपाईंको आवेदन सफलतापूर्वक दर्ता भएको छ। भविष्यका सबै सञ्चारका लागि तपाईंको आधिकारिक दर्ता नम्बर सुरक्षित राख्नुहोस्:</p>
          <div style="background: #f0fdf4; border: 2px dashed #16a34a; font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; padding: 18px; margin: 20px 0; color: #166534;">
            ${result.refNo}
          </div>
          <p>छनोट समितिको प्रारम्भिक कागजात प्रमाणीकरणपछि तपाईंलाई अर्को चरणको जानकारी गराइनेछ।</p>
        </div>
      `
      : `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #166534;">Saathi Teachers Programme 2027</h2>
          <p>Dear <strong>${user.name}</strong>,</p>
          <p>Your application has been received successfully. Please retain your official Reference Number for all future correspondence:</p>
          <div style="background: #f0fdf4; border: 2px dashed #16a34a; font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; padding: 18px; margin: 20px 0; color: #166534;">
            ${result.refNo}
          </div>
          <p>Our Selection Committee will evaluate your submission during the initial screening round.</p>
        </div>
      `;

    await sendEmail({
      to: user.email,
      subject: emailSubject,
      html: emailHtml,
      templateCode: 'APPLICATION_SUBMITTED',
    });

    // 6. Security Audit Log
    try {
      const headerList = await headers();
      const ip = headerList.get('x-forwarded-for') || 'unknown';
      const userAgent = headerList.get('user-agent') || 'unknown';
      await prisma.auditLog.create({
        data: {
          action: 'APPLICATION_SUBMIT',
          entity: 'Application',
          entityId: result.app.id,
          actorId: user.id,
          role: user.role,
          meta: JSON.stringify({ refNo: result.refNo, year: cohortYear }),
          ip,
          userAgent,
        },
      });
    } catch {}

    return {
      success: true,
      refNo: result.refNo,
      message: 'Application submitted successfully!',
    };
  } catch (err) {
    console.error('Submission error:', err);
    return { success: false, message: 'Failed to submit application. Please try again.' };
  }
}
