'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Clock,
  Sun,
  Moon,
  CheckCheck,
  ChevronRight,
} from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/lib/i18n';

interface SiteHeaderProps {
  role?: 'ADMIN' | 'REVIEWER' | 'APPLICANT';
  deadlineDate?: string | null;
}

export function SiteHeader({ role, deadlineDate }: SiteHeaderProps) {
  const pathname = usePathname();
  const { t, locale, setLocale } = useI18n();
  const [unreadCount, setUnreadCount] = React.useState<number>(0);
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [isDark, setIsDark] = React.useState<boolean>(false);
  const [timeLeft, setTimeLeft] = React.useState<string>('');

  React.useEffect(() => {
    // Check initial dark mode
    if (typeof window !== 'undefined') {
      const isDarkMode =
        document.documentElement.classList.contains('dark') ||
        localStorage.getItem('stp_theme') === 'dark' ||
        (!localStorage.getItem('stp_theme') &&
          window.matchMedia('(prefers-color-scheme: dark)').matches);
      setIsDark(isDarkMode);
    }
  }, []);

  // Fetch notifications
  React.useEffect(() => {
    let isMounted = true;
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setUnreadCount(data.unreadCount || 0);
            setNotifications(data.notifications || []);
          }
        }
      } catch {
        // Silently handle if unauthenticated or network failure
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Calculate deadline chip (Applicant only)
  React.useEffect(() => {
    if (role !== 'APPLICANT' || !deadlineDate) return;

    const updateTimer = () => {
      const deadline = new Date(deadlineDate).getTime();
      const now = new Date().getTime();
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeLeft(locale === 'ne' ? 'म्याद समाप्त' : 'Closed');
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        if (locale === 'ne') {
          setTimeLeft(`${days} दिन ${hours} घण्टा बाँकी`);
        } else {
          setTimeLeft(`Closes in ${days}d ${hours}h`);
        }
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 60000);
    return () => clearInterval(timer);
  }, [role, deadlineDate, locale]);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('stp_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('stp_theme', 'light');
    }
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', { method: 'POST' });
      setUnreadCount(0);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
      );
    } catch {
      // Ignore
    }
  };

  // Generate breadcrumb items from pathname
  const pathSegments = pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, idx) => {
    const href = '/' + pathSegments.slice(0, idx + 1).join('/');
    let label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');

    if (segment === 'admin') label = t?.common?.adminPortal || 'Admin';
    else if (segment === 'reviewer') label = t?.common?.reviewQueue || 'Reviewer';
    else if (segment === 'applicant') label = 'Applicant';
    else if (segment === 'committee') label = t?.nav?.committee || 'Selection Committee';
    else if (segment === 'activity') label = t?.nav?.reviewerActivity || 'Activity';
    else if (segment === 'settings') label = t?.nav?.settings || 'Settings';
    else if (segment === 'pipeline') label = t?.nav?.pipeline || 'Pipeline';
    else if (segment === 'positions') label = t?.nav?.positions || 'Positions';

    return { label, href, isLast: idx === pathSegments.length - 1 };
  });

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur transition-[width,height] ease-linear">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb className="hidden md:flex">
          <BreadcrumbList>
            {breadcrumbs.map((bc, i) => (
              <React.Fragment key={bc.href}>
                <BreadcrumbItem>
                  {bc.isLast ? (
                    <BreadcrumbPage className="font-semibold">{bc.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      render={<Link href={bc.href} />}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {bc.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!bc.isLast && <BreadcrumbSeparator />}
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Item 1: Compact Deadline Chip (Applicant Only) */}
        {role === 'APPLICANT' && timeLeft && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400 border border-amber-500/20">
            <Clock className="h-3.5 w-3.5 animate-pulse" />
            <span>{timeLeft}</span>
          </div>
        )}

        {/* Item 2: Segmented Language Toggle (EN | ने) */}
        <div className="flex items-center rounded-lg border bg-muted/50 p-0.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setLocale('en')}
            className={`rounded-md px-2 py-1 transition-all ${
              locale === 'en'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLocale('ne')}
            className={`rounded-md px-2 py-1 transition-all ${
              locale === 'ne'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            ने
          </button>
        </div>

        {/* Item 3: Notification Bell Popover */}
        <DropdownMenu>
          <DropdownMenuTrigger className="relative flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted focus:outline-none transition-colors">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-2">
            <div className="flex items-center justify-between pb-2 px-1">
              <span className="font-semibold text-sm">
                {t?.notifications?.title || 'Notifications'}
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <CheckCheck className="h-3 w-3" />
                  {t?.notifications?.markAllRead || 'Mark all read'}
                </button>
              )}
            </div>
            <DropdownMenuSeparator />
            <div className="max-h-64 overflow-y-auto space-y-1 py-1">
              {notifications.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  {t?.notifications?.empty || 'No notifications'}
                </p>
              ) : (
                notifications.slice(0, 4).map((n) => (
                  <div
                    key={n.id}
                    className={`rounded-md p-2 text-xs transition-colors ${
                      !n.readAt ? 'bg-primary/5 font-medium' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold truncate">{n.title}</span>
                      {!n.readAt && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Item 4: Theme Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-8 w-8 rounded-full"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}
