import { NextRequest, NextResponse } from 'next/server';
import { processDeadlineReminders } from '@/lib/email/queue';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'stp-secret-cron-key-2027';

  const providedKey = request.nextUrl.searchParams.get('key');
  const isAuthorized =
    authHeader === `Bearer ${cronSecret}` || providedKey === cronSecret;

  if (!isAuthorized && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized cron invocation' }, { status: 401 });
  }

  const result = await processDeadlineReminders();
  return NextResponse.json({
    success: true,
    message: 'Deadline reminder scan completed.',
    ...result,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
