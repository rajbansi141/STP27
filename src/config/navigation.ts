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
  Layers,
  PhoneCall,
  Award,
  School,
  MapPin,
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
          titleKey: 'nav.stageProgression',
          href: '/admin/candidates',
          icon: Layers,
          badge: 'Pipeline',
          items: [
            {
              titleKey: 'nav.stageApplication',
              href: '/admin/candidates?stage=APPLICATION',
            },
            {
              titleKey: 'nav.stagePhone',
              href: '/admin/candidates?stage=PHONE_INTERVIEW',
            },
            {
              titleKey: 'nav.stageAsc',
              href: '/admin/candidates?stage=ASC',
            },
            {
              titleKey: 'nav.stageParents',
              href: '/admin/candidates?stage=PARENTS_MEET',
            },
            {
              titleKey: 'nav.stageSaathiSchool',
              href: '/admin/candidates?stage=SAATHI_SCHOOL',
            },
            {
              titleKey: 'nav.stagePlacement',
              href: '/admin/candidates?stage=PLACEMENT',
            },
          ],
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
          href: '/review',
          icon: CheckCircle2,
        },
        {
          titleKey: 'nav.stageProgression',
          href: '/review',
          icon: Workflow,
          badge: 'Pipeline',
          items: [
            {
              titleKey: 'nav.stageApplication',
              href: '/review?stage=APPLICATION',
            },
            {
              titleKey: 'nav.stagePhone',
              href: '/review?stage=PHONE_INTERVIEW',
            },
            {
              titleKey: 'nav.stageAsc',
              href: '/review?stage=ASC',
            },
            {
              titleKey: 'nav.stageParents',
              href: '/review?stage=PARENTS_MEET',
            },
            {
              titleKey: 'nav.stageSaathiSchool',
              href: '/review?stage=SAATHI_SCHOOL',
            },
            {
              titleKey: 'nav.stagePlacement',
              href: '/review?stage=PLACEMENT',
            },
          ],
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
