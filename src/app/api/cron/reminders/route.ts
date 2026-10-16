import { NextRequest, NextResponse } from 'next/server';
import { processDeadlineReminders } from '@/lib/email/queue';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const providedKey = request.nextUrl.searchParams.get('key');
  const providedToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : providedKey;

  const cronSecret = process.env.CRON_SECRET || (process.env.NODE_ENV !== 'production' ? 'stp-dev-cron-key' : null);

  if (!cronSecret || providedToken !== cronSecret) {
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
