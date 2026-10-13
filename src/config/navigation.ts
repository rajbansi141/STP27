import {
  LayoutDashboard,
  Briefcase,
  FileSpreadsheet,
  Workflow,
  Users,
  UserCheck,
  Activity,
  Mail,
  Send,
  Bell,
  Download,
  ShieldAlert,
  Settings,
  FileText,
  Clock,
  FolderOpen,
  User,
  CheckCircle2,
  ListTodo,
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
      labelKey: 'nav.overview',
      items: [
        {
          titleKey: 'nav.dashboard',
          href: '/admin',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      labelKey: 'nav.recruitment',
      items: [
        {
          titleKey: 'nav.applicants',
          href: '/admin/candidates',
          icon: Users,
        },
        {
          titleKey: 'nav.pipeline',
          href: '/admin/settings',
          icon: Workflow,
        },
      ],
    },
    {
      labelKey: 'nav.people',
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
        {
          titleKey: 'nav.people',
          href: '/admin/users',
          icon: Users,
        },
      ],
    },
    {
      labelKey: 'nav.communication',
      items: [
        {
          titleKey: 'nav.emailTemplates',
          href: '/admin/templates',
          icon: Mail,
        },
      ],
    },
    {
      labelKey: 'nav.data',
      items: [
        {
          titleKey: 'nav.auditLogs',
          href: '/admin/audit',
          icon: ShieldAlert,
        },
      ],
    },
    {
      labelKey: 'nav.system',
      items: [
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
          href: '/review',
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
      ],
    },
  ],
};
