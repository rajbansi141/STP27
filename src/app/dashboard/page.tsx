import Link from 'next/link';
import { requireAuth } from '@/lib/auth/rbac';
import { getServerTranslations } from '@/lib/i18n/server';
import prisma from '@/lib/prisma';
import {
  Shield,
  User,
  Clock,
  KeyRound,
  FileText,
  Users,
  CheckCircle2,
  AlertTriangle,
  History,
  Sparkles,
  ArrowRight,
  Workflow,
  Bell,
  Check,
  Info,
  Award,
} from 'lucide-react';

export default async function DashboardPage() {
  // Enforce server-side RBAC: requires active authenticated session
  const currentUser = await requireAuth('/dashboard');
  const { t, locale } = await getServerTranslations();

  // Load relevant data depending on role
  const [stages, settings, userApplication, userNotifications, recentAudits, usersCount] = await Promise.all([
    prisma.stage.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    }),
    prisma.settings.findUnique({
      where: { id: 'default' },
    }),
    prisma.application.findFirst({
      where: { applicantId: currentUser.id },
      include: {
        histories: {
          orderBy: { at: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.findMany({
      where: { userId: currentUser.id },
      take: 6,
      orderBy: { createdAt: 'desc' },
    }),
    currentUser.role === 'ADMIN'
      ? prisma.auditLog.findMany({
          take: 6,
          orderBy: { at: 'desc' },
          include: { actor: true },
        })
      : Promise.resolve([]),
    prisma.user.count(),
  ]);

  const stagesCount = stages.length;

  const roleBadgeColors: Record<string, string> = {
    ADMIN: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    REVIEWER: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    APPLICANT: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
  };

  return (
    <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${
                roleBadgeColors[currentUser.role] || 'bg-white/20 text-white'
              }`}
            >
              {t.roles[currentUser.role]}
            </span>
            {currentUser.emailVerified ? (
              <span className="flex items-center gap-1 text-xs bg-emerald-900/60 text-emerald-200 border border-emerald-500/40 px-2.5 py-0.5 rounded-full">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{locale === 'ne' ? 'इमेल प्रमाणित' : 'Email Verified'}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs bg-amber-900/60 text-amber-200 border border-amber-500/40 px-2.5 py-0.5 rounded-full">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{locale === 'ne' ? 'इमेल अप्रमाणित' : 'Email Unverified'}</span>
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-heading font-bold">
            {locale === 'ne' ? `स्वागत छ, ${currentUser.name}` : `Welcome, ${currentUser.name}`}
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm max-w-2xl">
            {settings?.cycleLabel || 'Saathi Teachers Programme (STP) Application 2027'} •{' '}
            {locale === 'ne'
              ? 'तपाईंको सत्र सुरक्षित छ र ३० दिनसम्म सक्रिय रहनेछ।'
              : 'Your session is active and securely persisted with Argon2 credentials and DB sessions.'}
          </p>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Profile & Session Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-700 dark:text-stone-300">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                {locale === 'ne' ? 'प्रयोगकर्ता विवरण' : 'Account Details'}
              </h2>
              <p className="text-xs text-stone-500">{currentUser.email}</p>
            </div>
          </div>

          <div className="space-y-2 text-xs border-t border-stone-100 dark:border-stone-800 pt-3">
            <div className="flex justify-between">
              <span className="text-stone-500">ID / Username:</span>
              <span className="font-mono font-medium text-stone-800 dark:text-stone-200">
                {currentUser.username || currentUser.id.slice(0, 10)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">{locale === 'ne' ? 'भाषा:' : 'Language:'}</span>
              <span className="font-medium text-stone-800 dark:text-stone-200 uppercase">
                {currentUser.locale}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Password Status:</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {currentUser.mustChangePassword ? 'Change Required' : 'Active (Argon2id)'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                {locale === 'ne' ? 'भर्ती चक्र २०२७' : '2027 Cycle Timeline'}
              </h2>
              <p className="text-xs text-stone-500">
                {locale === 'ne' ? 'समयसीमा र चरणहरू' : 'Deadlines & Stages'}
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs border-t border-stone-100 dark:border-stone-800 pt-3">
            <div className="flex justify-between">
              <span className="text-stone-500">Application Deadline:</span>
              <span className="font-medium text-stone-800 dark:text-stone-200">
                {settings?.deadline
                  ? new Date(settings.deadline).toLocaleDateString()
                  : '30 April 2027'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Configured Stages:</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                {stagesCount} Stages
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Total Registered:</span>
              <span className="font-medium text-stone-800 dark:text-stone-200">
                {usersCount} Users
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-700 dark:text-amber-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                {locale === 'ne' ? 'सत्र र सुरक्षा' : 'Session & Security'}
              </h2>
              <p className="text-xs text-stone-500">Persistent httpOnly Cookie</p>
            </div>
          </div>

          <div className="space-y-2 text-xs border-t border-stone-100 dark:border-stone-800 pt-3">
            <div className="flex justify-between">
              <span className="text-stone-500">Cookie Lifetime:</span>
              <span className="font-medium text-stone-800 dark:text-stone-200">
                30 Days (Sliding Refresh)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Argon2 Lockout:</span>
              <span className="font-medium text-stone-800 dark:text-stone-200">
                Active (5 Max Attempts)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Role-Based Guard:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                Server-Enforced (RBAC)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Role-Specific Content Area */}
      {currentUser.role === 'APPLICANT' && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-bold font-heading text-stone-900 dark:text-stone-50 flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-600" />
                <span>{t.common.application}</span>
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                {userApplication?.status === 'SUBMITTED'
                  ? 'Your application has been submitted and is locked for Selection Committee evaluation.'
                  : 'Your application form progress is auto-saved every 15s. You can resume anytime before the deadline.'}
              </p>
            </div>

            {userApplication?.status === 'SUBMITTED' ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                {locale === 'ne' ? 'दर्ता सम्पन्न र सुरक्षित' : 'Submitted & Locked'}
              </span>
            ) : userApplication ? (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                {locale === 'ne' ? 'तयारी अवस्था' : 'Draft in Progress'}
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                {locale === 'ne' ? 'सुरु गरिएको छैन' : 'Not Started'}
              </span>
            )}
          </div>

          {userApplication?.status === 'SUBMITTED' ? (
            <div className="p-5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-300">
                    {locale === 'ne' ? 'आधिकारिक दर्ता नम्बर:' : 'Official Reference Number:'}
                  </span>
                  <div className="font-mono font-black text-xl text-emerald-800 dark:text-emerald-100 tracking-wider">
                    {userApplication.refNo}
                  </div>
                </div>
                <Link
                  href={`/apply/confirmation?ref=${userApplication.refNo}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs transition-all w-fit"
                >
                  <span>View Confirmation Card</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                Submitted on {userApplication.submittedAt ? new Date(userApplication.submittedAt).toLocaleString() : 'Recently'} • Stage: {userApplication.stage}
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {userApplication ? 'Resume your saved application draft' : 'Begin your Saathi Teachers Programme application'}
                </span>
                <p className="text-stone-500">
                  Estimated duration: 30-60 minutes • Bilingual English/Nepali accepted
                </p>
              </div>
              <Link
                href="/apply"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs transition-all shrink-0 w-fit"
              >
                <span>{userApplication ? 'Resume Application' : 'Start Application'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}

      {currentUser.role === 'REVIEWER' && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-bold font-heading text-stone-900 dark:text-stone-50 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span>{t.common.reviewQueue}</span>
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                {locale === 'ne'
                  ? 'छनोट समितिका सदस्यहरूका लागि तोकिएका आवेदनहरूको मूल्याङ्कन कक्ष।'
                  : 'Selection Committee Evaluation Dashboard for assigned applicant profiles.'}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Reviewer Portal Active
            </span>
          </div>

          <p className="text-xs text-stone-600 dark:text-stone-400">
            Reviewers log in via username (<code className="bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded">reviewer1</code>)
            or email, with server-enforced role authentication. Reviewer rubrics and assignment queues will connect to incoming applications in subsequent phases.
          </p>
        </div>
      )}

      {currentUser.role === 'ADMIN' && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-bold font-heading text-stone-900 dark:text-stone-50 flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-600" />
                <span>{t.common.adminPortal}</span>
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Full recruitment cycle configuration, configurable stages, and user provisioning.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs shadow-xs transition-colors"
              >
                <span>Open Admin Console</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-700">
              <span className="text-stone-500">Configurable Stages:</span>
              <div className="font-bold text-sm text-stone-900 dark:text-stone-100 mt-1">
                {stagesCount} Active Recruitment Stages
              </div>
            </div>
            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-700">
              <span className="text-stone-500">Cohort Year:</span>
              <div className="font-bold text-sm text-stone-900 dark:text-stone-100 mt-1">
                {settings?.cohortYear || 2027}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-700">
              <span className="text-stone-500">Candidates Directory:</span>
              <Link
                href="/admin/candidates"
                className="font-bold text-sm text-purple-700 dark:text-purple-400 hover:underline mt-1 flex items-center gap-1"
              >
                <span>Manage All Applicants</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ================= APPLICANT SELECTION JOURNEY & APPLICATION STATUS TRACKER ================= */}
      {currentUser.role === 'APPLICANT' && (
        <div className="space-y-6">
          {/* Main Stage Progression Stepper */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-4">
              <div>
                <h2 className="text-base font-bold font-heading text-stone-900 dark:text-stone-50 flex items-center gap-2">
                  <Workflow className="h-5 w-5 text-emerald-600" />
                  <span>
                    {locale === 'ne' ? 'छनोट यात्रा तथा आवेदनको हालको अवस्था' : 'Selection Journey & Application Status'}
                  </span>
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  {locale === 'ne'
                    ? 'तपाईंको आवेदन कुन चरणमा पुगेको छ र अर्को चरण के हो भन्ने विवरण।'
                    : 'Track where your application has reached in the official selection pipeline.'}
                </p>
              </div>

              {userApplication ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500 font-mono">
                    Ref: <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{userApplication.refNo}</strong>
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      userApplication.status === 'SHORTLISTED' || userApplication.status === 'FINAL_SELECTED'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : userApplication.status === 'ON_HOLD'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : userApplication.status === 'REJECTED'
                        ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    }`}
                  >
                    {userApplication.status === 'SUBMITTED'
                      ? locale === 'ne' ? 'रुजु हुँदै (In Review)' : 'Submitted & In Review'
                      : userApplication.status}
                  </span>
                </div>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                  {locale === 'ne' ? 'आवेदन दर्ता भएको छैन' : 'Application Not Yet Submitted'}
                </span>
              )}
            </div>

            {/* Stepper Pipeline */}
            {userApplication ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {stages.map((stg, idx) => {
                    const currentStageIndex = stages.findIndex((s) => s.code === userApplication.stage);
                    const isCompleted = idx < currentStageIndex;
                    const isCurrent = idx === currentStageIndex;
                    const isUpcoming = idx > currentStageIndex;

                    return (
                      <div
                        key={stg.code}
                        className={`relative rounded-xl p-3.5 border transition-all text-left flex flex-col justify-between ${
                          isCurrent
                            ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                            : isCompleted
                            ? 'bg-stone-50 dark:bg-stone-800/40 border-emerald-200 dark:border-emerald-900/60'
                            : 'bg-stone-50/50 dark:bg-stone-800/20 border-stone-200 dark:border-stone-800 opacity-60'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span
                              className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                isCompleted
                                  ? 'bg-emerald-600 text-white'
                                  : isCurrent
                                  ? 'bg-emerald-600 text-white ring-4 ring-emerald-200 dark:ring-emerald-900'
                                  : 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
                              }`}
                            >
                              {isCompleted ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                            </span>

                            {isCurrent && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-600 text-white">
                                {locale === 'ne' ? 'हालको चरण' : 'Active'}
                              </span>
                            )}
                          </div>

                          <h3 className="font-bold text-xs text-stone-900 dark:text-stone-100 leading-snug pt-1">
                            {locale === 'ne' ? stg.nameNe : stg.nameEn}
                          </h3>
                        </div>

                        <div className="pt-2 text-[10px] text-stone-500 font-medium">
                          {isCompleted
                            ? locale === 'ne' ? 'सम्पन्न ✓' : 'Completed'
                            : isCurrent
                            ? locale === 'ne' ? 'यहाँ प्रक्रियामा छ' : 'Current Evaluation'
                            : locale === 'ne' ? 'आगामी चरण' : 'Upcoming Stage'}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Current Stage Description & Next Steps Banner */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-emerald-600" />
                      <span>
                        {locale === 'ne'
                          ? `हालको चरण: ${stages.find((s) => s.code === userApplication.stage)?.nameNe || userApplication.stage}`
                          : `Current Stage: ${stages.find((s) => s.code === userApplication.stage)?.nameEn || userApplication.stage}`}
                      </span>
                    </span>
                    <p className="text-stone-600 dark:text-stone-300 text-[11px] leading-relaxed">
                      {locale === 'ne'
                        ? 'तपाईंको आवेदन छनोट समितिद्वारा मूल्याङ्कन भइरहेको छ। निर्णय हुनासाथ तपाईंलाई इमेल तथा यस पोर्टलमा तुरुन्त जानकारी गराइनेछ।'
                        : 'Your dossier is currently undergoing selection committee evaluation. Any decision or interview schedule will be notified via email and this portal.'}
                    </p>
                  </div>
                  <Link
                    href={`/apply/confirmation?ref=${userApplication.refNo}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-2xs transition-all shrink-0"
                  >
                    <span>{locale === 'ne' ? 'दर्ता रसिद हेर्नुहोस्' : 'View Submission Card'}</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center space-y-3 rounded-xl border border-dashed border-stone-200 dark:border-stone-800">
                <FileText className="h-8 w-8 text-stone-400 mx-auto" />
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-stone-800 dark:text-stone-200">
                    {locale === 'ne' ? 'कुनै सक्रिय आवेदन फेला परेन' : 'No Submitted Application'}
                  </h3>
                  <p className="text-xs text-stone-500 max-w-md mx-auto">
                    {locale === 'ne'
                      ? 'तपाईंले साथी शिक्षक कार्यक्रम २०२७ को लागि आवेदन भर्न सुरु गर्नुभएको छैन वा ड्राफ्ट अवस्थामा छ।'
                      : 'You have not yet submitted your application for Saathi Teachers Programme 2027.'}
                  </p>
                </div>
                <Link
                  href="/apply"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-all shadow-xs"
                >
                  <span>{locale === 'ne' ? 'आवेदन सुरु गर्नुहोस्' : 'Start Application Now'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Application Timeline & Official Notifications Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Official Stage History / Timeline */}
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-600" />
                <span>{locale === 'ne' ? 'चरण प्रगति इतिहास (Timeline)' : 'Selection Milestones Timeline'}</span>
              </h3>

              {userApplication?.histories && userApplication.histories.length > 0 ? (
                <div className="space-y-2.5">
                  {userApplication.histories.map((h) => (
                    <div
                      key={h.id}
                      className="p-3 rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-850 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-stone-800 dark:text-stone-200">
                          {h.fromStage} → <span className="text-emerald-700 dark:text-emerald-400 font-bold">{h.toStage}</span>
                        </div>
                        <p className="text-[11px] text-stone-500">{h.note || 'Milestone achieved'}</p>
                      </div>
                      <span className="text-[10px] text-stone-400 font-mono whitespace-nowrap">
                        {new Date(h.at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-400 py-4 text-center">
                  {userApplication
                    ? locale === 'ne'
                      ? 'तपाईंको आवेदन प्रारम्भिक चरणमा दर्ता भएको छ।'
                      : 'Application registered at preliminary screening stage.'
                    : locale === 'ne'
                    ? 'आवेदन दर्ता भएपछि यहाँ चरण प्रगति देखिनेछ।'
                    : 'Timeline updates will display here after application submission.'}
                </p>
              )}
            </div>

            {/* 2. Recent Notifications for User */}
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2">
                  <Bell className="h-4 w-4 text-emerald-600" />
                  <span>{locale === 'ne' ? 'आधिकारिक सूचनाहरू (Notifications)' : 'Official Notifications'}</span>
                </h3>
                <span className="text-[10px] font-mono text-stone-400">
                  {userNotifications.length} alerts
                </span>
              </div>

              {userNotifications.length > 0 ? (
                <div className="space-y-2">
                  {userNotifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 rounded-xl border text-xs space-y-1 ${
                        !n.readAt
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
                          : 'bg-stone-50/40 dark:bg-stone-800/30 border-stone-100 dark:border-stone-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-900 dark:text-stone-100">{n.title}</span>
                        <span className="text-[10px] text-stone-400 font-mono">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-600 dark:text-stone-300 leading-snug">
                        {n.body}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-400 py-4 text-center">
                  {locale === 'ne'
                    ? 'हाल कुनै नयाँ सूचना उपलब्ध छैन।'
                    : 'No notifications received yet.'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* For Administrators only: Show Security & Audit Log Preview */}
      {currentUser.role === 'ADMIN' && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <History className="h-4 w-4 text-emerald-600" />
              <span>
                {locale === 'ne' ? 'हालका सुरक्षा गतिविधिहरू (Audit Log)' : 'Recent Security Audit Events'}
              </span>
            </h2>
            <span className="text-xs text-stone-500">Server-Recorded</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-stone-50 dark:bg-stone-800 text-stone-500 uppercase text-[10px] font-semibold border-y border-stone-200 dark:border-stone-700">
                <tr>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Entity</th>
                  <th className="py-2.5 px-3">Actor / Email</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">IP / Device</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {recentAudits.map((a) => (
                  <tr key={a.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/30">
                    <td className="py-2 px-3 font-semibold text-emerald-700 dark:text-emerald-400">
                      {a.action}
                    </td>
                    <td className="py-2 px-3 text-stone-700 dark:text-stone-300">{a.entity}</td>
                    <td className="py-2 px-3 text-stone-800 dark:text-stone-200 truncate max-w-xs">
                      {a.actor?.email || a.actorId || 'Anonymous'}
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                        {a.role || 'GUEST'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-stone-500 font-mono text-[11px] truncate max-w-xs">
                      {a.ip}
                    </td>
                    <td className="py-2 px-3 text-stone-500 whitespace-nowrap">
                      {new Date(a.at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
