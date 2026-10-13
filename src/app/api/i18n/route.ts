import { NextRequest, NextResponse } from 'next/server';
import { LOCALE_COOKIE_NAME, LOCALES, type Locale } from '@/lib/i18n/config';
import { getCurrentUser } from '@/lib/auth/session';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { locale } = body;

    if (!locale || !LOCALES.includes(locale as Locale)) {
      return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
    }

    const res = NextResponse.json({ success: true, locale });

    // Set persistent cookie (1 year)
    res.cookies.set(LOCALE_COOKIE_NAME, locale, {
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    // If user is logged in, also update their database profile preference
    const user = await getCurrentUser();
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { locale },
      }).catch((e) => console.error('Failed to update user locale in DB:', e));
    }

    return res;
  } catch (err) {
    console.error('Error switching locale:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
