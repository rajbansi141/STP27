import prisma from '@/lib/prisma';
import nodemailer, { type Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    return transporter;
  }
  return null;
}

interface QueueEmailOptions {
  to: string;
  subject: string;
  html: string;
  templateCode?: string;
}

/**
 * Enqueues an outgoing transactional email into the outbox for asynchronous delivery.
 */
export async function queueEmail({
  to,
  subject,
  templateCode,
}: QueueEmailOptions) {
  let templateId: string | undefined;
  if (templateCode) {
    const tmpl = await prisma.emailTemplate.findFirst({
      where: { code: templateCode, active: true },
    });
    if (tmpl) templateId = tmpl.id;
  }

  return prisma.emailLog.create({
    data: {
      to,
      subject,
      templateId,
      status: 'PENDING',
      sentAt: new Date(),
    },
  });
}

/**
 * Worker job that sweeps the outbox for PENDING emails and delivers them.
 */
export async function processEmailOutbox(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const pendingLogs = await prisma.emailLog.findMany({
    where: { status: 'PENDING' },
    include: { template: true },
    take: 50,
    orderBy: { sentAt: 'asc' },
  });

  const mailTransporter = getTransporter();
  let succeeded = 0;
  let failed = 0;

  for (const log of pendingLogs) {
    let status = 'SENT';
    let errorMessage: string | null = null;

    try {
      if (mailTransporter) {
        await mailTransporter.sendMail({
          from: process.env.EMAIL_FROM || '"Saathi Teachers Programme" <no-reply@saathiteachers.org>',
          to: log.to,
          subject: log.subject || 'Saathi Teachers Programme Notification',
          html: log.template?.body || `<p>${log.subject}</p>`,
          text: (log.template?.body || log.subject || '').replace(/<[^>]*>/g, ''),
        });
      }
      succeeded++;
    } catch (err: unknown) {
      status = 'FAILED';
      errorMessage = err instanceof Error ? err.message : String(err);
      failed++;
      console.error(`[OUTBOX WORKER] Delivery failed for ${log.to}:`, errorMessage);
    }

    await prisma.emailLog.update({
      where: { id: log.id },
      data: {
        status,
        error: errorMessage,
      },
    });
  }

  return {
    processed: pendingLogs.length,
    succeeded,
    failed,
  };
}

/**
 * Scheduled job to scan unsubmitted draft applications and queue reminder emails.
 */
export async function processDeadlineReminders(): Promise<{
  scannedDrafts: number;
  remindersQueued: number;
}> {
  const settings = await prisma.settings.findUnique({
    where: { id: 'default' },
  });

  if (!settings || !settings.deadline) {
    return { scannedDrafts: 0, remindersQueued: 0 };
  }

  const now = Date.now();
  const deadlineMs = new Date(settings.deadline).getTime();
  const diffHours = (deadlineMs - now) / (1000 * 60 * 60);

  // Trigger reminders if deadline is within 7 days (168h) and not passed
  if (diffHours <= 0 || diffHours > 168) {
    return { scannedDrafts: 0, remindersQueued: 0 };
  }

  // Find all draft applications
  const drafts = await prisma.application.findMany({
    where: { status: 'DRAFT' },
    include: { applicant: true },
  });

  let remindersQueued = 0;

  for (const draft of drafts) {
    // Check if reminder was already sent in last 48h
    const existingReminder = await prisma.emailLog.findFirst({
      where: {
        to: draft.applicant.email,
        subject: { contains: 'Deadline Reminder' },
        sentAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      },
    });

    if (existingReminder) continue;

    const isNe = draft.applicant.locale === 'ne';
    const subject = isNe
      ? `आवेदन पेश गर्ने म्याद स्मरण - साथी शिक्षक कार्यक्रम २०२७`
      : `Application Deadline Reminder - Saathi Teachers Programme 2027`;

    const html = isNe
      ? `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #166534;">साथी शिक्षक कार्यक्रम २०२७</h2>
          <p>नमस्ते <strong>${draft.applicant.name}</strong>,</p>
          <p>तपाईंको आवेदन अहिले ड्राफ्ट अवस्थामा सुरक्षित छ। साथी शिक्षक कार्यक्रम २०२७ को आवेदन पेश गर्ने अन्तिम म्याद नजिकिँदैछ।</p>
          <p>कृपया म्याद समाप्त हुनु अगावै आफ्नो आवेदन फारम पूरा गरी पेश गर्नुहोला।</p>
          <div style="margin: 24px 0;">
            <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/apply" style="background: #166534; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">आवेदन पेश गर्नुहोस्</a>
          </div>
        </div>
      `
      : `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #166534;">Saathi Teachers Programme 2027</h2>
          <p>Dear <strong>${draft.applicant.name}</strong>,</p>
          <p>Your application is currently saved in draft mode. The deadline for the Saathi Teachers Programme 2027 cohort is approaching soon.</p>
          <p>Please review and complete your application submission before the deadline cutoff.</p>
          <div style="margin: 24px 0;">
            <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/apply" style="background: #166534; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Complete & Submit Application</a>
          </div>
        </div>
      `;

    await queueEmail({
      to: draft.applicant.email,
      subject,
      html,
      templateCode: 'DEADLINE_REMINDER',
    });

    remindersQueued++;
  }

  return {
    scannedDrafts: drafts.length,
    remindersQueued,
  };
}
