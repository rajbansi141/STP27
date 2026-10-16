/**
 * Unified Application Route Catalog
 * Single source of truth for typed application URLs across public, auth, applicant, reviewer, and admin consoles.
 */

export const ROUTES = {
  public: {
    home: '/',
    faq: '/faq',
    contact: '/contact',
    eligibility: '/eligibility',
    fellowship: '/fellowship',
    selectionProcess: '/selection-process',
    terms: '/terms',
    privacy: '/privacy',
  },
  auth: {
    login: '/login',
    register: '/register',
    forgotPassword: '/forgot-password',
    resetPassword: '/reset-password',
    changePassword: '/change-password',
    verifyEmail: '/verify-email',
  },
  applicant: {
    dashboard: '/applicant',
    apply: '/apply',
    profile: '/profile',
    status: '/status',
    legacyDashboard: '/dashboard',
  },
  reviewer: {
    dashboard: '/reviewer',
    evaluation: (id: string) => `/reviewer/${id}`,
    legacyReview: (id: string) => `/review/${id}`,
  },
  admin: {
    dashboard: '/admin',
    candidates: '/admin/candidates',
    candidateDetail: (id: string) => `/admin/candidates/${id}`,
    ascHub: '/admin/asc',
    cohorts: '/admin/cohorts',
    committee: '/admin/committee',
    committeeMember: (id: string) => `/admin/committee/${id}`,
    users: '/admin/users',
    templates: '/admin/templates',
    audit: '/admin/audit',
    settings: '/admin/settings',
  },
} as const;

/**
 * Returns the canonical dashboard route for a given user role.
 */
export function getDefaultDashboardForRole(role?: string | null): string {
  switch (role) {
    case 'ADMIN':
      return ROUTES.admin.dashboard;
    case 'REVIEWER':
      return ROUTES.reviewer.dashboard;
    case 'APPLICANT':
    default:
      return ROUTES.applicant.dashboard;
  }
}

/**
 * Validates whether a path is a public or auth route that does not require login
 */
export function isPublicPath(pathname: string): boolean {
  if (
    pathname === '/' ||
    pathname.startsWith('/faq') ||
    pathname.startsWith('/contact') ||
    pathname.startsWith('/eligibility') ||
    pathname.startsWith('/fellowship') ||
    pathname.startsWith('/selection-process') ||
    pathname.startsWith('/terms') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/verify-email') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/cron') ||
    pathname.startsWith('/api/files')
  ) {
    return true;
  }
  return false;
}
