'use server';

import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export async function getUserNotificationsAction(): Promise<{
  notifications: NotificationItem[];
  unreadCount: number;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) return { notifications: [], unreadCount: 0 };

    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id },
        take: 12,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({
        where: { userId: user.id, readAt: null },
      }),
    ]);

    return {
      notifications: items.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        readAt: n.readAt ? n.readAt.toISOString() : null,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
    };
  } catch (err) {
    console.error('Fetch notifications error:', err);
    return { notifications: [], unreadCount: 0 };
  }
}

export async function markNotificationReadAction(notificationId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false };

    await prisma.notification.updateMany({
      where: { id: notificationId, userId: user.id },
      data: { readAt: new Date() },
    });

    revalidatePath('/');
    return { success: true };
  } catch (err) {
    console.error('Mark notification read error:', err);
    return { success: false };
  }
}

export async function markAllNotificationsReadAction() {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false };

    await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });

    revalidatePath('/');
    return { success: true };
  } catch (err) {
    console.error('Mark all notifications read error:', err);
    return { success: false };
  }
}
