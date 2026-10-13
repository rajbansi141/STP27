'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { useI18n } from '@/lib/i18n/context';
import {
  getUserNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
  type NotificationItem,
} from '@/app/api/notifications/actions';
import {
  Bell,
  CheckCheck,
  Clock,
  Sparkles,
  Inbox,
  Check,
} from 'lucide-react';

export function NotificationBell() {
  const { t, locale } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Poll / fetch on mount and on open
  const loadNotifications = async () => {
    const data = await getUserNotificationsAction();
    setNotifications(data.notifications);
    setUnreadCount(data.unreadCount);
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // 30s background poll
    return () => clearInterval(interval);
  }, []);

  // Close when clicked outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkOne = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    startTransition(async () => {
      await markNotificationReadAction(id);
    });
  };

  const handleMarkAll = () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
    );
    setUnreadCount(0);
    startTransition(async () => {
      await markAllNotificationsReadAction();
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) loadNotifications();
        }}
        title={t.notifications.title}
        className="relative p-2 rounded-xl text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-emerald-600 text-white font-mono text-[10px] font-bold shadow-sm animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Flyout Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-bold text-sm text-stone-900 dark:text-stone-50">
                {t.notifications.title}
              </h3>
              {unreadCount > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {unreadCount} {t.notifications.unreadBadge}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>{t.notifications.markAllRead}</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800">
            {notifications.length > 0 ? (
              notifications.map((n) => {
                const isUnread = !n.readAt;
                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (isUnread) handleMarkOne(n.id);
                    }}
                    className={`p-3.5 text-xs transition-colors cursor-pointer ${
                      isUnread
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                        : 'hover:bg-stone-50 dark:hover:bg-stone-800/40 opacity-80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                          {isUnread && (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0" />
                          )}
                          <span>{n.title}</span>
                        </div>
                        <p className="text-stone-600 dark:text-stone-300 text-[11px] leading-relaxed">
                          {n.body}
                        </p>
                      </div>

                      <span className="text-[10px] text-stone-400 font-mono shrink-0">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-stone-400 space-y-2">
                <Inbox className="h-8 w-8 mx-auto text-stone-300 dark:text-stone-700" />
                <p className="text-xs">{t.notifications.empty}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
