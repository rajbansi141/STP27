'use server';

import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';
import { sendEmail } from '@/lib/email/service';
import {
  AscSessionConfig,
  AscBooking,
  AscDateSlot,
  REJECTION_REASON_MAP,
  ON_HOLD_CATEGORY_MAP,
} from '@/lib/constants/applicationReview';
import { getStoredAscConfig, saveStoredAscConfig } from '@/lib/constants/ascConfigStorage';

export interface AscActionState {
  success: boolean;
  message: string;
  config?: AscSessionConfig;
  slots?: AscDateSlot[];
  booking?: AscBooking;
}

const NEP_DAYS: Record<string, string> = {
  Sunday: 'आइतबार',
  Monday: 'सोमबार',
  Tuesday: 'मङ्गलबार',
  Wednesday: 'बुधबार',
  Thursday: 'बिहीबार',
  Friday: 'शुक्रबार',
  Saturday: 'शनिबार',
};

/**
 * Generates an array of ISO date strings (YYYY-MM-DD) between start and end inclusive.
 */
function getDateRange(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  const curr = new Date(startStr);
  const end = new Date(endStr);

  while (curr <= end) {
    dates.push(curr.toISOString().split('T')[0]);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

/**
 * Retrieves the current ASC session config and live slot seat availability for each date.
 */
export async function getAscSlotAvailabilityAction(): Promise<{
  success: boolean;
  config: AscSessionConfig;
  slots: AscDateSlot[];
}> {
  const config = await getStoredAscConfig();
  const dateRange = getDateRange(config.startDate, config.endDate);

  // Fetch all applications in ASC stage or with ascBooking to count existing bookings
  const applications = await prisma.application.findMany({
    select: {
      id: true,
      data: true,
      status: true,
      stage: true,
    },
  });

  // Calculate booked counts per date
  const countsPerDate: Record<string, number> = {};
  dateRange.forEach((d) => {
    countsPerDate[d] = 0;
  });

  applications.forEach((app) => {
    if (app.status === 'REJECTED') return; // Exclude rejected candidates from holding seats
    const parsedData =
      typeof app.data === 'string' ? JSON.parse(app.data) : app.data || {};
    const booking = parsedData.ascBooking as AscBooking | undefined;
    if (booking?.bookedDate && countsPerDate[booking.bookedDate] !== undefined) {
      countsPerDate[booking.bookedDate] += 1;
    }
  });

  const slots: AscDateSlot[] = dateRange.map((dateStr) => {
    const d = new Date(dateStr);
    const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'long' });
    const dayNameNe = NEP_DAYS[dayOfWeek] || dayOfWeek;
    const totalQuota = config.dailyQuota || 20;
    const bookedCount = countsPerDate[dateStr] || 0;
    const remainingSeats = Math.max(0, totalQuota - bookedCount);
    const isFull = remainingSeats <= 0;

    return {
      date: dateStr,
      dayOfWeek,
      dayNameNe,
      totalQuota,
      bookedCount,
      remainingSeats,
      isFull,
    };
  });

  return {
    success: true,
    config,
    slots,
  };
}

/**
 * Updates the global ASC Session Configuration (Date Range, Daily Capacity Quota, Venue).
 * RBAC: ADMIN only.
 */
export async function updateAscSessionConfigAction({
  startDate,
  endDate,
  dailyQuota,
  venue,
  reportingTime = '08:30 AM NPT',
  instructions,
}: {
  startDate: string;
  endDate: string;
  dailyQuota: number;
  venue: string;
  reportingTime?: string;
  instructions?: string;
}): Promise<AscActionState> {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized. Admin credentials required.' };
    }

    if (!startDate || !endDate) {
      return { success: false, message: 'Both start date and end date are required.' };
    }

    if (new Date(startDate) > new Date(endDate)) {
      return { success: false, message: 'Start date cannot be after end date.' };
    }

    if (!dailyQuota || dailyQuota < 1) {
      return { success: false, message: 'Daily quota must be at least 1 candidate per day.' };
    }

    if (!venue || !venue.trim()) {
      return { success: false, message: 'Assessment venue address is required.' };
    }

    const currentConfig = await getStoredAscConfig();
    const updatedConfig: AscSessionConfig = {
      ...currentConfig,
      startDate,
      endDate,
      dailyQuota: Number(dailyQuota),
      venue: venue.trim(),
      reportingTime: reportingTime.trim(),
      instructions: instructions?.trim() || currentConfig.instructions,
      isActive: true,
      updatedAt: new Date().toISOString(),
      updatedBy: admin.name || admin.username || 'Admin',
    };

    const saved = await saveStoredAscConfig(updatedConfig);
    if (!saved) {
      return { success: false, message: 'Failed to write ASC configuration to storage.' };
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        role: admin.role,
        action: 'UPDATE_ASC_CONFIG',
        entity: 'SystemSetting',
        meta: JSON.stringify(updatedConfig),
      },
    });

    revalidatePath('/admin');
    revalidatePath('/admin/asc');
    revalidatePath('/admin/candidates');
    revalidatePath('/applicant');
    revalidatePath('/review');

    return {
      success: true,
      message: 'Assessment Saathi Candidates (ASC) session schedule & quota updated.',
      config: updatedConfig,
    };
  } catch (err) {
    console.error('Update ASC config error:', err);
    return { success: false, message: 'Server error updating ASC schedule configuration.' };
  }
}

/**
 * Candidate or Admin books an ASC date slot with strict seat capacity enforcement.
 */
export async function bookAscSlotAction({
  applicationId,
  chosenDate,
}: {
  applicationId: string;
  chosenDate: string;
}): Promise<AscActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Please sign in to book your assessment slot.' };
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { applicant: true },
    });

    if (!application) {
      return { success: false, message: 'Application not found.' };
    }

    // Check authorization: must be applicant herself or staff
    if (user.role === 'APPLICANT' && application.applicantId !== user.id) {
      return { success: false, message: 'Access denied: You cannot book slots for other applicants.' };
    }

    const config = await getStoredAscConfig();

    // Verify chosen date is within range
    if (chosenDate < config.startDate || chosenDate > config.endDate) {
      return {
        success: false,
        message: `Chosen date (${chosenDate}) is outside the active assessment window (${config.startDate} to ${config.endDate}).`,
      };
    }

    // Check current bookings on chosenDate to ensure quota is not exceeded
    const allApps = await prisma.application.findMany({
      where: {
        id: { not: applicationId },
        status: { not: 'REJECTED' },
      },
      select: { data: true },
    });

    let currentBooked = 0;
    allApps.forEach((a) => {
      const parsed = typeof a.data === 'string' ? JSON.parse(a.data) : a.data || {};
      if (parsed.ascBooking?.bookedDate === chosenDate) {
        currentBooked++;
      }
    });

    if (currentBooked >= config.dailyQuota) {
      return {
        success: false,
        message: `The quota for ${chosenDate} is full (${currentBooked}/${config.dailyQuota} seats filled). Please choose another date.`,
      };
    }

    const currentData =
      typeof application.data === 'string'
        ? JSON.parse(application.data)
        : application.data || {};

    const newBooking: AscBooking = {
      bookedDate: chosenDate,
      bookedAt: new Date().toISOString(),
      venue: config.venue,
      reportingTime: config.reportingTime,
      status: 'CONFIRMED',
    };

    const updatedData = {
      ...currentData,
      ascBooking: newBooking,
    };

    const isNe = application.applicant.locale === 'ne';

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
          actorId: user.id,
          note: `Assessment Saathi Candidates (ASC) slot confirmed for ${chosenDate} at ${config.venue}.`,
        },
      });

      await tx.notification.create({
        data: {
          userId: application.applicantId,
          title: isNe
            ? 'ASC मूल्याङ्कन मिति निश्चित भयो (Seat Confirmed)'
            : 'ASC Assessment Slot Confirmed & Admit Pass Ready',
          body: isNe
            ? `तपाईंको Assessment Saathi Candidates (ASC) मूल्याङ्कन मिति ${chosenDate} (${config.reportingTime}) का लागि निश्चित भएको छ। स्थान: ${config.venue}। कृपया आफ्नो प्रवेशपत्र (Admit Pass) डाउनलोड गर्नुहोस्।`
            : `Your Assessment Saathi Candidates (ASC) slot is confirmed for ${chosenDate} at ${config.venue} (${config.reportingTime}). You can now download your official Admit Pass.`,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          role: user.role,
          action: 'BOOK_ASC_SLOT',
          entity: 'Application',
          entityId: applicationId,
          meta: JSON.stringify({
            refNo: application.refNo,
            chosenDate,
            bookedBy: user.name,
          }),
        },
      });
    });

    // Send confirmation email with Admit Pass details
    const emailSubject = isNe
      ? `ASC मूल्याङ्कन मिति निश्चित भयो (${application.refNo}) - साथी शिक्षक कार्यक्रम २०२७`
      : `ASC Assessment Slot Confirmation (Ref: ${application.refNo}) - Saathi Teachers Programme 2027`;

    const emailHtml = isNe
      ? `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff;">
          <h2 style="color: #166534; margin-top: 0;">साथी शिक्षक कार्यक्रम २०२७</h2>
          <p>आदरणीय <strong>${application.applicant.name}</strong>,</p>
          <p>तपाईंको <strong>Assessment Saathi Candidates (ASC)</strong> मूल्याङ्कनको सिट सफलतापूर्वक बुक भएको छ।</p>
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 6px 0;"><strong>निश्चित मिति:</strong> ${chosenDate}</p>
            <p style="margin: 0 0 6px 0;"><strong>उपस्थिति समय:</strong> ${config.reportingTime}</p>
            <p style="margin: 0 0 6px 0;"><strong>स्थान:</strong> ${config.venue}</p>
            <p style="margin: 0;"><strong>दर्ता नं:</strong> ${application.refNo}</p>
          </div>
          <p>कृपया आफ्नो आवेदक पोर्टलमा लगइन गरी <strong>आधिकारिक प्रवेशपत्र (Admit Pass PDF)</strong> डाउनलोड गरी साथमै लिएर आउनुहोला।</p>
          <p style="font-size: 13px; color: #64748b;">छनोट समिति • साथी शिक्षक कार्यक्रम २०२७</p>
        </div>
      `
      : `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff;">
          <h2 style="color: #166534; margin-top: 0;">Saathi Teachers Programme 2027</h2>
          <p>Dear <strong>${application.applicant.name}</strong>,</p>
          <p>Your assessment slot for <strong>Assessment Saathi Candidates (ASC)</strong> has been successfully booked and confirmed.</p>
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 6px 0;"><strong>Confirmed Date:</strong> ${chosenDate}</p>
            <p style="margin: 0 0 6px 0;"><strong>Reporting Time:</strong> ${config.reportingTime}</p>
            <p style="margin: 0 0 6px 0;"><strong>Venue / Location:</strong> ${config.venue}</p>
            <p style="margin: 0;"><strong>Reference No:</strong> ${application.refNo}</p>
          </div>
          <p>Please log in to your applicant portal to download your official <strong>Admit Pass (PDF)</strong> and review the mandatory checklist.</p>
          <p style="font-size: 13px; color: #64748b;">Selection Committee • Saathi Teachers Programme 2027</p>
        </div>
      `;

    sendEmail({
      to: application.applicant.email,
      subject: emailSubject,
      html: emailHtml,
    }).catch(console.error);

    revalidatePath('/applicant');
    revalidatePath('/admin');
    revalidatePath('/admin/asc');
    revalidatePath('/admin/candidates');
    revalidatePath(`/admin/candidates/${applicationId}`);
    revalidatePath('/review');
    revalidatePath(`/review/${applicationId}`);

    return {
      success: true,
      message: isNe
        ? 'तपाईंको ASC मूल्याङ्कन मिति सफलतापूर्वक बुक भयो! प्रवेशपत्र डाउनलोड गर्न सक्नुहुन्छ।'
        : 'Your ASC assessment slot is confirmed! You can now download your official Admit Pass.',
      booking: newBooking,
    };
  } catch (err) {
    console.error('Book ASC slot error:', err);
    return { success: false, message: 'Server error booking assessment slot.' };
  }
}

/**
 * Direct candidate decision for ASC stage:
 * - ADVANCE_PARENTS_MEET: Advances candidate to PARENTS_MEET stage (Parents’ Meet Event)
 * - REJECT: Rejects candidate with structured feedback
 * - HOLD: Places candidate in ON_HOLD status for committee deliberation
 */
export async function decideAscCandidateAction({
  applicationId,
  decision,
  reasonCategory,
  notes,
}: {
  applicationId: string;
  decision: 'ADVANCE_PARENTS_MEET' | 'REJECT' | 'HOLD';
  reasonCategory?: string;
  notes?: string;
}): Promise<AscActionState> {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'REVIEWER' && user.role !== 'ADMIN')) {
      return { success: false, message: 'Unauthorized. Staff credentials required.' };
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

    if (decision === 'ADVANCE_PARENTS_MEET') {
      const updatedBooking: AscBooking = {
        ...(currentData.ascBooking || {
          bookedDate: new Date().toISOString().split('T')[0],
          bookedAt: new Date().toISOString(),
          venue: 'Saathi Central Assessment Center',
          reportingTime: '08:30 AM NPT',
          status: 'ATTENDED',
        }),
        status: 'ATTENDED',
        evaluatedBy: user.name || user.username || 'Reviewer',
        evaluatedAt: new Date().toISOString(),
      };

      const updatedData = {
        ...currentData,
        ascBooking: updatedBooking,
        holdDetails: null,
      };

      await prisma.$transaction(async (tx) => {
        await tx.application.update({
          where: { id: applicationId },
          data: {
            stage: 'PARENTS_MEET',
            status: 'SHORTLISTED',
            data: JSON.stringify(updatedData),
          },
        });

        await tx.stageHistory.create({
          data: {
            applicationId,
            fromStage: application.stage,
            toStage: 'PARENTS_MEET',
            actorId: user.id,
            note: `ASC Evaluation Complete: Advanced to Parents’ Meet Event (PARENTS_MEET) by ${user.name || user.username}.${notes ? ` Remarks: ${notes}` : ''}`,
          },
        });

        await tx.notification.create({
          data: {
            userId: application.applicantId,
            title: isNe
              ? 'बधाई छ! तपाईं अभिभावक भेटघाट (Parents’ Meet) का लागि छनोट हुनुभयो'
              : 'Congratulations! Selected for Parents’ Meet Event',
            body: isNe
              ? `तपाईंको Assessment Saathi Candidates (ASC) मूल्याङ्कनको आधारमा आवेदन (${application.refNo}) आगामी चरण 'अभिभावक भेटघाट कार्यक्रम (Parents’ Meet Event)' का लागि छनोट भएको छ। विस्तृत जानकारी छिट्टै उपलब्ध हुनेछ।`
              : `Following your performance in the Assessment Saathi Candidates (ASC) session, your application (${application.refNo}) has advanced to the Parents’ Meet Event stage. Detailed information will be provided shortly.`,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: user.id,
            role: user.role,
            action: 'ASC_ADVANCE_PARENTS_MEET',
            entity: 'Application',
            entityId: applicationId,
            meta: JSON.stringify({
              refNo: application.refNo,
              fromStage: application.stage,
              toStage: 'PARENTS_MEET',
              notes,
            }),
          },
        });
      });

      // Send congratulations email
      const emailSubject = isNe
        ? `छनोट चरण अपडेट: Parents’ Meet Event - साथी शिक्षक कार्यक्रम २०२७ (${application.refNo})`
        : `Progression Update: Parents’ Meet Event - Saathi Teachers Programme 2027 (${application.refNo})`;

      const emailHtml = isNe
        ? `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff;">
            <h2 style="color: #166534; margin-top: 0;">साथी शिक्षक कार्यक्रम २०२७</h2>
            <p>आदरणीय <strong>${application.applicant.name}</strong>,</p>
            <p>हार्दिक बधाई छ! <strong>Assessment Saathi Candidates (ASC)</strong> मूल्याङ्कनमा तपाईंको उत्कृष्ट सहभागितापछि तपाईंको आवेदन (दर्ता नं: <strong>${application.refNo}</strong>) अर्को चरण <strong>अभिभावक भेटघाट कार्यक्रम (Parents’ Meet Event)</strong> का लागि छनोट भएको छ।</p>
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0; color: #166534; font-weight: bold;">आगामी चरण: अभिभावक भेटघाट (Parents’ Meet Event)</p>
              <p style="margin: 4px 0 0; font-size: 13px; color: #1e293b;">यस सम्बन्धी पूर्ण कार्यतालिका तथा आमन्त्रण पत्र छनोट समितिले छिट्टै उपलब्ध गराउनेछ।</p>
            </div>
            <p style="font-size: 13px; color: #64748b;">साथी शिक्षक कार्यक्रम (STP) २०२७ छनोट समिति</p>
          </div>
        `
        : `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff;">
            <h2 style="color: #166534; margin-top: 0;">Saathi Teachers Programme 2027</h2>
            <p>Dear <strong>${application.applicant.name}</strong>,</p>
            <p>Congratulations! Following your evaluation in the <strong>Assessment Saathi Candidates (ASC)</strong> session, your application (Ref: <strong>${application.refNo}</strong>) has successfully advanced to the <strong>Parents’ Meet Event</strong> stage.</p>
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0; color: #166534; font-weight: bold;">Next Stage: Parents’ Meet Event</p>
              <p style="margin: 4px 0 0; font-size: 13px; color: #1e293b;">Detailed orientation, schedule, and guidelines will be shared via your applicant portal and registered email.</p>
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
      revalidatePath('/admin');
      revalidatePath('/admin/asc');
      revalidatePath('/admin/candidates');
      revalidatePath(`/admin/candidates/${applicationId}`);
      revalidatePath('/applicant');

      return {
        success: true,
        message: 'Candidate successfully advanced to Parents’ Meet Event (PARENTS_MEET)!',
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
            note: `ASC Assessment Concluded / Rejected: ${reasonMeta.en}.${notes ? ` Remarks: ${notes}` : ''}`,
          },
        });

        await tx.notification.create({
          data: {
            userId: application.applicantId,
            title: isNe
              ? 'छनोट परिणाम अद्यावधिक / साथी शिक्षक कार्यक्रम २०२७'
              : 'Selection Outcome Update / Saathi Teachers Programme 2027',
            body: isNe
              ? `साथी शिक्षक कार्यक्रम २०२७ का लागि तपाईंको आवेदन (${application.refNo}) को छनोट प्रक्रिया ASC मूल्याङ्कनपछि निष्कर्षमा पुगेको छ। सहभागिताका लागि धन्यवाद।`
              : `The selection process for STP 2027 (${application.refNo}) has concluded following the ASC session. We thank you sincerely for your interest and active participation.`,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: user.id,
            role: user.role,
            action: 'ASC_REJECT',
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
      revalidatePath('/admin');
      revalidatePath('/admin/asc');
      revalidatePath('/admin/candidates');
      revalidatePath(`/admin/candidates/${applicationId}`);
      revalidatePath('/applicant');

      return {
        success: true,
        message: 'Candidate marked as Rejected.',
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
            note: `ASC Assessment Placed on Hold: ${holdMeta.en}.${notes ? ` Remarks: ${notes}` : ''}`,
          },
        });

        await tx.notification.create({
          data: {
            userId: application.applicantId,
            title: isNe ? 'आवेदन प्रतिक्षारत / On Hold' : 'Application Under Deliberation / On Hold',
            body: isNe
              ? `तपाईंको आवेदन (${application.refNo}) ASC मूल्याङ्कनपछि समितिमा थप छलफलका लागि प्रतिक्षारत (On Hold) सूचीमा राखिएको छ।`
              : `Your application (${application.refNo}) is currently under committee deliberation following the ASC evaluation.`,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: user.id,
            role: user.role,
            action: 'ASC_HOLD',
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
      revalidatePath('/admin');
      revalidatePath('/admin/asc');
      revalidatePath('/admin/candidates');
      revalidatePath(`/admin/candidates/${applicationId}`);
      revalidatePath('/applicant');

      return {
        success: true,
        message: 'Candidate placed in On-Hold queue for deliberation.',
      };
    }

    return { success: false, message: 'Invalid decision specified.' };
  } catch (err) {
    console.error('Decide ASC candidate error:', err);
    return { success: false, message: 'Server error processing ASC candidate decision.' };
  }
}
