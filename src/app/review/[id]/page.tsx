import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/rbac';
import { getServerTranslations } from '@/lib/i18n/server';
import prisma from '@/lib/prisma';
import { ScoringRubric } from '@/components/review/ScoringRubric';
import { trackReviewerViewAction } from '@/app/api/review/actions';
import { countWords } from '@/lib/validations/application';
import {
  ArrowLeft,
  User,
  GraduationCap,
  Briefcase,
  BookOpen,
  FileCheck,
  CheckCircle2,
  Clock,
  History,
  FileText,
  MapPin,
  Calendar,
  Phone,
  Mail,
  Download,
} from 'lucide-react';

interface ReviewDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ReviewDetailPage({ params }: ReviewDetailPageProps) {
  const { id } = await params;
  const currentUser = await requireRole(['REVIEWER', 'ADMIN'], `/review/${id}`);
  const { t, locale } = await getServerTranslations();

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      applicant: true,
      reviews: {
        include: { reviewer: true },
        orderBy: { at: 'desc' },
      },
      histories: {
        include: { actor: true },
        orderBy: { at: 'desc' },
      },
      assignments: {
        include: { reviewer: true },
      },
    },
  });

  if (!application) {
    notFound();
  }

  // Audit log reviewer viewing application dossier
  await trackReviewerViewAction(application.id);

  // Active stages
  const stages = await prisma.stage.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
  });

  const availableStages = stages.map((s) => ({
    code: s.code,
    name: locale === 'ne' ? s.nameNe : s.nameEn,
  }));

  const appData = application.data
    ? typeof application.data === 'string'
      ? JSON.parse(application.data)
      : application.data
    : {};

  // Current reviewer's review if exists
  const myReview = application.reviews.find((r) => r.reviewerId === currentUser.id);
  const parsedScores = myReview?.scores
    ? typeof myReview.scores === 'string'
      ? JSON.parse(myReview.scores)
      : myReview.scores
    : null;

  return (
    <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-3">
          <Link
            href="/review"
            className="p-2 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-stone-600 dark:text-stone-300"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-stone-900 dark:text-stone-50">
                {application.applicant.name}
              </h1>
              <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {application.refNo}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              {application.submittedAt
                ? `${t.reviewer.table.submittedAt}: ${new Date(application.submittedAt).toLocaleString()}`
                : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            {t.stages[application.stage as keyof typeof t.stages] || application.stage}
          </span>
          {myReview ? (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{t.reviewer.scoring.alreadyReviewedBadge}</span>
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{t.reviewer.scoring.notReviewedBadge}</span>
            </span>
          )}
        </div>
      </div>

      {/* Main 2-Column Split: Dossier (Left) vs. Scoring Rubric (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ================= LEFT COLUMN: APPLICANT DOSSIER (7 COLS) ================= */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Biographical & Contact */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold font-heading text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <User className="h-4 w-4 text-emerald-600" />
              <span>{t.apply.sec1.title}</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-stone-500 block">{t.apply.sec1.fullName}:</span>
                <strong className="text-stone-900 dark:text-stone-100">{appData.fullName || application.applicant.name}</strong>
              </div>
              <div>
                <span className="text-stone-500 block">{t.apply.sec1.dob}:</span>
                <strong className="text-stone-900 dark:text-stone-100">{appData.dob || '—'}</strong>
              </div>
              <div>
                <span className="text-stone-500 block">{t.apply.sec1.gender}:</span>
                <strong className="text-stone-900 dark:text-stone-100 capitalize">{appData.gender || '—'}</strong>
              </div>
              <div>
                <span className="text-stone-500 block">{t.apply.sec1.nationality}:</span>
                <strong className="text-stone-900 dark:text-stone-100">{appData.nationality || 'Nepali'}</strong>
              </div>
              <div>
                <span className="text-stone-500 block">{t.apply.sec1.contactNumber}:</span>
                <strong className="text-stone-900 dark:text-stone-100">{appData.contactNumber || '—'}</strong>
              </div>
              <div>
                <span className="text-stone-500 block">{t.apply.sec1.email}:</span>
                <strong className="text-stone-900 dark:text-stone-100">{application.applicant.email}</strong>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 dark:border-stone-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-stone-500 block">{t.apply.sec1.currentAddress}:</span>
                <div className="text-stone-800 dark:text-stone-200">
                  {appData.currentMunicipality ? `${appData.currentMunicipality}-${appData.currentWard}, ${appData.currentProvince}` : '—'}
                </div>
              </div>
              <div>
                <span className="text-stone-500 block">{t.apply.sec1.permanentAddress}:</span>
                <div className="text-stone-800 dark:text-stone-200">
                  {appData.permanentMunicipality ? `${appData.permanentMunicipality}-${appData.permanentWard}, ${appData.permanentProvince}` : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Educational Background */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold font-heading text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-emerald-600" />
              <span>{t.apply.sec2.title}</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-stone-500 block">{t.apply.sec2.highestLevel}:</span>
                <strong className="text-stone-900 dark:text-stone-100">{appData.highestLevel || "Bachelor's Degree"}</strong>
              </div>
              <div>
                <span className="text-stone-500 block">{t.apply.sec2.fieldOfStudy}:</span>
                <strong className="text-stone-900 dark:text-stone-100">{appData.fieldOfStudy || '—'}</strong>
              </div>
              <div>
                <span className="text-stone-500 block">{t.apply.sec2.gradYear}:</span>
                <strong className="text-stone-900 dark:text-stone-100">{appData.gradYear || '—'}</strong>
              </div>
              <div className="sm:col-span-2">
                <span className="text-stone-500 block">{t.apply.sec2.university}:</span>
                <strong className="text-stone-900 dark:text-stone-100">{appData.university || '—'}</strong>
              </div>
              <div>
                <span className="text-stone-500 block">{t.apply.sec2.slcDivision}:</span>
                <strong className="text-stone-900 dark:text-stone-100">{appData.slcDivision || '—'}</strong>
              </div>
            </div>
          </div>

          {/* Section 3: Work & Volunteer Experiences */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold font-heading text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-emerald-600" />
              <span>{t.apply.sec3.title}</span>
            </h3>

            <div className="space-y-3">
              {Array.isArray(appData.experiences) && appData.experiences.length > 0 ? (
                appData.experiences.map((exp: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-700 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-semibold text-stone-900 dark:text-stone-100">
                      <span>{exp.organization}</span>
                      <span className="text-stone-500 text-[11px] font-normal">{exp.durationYears} {locale === 'ne' ? 'वर्ष' : 'years'}</span>
                    </div>
                    <div className="text-emerald-700 dark:text-emerald-400 font-medium">{exp.role}</div>
                    <p className="text-stone-600 dark:text-stone-400 text-[11px] leading-relaxed pt-1">
                      {exp.description}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-stone-400">No previous experience recorded (NA).</p>
              )}
            </div>
          </div>

          {/* Section 4: Essays (3 Long-form Prompts) */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-5">
            <h3 className="text-sm font-bold font-heading text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-emerald-600" />
              <span>{t.apply.sec4.title}</span>
            </h3>

            {/* Q1 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-stone-900 dark:text-stone-100">{t.apply.sec4.q1Title}</span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {countWords(appData.essay1 || '')} words
                </span>
              </div>
              <p className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 text-xs text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-wrap border border-stone-200/80 dark:border-stone-700">
                {appData.essay1 || 'No response provided.'}
              </p>
            </div>

            {/* Q2 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-stone-900 dark:text-stone-100">{t.apply.sec4.q2Title}</span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {countWords(appData.essay2 || '')} words
                </span>
              </div>
              <p className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 text-xs text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-wrap border border-stone-200/80 dark:border-stone-700">
                {appData.essay2 || 'No response provided.'}
              </p>
            </div>

            {/* Q3 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-stone-900 dark:text-stone-100">{t.apply.sec4.q3Title}</span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {countWords(appData.essay3 || '')} words
                </span>
              </div>
              <p className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 text-xs text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-wrap border border-stone-200/80 dark:border-stone-700">
                {appData.essay3 || 'No response provided.'}
              </p>
            </div>
          </div>

          {/* Section 5: Commitments & Attached CV */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold font-heading text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-emerald-600" />
              <span>{t.apply.sec5.title}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40">
                <span className="text-stone-500">2-Year Rural Commitment:</span>
                <div className="font-bold text-stone-900 dark:text-stone-100 uppercase">{appData.commitment2Years || 'Yes'}</div>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40">
                <span className="text-stone-500">24-Day Pre-Service Training:</span>
                <div className="font-bold text-stone-900 dark:text-stone-100 uppercase">{appData.preServiceTraining || 'Yes'}</div>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40">
                <span className="text-stone-500">Teaching Subject:</span>
                <div className="font-bold text-stone-900 dark:text-stone-100 capitalize">{appData.teachingSubject || 'General'}</div>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 flex items-center justify-between">
                <div>
                  <span className="text-stone-500 block">CV Attachment:</span>
                  <div className="font-bold text-stone-900 dark:text-stone-100 truncate max-w-[140px]">
                    {appData.cvFileName || 'Uploaded'}
                  </div>
                </div>
                {appData.cvFileName && (
                  <a
                    href={`/api/files/${encodeURIComponent(appData.cvFileName)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-colors shrink-0"
                  >
                    <Download className="h-3 w-3" />
                    <span>Download</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Stage Progression & Review History Audit */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold font-heading text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <History className="h-4 w-4 text-stone-500" />
              <span>{t.reviewer.scoring.auditHistoryTitle}</span>
            </h3>

            {application.histories.length > 0 ? (
              <div className="space-y-2 text-xs">
                {application.histories.map((h) => (
                  <div key={h.id} className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-stone-900 dark:text-stone-100">
                        {h.fromStage} → {h.toStage}
                      </span>
                      <p className="text-[11px] text-stone-500">{h.note || 'Stage updated'}</p>
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {new Date(h.at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-400">{t.reviewer.scoring.noHistory}</p>
            )}
          </div>
        </div>

        {/* ================= RIGHT COLUMN: SCORING RUBRIC (5 COLS) ================= */}
        <div className="lg:col-span-5 sticky top-20">
          <ScoringRubric
            applicationId={application.id}
            applicantName={application.applicant.name}
            refNo={application.refNo}
            currentStage={application.stage}
            existingReview={
              myReview
                ? {
                    id: myReview.id,
                    scores: parsedScores || {},
                    totalScore: myReview.totalScore,
                    comment: myReview.comment,
                    recommendation: myReview.recommendation,
                    isLocked: myReview.isLocked,
                    status: myReview.status,
                    adminDecision: myReview.adminDecision,
                    returnReason: myReview.returnReason,
                    unlockedReason: myReview.unlockedReason,
                    submittedAt: myReview.submittedAt ? myReview.submittedAt.toISOString() : null,
                    stage: myReview.stage,
                  }
                : null
            }
            availableStages={availableStages}
            isReviewerOrAdmin={true}
            isAdmin={currentUser.role === 'ADMIN'}
          />
        </div>
      </div>
    </div>
  );
}
