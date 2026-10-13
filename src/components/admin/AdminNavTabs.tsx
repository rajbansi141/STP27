'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n/context';
import {
  BarChart3,
  Users,
  UserCog,
  Sliders,
  History,
  Mail,
} from 'lucide-react';

export function AdminNavTabs() {
  const pathname = usePathname();
  const { t } = useI18n();

  const navItems = [
    {
      href: '/admin',
      label: t.admin.nav.overview,
      icon: BarChart3,
      exact: true,
    },
    {
      href: '/admin/candidates',
      label: t.admin.nav.candidates,
      icon: Users,
      exact: false,
    },
    {
      href: '/admin/committee',
      label: t?.nav?.committee || 'Selection Committee',
      icon: Users,
      exact: false,
    },
    {
      href: '/admin/users',
      label: t.admin.nav.users,
      icon: UserCog,
      exact: false,
    },
    {
      href: '/admin/settings',
      label: t.admin.nav.settings,
      icon: Sliders,
      exact: false,
    },
    {
      href: '/admin/templates',
      label: t.admin.nav.templates,
      icon: Mail,
      exact: false,
    },
    {
      href: '/admin/audit',
      label: t.admin.nav.audit,
      icon: History,
      exact: false,
    },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-stone-200 dark:border-stone-800 scrollbar-none">
      {navItems.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
              isActive
                ? 'bg-emerald-700 text-white shadow-sm shadow-emerald-900/20'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800/60'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
