'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { NavUser } from '@/components/layout/nav-user';
import { navigationConfig, type NavGroup, type NavItem } from '@/config/navigation';
import { useI18n } from '@/lib/i18n';
import { toNepaliDigits } from '@/lib/i18n/translations';

export interface SidebarStats {
  stageCounts: Record<string, number>;
  totalInPipeline: number;
  applicantsCount: number;
  pendingReviewsCount: number;
  applicantStageInfo: { stage: string; stageOrder: number; totalStages: number } | null;
  unreadNotifications: number;
  recentAuditsCount: number;
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  navGroups?: NavGroup[];
  user: {
    name: string;
    email: string;
    role: 'ADMIN' | 'REVIEWER' | 'APPLICANT';
    avatar?: string;
  };
}

const formatIndex = (num: number, isNe: boolean): string => {
  const padded = num < 10 ? `0${num}` : `${num}`;
  return isNe ? toNepaliDigits(padded) : padded;
};

const formatCount = (num: number, isNe: boolean): string => {
  return isNe ? toNepaliDigits(num) : `${num}`;
};

function CollapsibleNavItem({
  item,
  pathname,
  currentFullPath,
  translate,
  stats,
  locale,
}: {
  item: NavItem;
  pathname: string;
  currentFullPath: string;
  translate: (key: string) => string;
  stats: SidebarStats | null;
  locale: string;
}) {
  const isNe = locale === 'ne';
  const isGroupActive =
    item.href === currentFullPath ||
    item.href === pathname ||
    (item.items?.some((sub) =>
      sub.href.includes('?')
        ? currentFullPath === sub.href
        : pathname === sub.href || pathname.startsWith(sub.href)
    ) ?? false);

  const [isOpen, setIsOpen] = React.useState(isGroupActive);

  // Keep open state in sync when navigating into this group
  React.useEffect(() => {
    if (isGroupActive) {
      setIsOpen(true);
    }
  }, [isGroupActive]);

  // Dynamic header badge
  const headerBadge = React.useMemo(() => {
    return item.badge;
  }, [item.badge]);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger
          render={
            <SidebarMenuButton
              tooltip={translate(item.titleKey)}
              isActive={isGroupActive}
              className="w-full"
            />
          }
        >
          <item.icon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="truncate font-medium">{translate(item.titleKey)}</span>
          {headerBadge && (
            <Badge
              variant="secondary"
              className="ml-auto mr-1 px-1.5 py-0 text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60"
            >
              {headerBadge}
            </Badge>
          )}
          <ChevronRight
            className={`ml-auto size-4 transition-transform duration-200 ${
              isOpen ? 'rotate-90' : ''
            } group-data-open/collapsible:rotate-90 group-data-[state=open]/collapsible:rotate-90`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="space-y-1 py-1">
            {item.items?.map((subItem, subIdx) => {
              const isSubActive = subItem.href.includes('?')
                ? currentFullPath === subItem.href
                : pathname === subItem.href;

              // Extract stage code if this is a stage progression link
              const stageMatch = subItem.href.match(/stage=([A-Z_]+)/);
              const stageCode = stageMatch ? stageMatch[1] : null;
              const liveCount = stageCode && stats?.stageCounts ? stats.stageCounts[stageCode] : undefined;

              return (
                <SidebarMenuSubItem key={subItem.href}>
                  <SidebarMenuSubButton
                    render={<Link href={subItem.href} />}
                    isActive={isSubActive}
                    className="flex items-center gap-2 text-xs py-1.5 transition-colors group/sub"
                  >
                    {/* Indexing number badge (01, 02, etc.) */}
                    <span
                      className={`flex size-4.5 items-center justify-center rounded text-[10px] font-mono font-semibold shrink-0 transition-all ${
                        isSubActive
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 group-hover/sub:bg-emerald-100 dark:group-hover/sub:bg-emerald-950/80 group-hover/sub:text-emerald-700 dark:group-hover/sub:text-emerald-300'
                      }`}
                    >
                      {formatIndex(subIdx + 1, isNe)}
                    </span>

                    <span className="truncate flex-1 font-medium">{translate(subItem.titleKey)}</span>

                    {/* Live candidate/update count for this stage */}
                    {liveCount !== undefined ? (
                      <span
                        className={`ml-auto px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold shrink-0 transition-colors ${
                          liveCount > 0
                            ? isSubActive
                              ? 'bg-emerald-700 text-white'
                              : 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60'
                            : 'text-stone-400 dark:text-stone-500'
                        }`}
                      >
                        {formatCount(liveCount, isNe)}
                      </span>
                    ) : subItem.badge ? (
                      <span
                        className={`ml-auto flex size-4 items-center justify-center rounded-full text-[9px] font-bold shrink-0 transition-colors ${
                          isSubActive
                            ? 'bg-emerald-600 text-white'
                            : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300'
                        }`}
                      >
                        {subItem.badge}
                      </span>
                    ) : null}
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function AppSidebar({ navGroups, user, ...props }: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t, locale } = useI18n();
  const isNe = locale === 'ne';

  const [stats, setStats] = React.useState<SidebarStats | null>(null);

  const fetchStats = React.useCallback(async () => {
    try {
      const res = await fetch('/api/sidebar/stats');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStats(data);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    fetchStats();

    // Periodic refresh every 20 seconds to catch changes/updates live
    const interval = setInterval(fetchStats, 20000);

    // Refresh when user tabs back into the window
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchStats();
      }
    };

    // Instant refresh listener when any page dispatches 'sidebar-refresh'
    const handleCustomRefresh = () => {
      fetchStats();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('sidebar-refresh', handleCustomRefresh);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('sidebar-refresh', handleCustomRefresh);
    };
  }, [fetchStats, pathname]);

  const currentQuery = searchParams ? searchParams.toString() : '';
  const currentFullPath = currentQuery ? `${pathname}?${currentQuery}` : pathname;

  const roleKey = (user.role?.toLowerCase() || 'applicant') as 'admin' | 'reviewer' | 'applicant';
  const resolvedGroups = navGroups || navigationConfig[roleKey] || navigationConfig.applicant;

  // Helper to resolve translation string
  const translate = (key: string): string => {
    const keys = key.split('.');
    let val: any = t;
    for (const k of keys) {
      if (val && typeof val === 'object' && k in val) {
        val = val[k];
      } else {
        return key;
      }
    }
    return typeof val === 'string' ? val : key;
  };

  const roleLabel =
    user.role === 'ADMIN'
      ? t?.common?.adminPortal || 'Admin Console'
      : user.role === 'REVIEWER'
      ? t?.common?.reviewQueue || 'Reviewer Portal'
      : 'Applicant Portal';

  // Dynamic badge resolver for top-level menu items
  const getItemBadge = (item: NavItem): string | undefined => {
    if (!stats) return item.badge;

    // Admin candidates
    if (item.href === '/admin/candidates' && !item.items) {
      if (stats.applicantsCount > 0) {
        return `${formatCount(stats.applicantsCount, isNe)} ${isNe ? 'कुल' : 'total'}`;
      }
    }

    // Reviewer evaluations
    if ((item.href === '/reviewer' || item.href === '/review') && !item.items) {
      if (stats.pendingReviewsCount > 0) {
        return `${formatCount(stats.pendingReviewsCount, isNe)} ${isNe ? 'बाँकी' : 'pending'}`;
      }
    }

    // Admin audit logs / updates
    if (item.href === '/admin/audit') {
      if (stats.recentAuditsCount > 0) {
        return `${formatCount(stats.recentAuditsCount, isNe)} ${isNe ? 'अपडेट' : 'updates'}`;
      }
    }

    // Applicant application status
    if (item.href === '/apply' || item.href === '/applicant') {
      if (stats.applicantStageInfo) {
        return `${isNe ? 'चरण' : 'Stage'} ${formatCount(stats.applicantStageInfo.stageOrder, isNe)}/${formatCount(stats.applicantStageInfo.totalStages, isNe)}`;
      }
    }

    return item.badge;
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/" />}
              className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group/logo"
            >
              <div className="flex aspect-square size-9 shrink-0 items-center justify-center rounded-xl bg-white p-1 border border-stone-200 dark:border-stone-800 shadow-sm transition-transform duration-200 group-hover/logo:scale-105">
                <Image
                  src="/saathi-logo.png"
                  alt="Saathi Teachers Logo"
                  width={36}
                  height={36}
                  className="size-7 object-contain"
                  priority
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-bold font-heading text-stone-900 dark:text-stone-50">STP 2027</span>
                  <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-800 dark:text-emerald-300">
                    Nepal
                  </span>
                </div>
                <span className="truncate text-xs text-muted-foreground">
                  {roleLabel}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {resolvedGroups.map((group, groupIdx) => (
          <SidebarGroup key={groupIdx}>
            {group.labelKey && (
              <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 flex items-center justify-between">
                <span>{translate(group.labelKey)}</span>
                <span className="text-[9px] font-mono font-normal tracking-wider text-muted-foreground/60">
                  SEC {formatIndex(groupIdx + 1, isNe)}
                </span>
              </SidebarGroupLabel>
            )}
            <SidebarMenu>
              {group.items.map((item, itemIdx) => {
                const isActive =
                  item.href === currentFullPath ||
                  item.href === pathname ||
                  (item.href !== '/admin' &&
                    item.href !== '/reviewer' &&
                    item.href !== '/applicant' &&
                    item.href !== '/dashboard' &&
                    !item.items &&
                    pathname.startsWith(item.href));

                // Group with sub-items (e.g. Stage Progression)
                if (item.items && item.items.length > 0) {
                  return (
                    <CollapsibleNavItem
                      key={item.titleKey}
                      item={item}
                      pathname={pathname}
                      currentFullPath={currentFullPath}
                      translate={translate}
                      stats={stats}
                      locale={locale}
                    />
                  );
                }

                const dynamicBadge = getItemBadge(item);

                // Standard item
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={translate(item.titleKey)}
                      className="transition-colors group/item"
                    >
                      <item.icon className="size-4 shrink-0 text-muted-foreground group-hover/item:text-foreground" />
                      <span className="truncate flex-1 font-medium">{translate(item.titleKey)}</span>
                      {dynamicBadge && (
                        <Badge
                          variant="secondary"
                          className="ml-auto px-1.5 py-0 text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 font-mono"
                        >
                          {dynamicBadge}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <NavUser user={user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
