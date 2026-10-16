import nodemailer, { type Transporter } from 'nodemailer';
import prisma from '@/lib/prisma';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  templateCode?: string;
}

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

/**
 * Dispatches an email via configured SMTP, or logs to development console if SMTP is not provided.
 * Always records transaction in EmailLog.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  templateCode,
}: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  const mailTransporter = getTransporter();
  let status = 'SENT';
  let errorMessage: string | null = null;

  let templateId: string | undefined;
  if (templateCode) {
    const tmpl = await prisma.emailTemplate.findFirst({
      where: { code: templateCode, active: true },
    });
    if (tmpl) templateId = tmpl.id;
  }

  try {
    if (mailTransporter) {
      await mailTransporter.sendMail({
        from: process.env.EMAIL_FROM || '"Saathi Teachers Programme" <no-reply@saathiteachers.org>',
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
      });
    } else if (process.env.NODE_ENV === 'development') {
      // Intentionally omit sensitive body/tokens from logs
    }
  } catch (err: unknown) {
    status = 'FAILED';
    errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Email sending failed:', errorMessage);
  }

  // Record into EmailLog
  await prisma.emailLog.create({
    data: {
      to,
      subject,
      templateId,
      status,
      error: errorMessage,
      sentAt: new Date(),
    },
  }).catch((e) => console.error('Failed to log email to DB:', e));

  return { success: status === 'SENT', error: errorMessage || undefined };
}

/**
 * Send 6-digit signup verification code in applicant's preferred language.
 */
export async function sendSignupVerificationEmail(
  to: string,
  name: string,
  code: string,
  locale: string = 'en'
) {
  const isNepali = locale === 'ne';
  const subject = isNepali
    ? 'साथी शिक्षक कार्यक्रम २०२७ का लागि आफ्नो इमेल प्रमाणीकरण गर्नुहोस्'
    : 'Verify your email - Saathi Teachers Programme (STP) 2027';

  const html = isNepali
    ? `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #166534;">साथी शिक्षक कार्यक्रम २०२७ (STP)</h2>
        <p>आदरणीय <strong>${name}</strong>,</p>
        <p>साथी शिक्षक कार्यक्रम २०२७ को आवेदन प्रणालीमा दर्ता गर्नुभएकोमा स्वागत गर्दछौं।</p>
        <p>तपाईंको ६ अङ्कको इमेल प्रमाणीकरण कोड हो:</p>
        <div style="background: #f0fdf4; border: 1px dashed #16a34a; font-size: 28px; font-weight: bold; letter-spacing: 6px; text-align: center; padding: 16px; margin: 20px 0; color: #166534;">
          ${code}
        </div>
        <p style="color: #64748b; font-size: 14px;">यो कोड २४ घण्टाका लागि मान्य छ। यदि तपाईंले दर्ता गर्नुभएको होइन भने, यसलाई बेवास्ता गर्न सक्नुहुन्छ।</p>
      </div>
    `
    : `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #166534;">Saathi Teachers Programme (STP) 2027</h2>
        <p>Dear <strong>${name}</strong>,</p>
        <p>Thank you for registering for the Saathi Teachers Programme 2027 application portal.</p>
        <p>Your 6-digit verification security code is:</p>
        <div style="background: #f0fdf4; border: 1px dashed #16a34a; font-size: 28px; font-weight: bold; letter-spacing: 6px; text-align: center; padding: 16px; margin: 20px 0; color: #166534;">
          ${code}
        </div>
        <p style="color: #64748b; font-size: 14px;">This code is valid for 24 hours. If you did not create this account, please disregard this email.</p>
      </div>
    `;

  return sendEmail({
    to,
    subject,
    html,
    templateCode: 'SIGNUP_VERIFICATION',
  });
}

/**
 * Send 6-digit password reset code.
 */
export async function sendPasswordResetEmail(
  to: string,
  code: string,
  locale: string = 'en'
) {
  const isNepali = locale === 'ne';
  const subject = isNepali
    ? 'पासवर्ड पुनःसेट सुरक्षा कोड - साथी शिक्षक कार्यक्रम २०२७'
    : 'Password Reset Code - Saathi Teachers Programme (STP) 2027';

  const html = isNepali
    ? `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #166534;">साथी शिक्षक कार्यक्रम २०२७</h2>
        <p>नमस्ते,</p>
        <p>तपाईंको खाताको लागि पासवर्ड पुनःसेट अनुरोध प्राप्त भएको छ।</p>
        <p>तपाईंको ६ अङ्कको सुरक्षा कोड:</p>
        <div style="background: #fefce8; border: 1px dashed #ca8a04; font-size: 28px; font-weight: bold; letter-spacing: 6px; text-align: center; padding: 16px; margin: 20px 0; color: #854d0e;">
          ${code}
        </div>
        <p style="color: #dc2626; font-size: 14px;">यो कोड १० मिनेटका लागि मात्र मान्य छ। (अधिकतम ५ पटक प्रयास गर्न सकिन्छ)।</p>
        <p style="color: #64748b; font-size: 13px;">यदि तपाईंले यो अनुरोध गर्नुभएको होइन भने, कसैले तपाईंको खाता खोल्न सक्दैन; ढुक्क हुनुहोस्।</p>
      </div>
    `
    : `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #166534;">Saathi Teachers Programme (STP) 2027</h2>
        <p>Hello,</p>
        <p>A password reset request was initiated for your application portal account.</p>
        <p>Your 6-digit security code is:</p>
        <div style="background: #fefce8; border: 1px dashed #ca8a04; font-size: 28px; font-weight: bold; letter-spacing: 6px; text-align: center; padding: 16px; margin: 20px 0; color: #854d0e;">
          ${code}
        </div>
        <p style="color: #dc2626; font-size: 14px;">This code is valid for 10 minutes (maximum 5 attempts allowed).</p>
        <p style="color: #64748b; font-size: 13px;">If you did not request this, you can safely disregard this email.</p>
      </div>
    `;

  return sendEmail({
    to,
    subject,
    html,
    templateCode: 'PASSWORD_RESET',
  });
}
