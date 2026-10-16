import {
  LayoutDashboard,
  Users,
  Award,
  CalendarRange,
  UserCheck,
  Activity,
  Mail,
  ShieldAlert,
  Settings,
  CheckCircle2,
  FileText,
  User,
  type LucideIcon,
} from 'lucide-react';

export interface NavSubItem {
  titleKey: string;
  href: string;
  badge?: string;
}

export interface NavItem {
  titleKey: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  items?: NavSubItem[];
}

export interface NavGroup {
  labelKey: string;
  items: NavItem[];
}

export const navigationConfig: Record<'admin' | 'reviewer' | 'applicant', NavGroup[]> = {
  admin: [
    {
      labelKey: 'nav.recruitment',
      items: [
        {
          titleKey: 'nav.dashboard',
          href: '/admin',
          icon: LayoutDashboard,
        },
        {
          titleKey: 'nav.applicants',
          href: '/admin/candidates',
          icon: Users,
        },
        {
          titleKey: 'nav.ascHub',
          href: '/admin/asc',
          icon: Award,
        },
        {
          titleKey: 'nav.cohorts',
          href: '/admin/cohorts',
          icon: CalendarRange,
        },
      ],
    },
    {
      labelKey: 'nav.evaluation',
      items: [
        {
          titleKey: 'nav.committee',
          href: '/admin/committee',
          icon: UserCheck,
        },
        {
          titleKey: 'nav.reviewerActivity',
          href: '/admin/committee/activity',
          icon: Activity,
        },
      ],
    },
    {
      labelKey: 'nav.communication',
      items: [
        {
          titleKey: 'nav.emailHub',
          href: '/admin/templates',
          icon: Mail,
        },
      ],
    },
    {
      labelKey: 'nav.systemSecurity',
      items: [
        {
          titleKey: 'nav.people',
          href: '/admin/users',
          icon: Users,
        },
        {
          titleKey: 'nav.auditLogs',
          href: '/admin/audit',
          icon: ShieldAlert,
        },
        {
          titleKey: 'nav.settings',
          href: '/admin/settings',
          icon: Settings,
        },
      ],
    },
  ],
  reviewer: [
    {
      labelKey: 'nav.portal',
      items: [
        {
          titleKey: 'nav.dashboard',
          href: '/reviewer',
          icon: LayoutDashboard,
        },
        {
          titleKey: 'nav.evaluations',
          href: '/reviewer?filter=completed',
          icon: CheckCircle2,
        },
      ],
    },
  ],
  applicant: [
    {
      labelKey: 'nav.portal',
      items: [
        {
          titleKey: 'nav.dashboard',
          href: '/applicant',
          icon: LayoutDashboard,
        },
        {
          titleKey: 'nav.myApplication',
          href: '/apply',
          icon: FileText,
        },
        {
          titleKey: 'nav.profile',
          href: '/profile',
          icon: User,
        },
      ],
    },
  ],
};
