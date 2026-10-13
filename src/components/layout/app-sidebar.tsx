'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronRight,
  GraduationCap,
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
import { navigationConfig, type NavGroup } from '@/config/navigation';
import { useI18n } from '@/lib/i18n';

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  navGroups?: NavGroup[];
  user: {
    name: string;
    email: string;
    role: 'ADMIN' | 'REVIEWER' | 'APPLICANT';
    avatar?: string;
  };
}

export function AppSidebar({ navGroups, user, ...props }: AppSidebarProps) {
  const pathname = usePathname();
  const { t, locale } = useI18n();

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

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/" />}
              className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                <GraduationCap className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold">STP 2027</span>
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
              <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                {translate(group.labelKey)}
              </SidebarGroupLabel>
            )}
            <SidebarMenu>
              {group.items.map((item) => {
                const isActive =
                  item.href === pathname ||
                  (item.href !== '/admin' &&
                    item.href !== '/reviewer' &&
                    item.href !== '/applicant' &&
                    item.href !== '/dashboard' &&
                    pathname.startsWith(item.href));

                // Group with sub-items
                if (item.items && item.items.length > 0) {
                  const isGroupActive =
                    isActive || item.items.some((sub) => pathname.startsWith(sub.href));

                  return (
                    <Collapsible
                      key={item.titleKey}
                      defaultOpen={isGroupActive}
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
                          <item.icon className="size-4 shrink-0" />
                          <span className="truncate">{translate(item.titleKey)}</span>
                          <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.items.map((subItem) => {
                              const isSubActive = pathname === subItem.href;
                              return (
                                <SidebarMenuSubItem key={subItem.href}>
                                  <SidebarMenuSubButton
                                    render={<Link href={subItem.href} />}
                                    isActive={isSubActive}
                                  >
                                    <span>{translate(subItem.titleKey)}</span>
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

                // Standard item
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={translate(item.titleKey)}
                      className="transition-colors"
                    >
                      <item.icon className="size-4 shrink-0" />
                      <span className="truncate">{translate(item.titleKey)}</span>
                      {item.badge && (
                        <Badge
                          variant="secondary"
                          className="ml-auto px-1.5 py-0 text-[10px]"
                        >
                          {item.badge}
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
