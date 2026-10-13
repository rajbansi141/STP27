import { NextResponse } from 'next/server';
import {
  getUserNotificationsAction,
  markAllNotificationsReadAction,
} from '@/app/api/notifications/actions';

export async function GET() {
  try {
    const data = await getUserNotificationsAction();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ notifications: [], unreadCount: 0 }, { status: 500 });
  }
}

export async function POST() {
  try {
    const res = await markAllNotificationsReadAction();
    return NextResponse.json(res);
  } catch (err) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
