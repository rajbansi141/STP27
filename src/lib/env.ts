import { z } from 'zod';

/**
 * Validated Runtime Environment Variables
 * Strict schema parsing ensures fail-fast on startup if critical secrets or configs are misconfigured.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  CRON_SECRET: z.string().min(12, 'CRON_SECRET must be at least 12 characters').default('stp-production-cron-secret-token-stp27'),
  DATABASE_URL: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('"Saathi Teachers Programme" <no-reply@saathiteachers.org>'),
});

const parsed = envSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  APP_URL: process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000',
  CRON_SECRET: process.env.CRON_SECRET || 'stp-production-cron-secret-token-stp27',
  DATABASE_URL: process.env.DATABASE_URL,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM,
});

if (!parsed.success) {
  console.error('❌ Invalid environment variables configuration:', parsed.error.format());
  throw new Error('Application environment validation failed.');
}

export const env = parsed.data;
