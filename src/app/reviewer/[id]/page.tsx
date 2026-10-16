import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/rbac';
import { getServerTranslations } from '@/lib/i18n/server';
import prisma from '@/lib/prisma';
import { ScoringRubric } from '@/components/review/ScoringRubric';
import { CvActionButtons } from '@/components/common/CvActionButtons';
import { PhoneInterviewCallWidget } from '@/components/review/PhoneInterviewCallWidget';
import { AscCandidateDecisionWidget } from '@/components/review/AscCandidateDecisionWidget';
import { HoldResolutionWidget } from '@/components/review/HoldResolutionWidget';
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
  AlertTriangle,
} from 'lucide-react';

interface ReviewDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface ApplicantExperience {
  organization?: string;
  role?: string;
  durationYears?: string | number;
  description?: string;
}

interface RejectionDetails {
  stageAtRejection?: string;
  categoryNameEn?: string;
  categoryNameNe?: string;
  rejectedAt?: string;
  feedbackNote?: string;
}

interface ApplicationPayload {
  fullName?: string;
  dob?: string;
  gender?: string;
  nationality?: string;
  contactNumber?: string;
  phone?: string;
  currentProvince?: string;
  currentMunicipality?: string;
  currentWard?: string;
  permanentProvince?: string;
  permanentMunicipality?: string;
  permanentWard?: string;
  highestLevel?: string;
  fieldOfStudy?: string;
  gradYear?: string;
  university?: string;
  slcDivision?: string;
  experiences?: ApplicantExperience[];
  essay1?: string;
  essay2?: string;
  essay3?: string;
  commitment2Years?: string;
  preServiceTraining?: string;
  teachingSubject?: string;
  cvFileName?: string;
  cvFileUrl?: string;
  rejectionDetails?: RejectionDetails;
  phoneInterviewSchedule?: import('@/lib/constants/applicationReview').PhoneInterviewSchedule;
  ascBooking?: import('@/lib/constants/applicationReview').AscBooking;
}

export default async function ReviewDetailPage({ params }: ReviewDetailPageProps) {
  const { id } = await params;
  const currentUser = await requireRole(['REVIEWER', 'ADMIN'], `/reviewer/${id}`);
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

  // Reviewer assignment state (Admins have full superuser rights)
  const isAssigned = application.assignments.some((a) => a.reviewerId === currentUser.id);
  const isAssignedReviewer = currentUser.role === 'ADMIN' || isAssigned;

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

  const appData: ApplicationPayload = application.data
    ? typeof application.data === 'string'
      ? JSON.parse(application.data)
      : (application.data as ApplicationPayload)
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
            href={currentUser.role === 'ADMIN' ? `/admin/candidates/${application.id}` : '/reviewer'}
            className="p-2 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-stone-600 dark:text-stone-300"
            title={currentUser.role === 'ADMIN' ? 'Back to Candidate Dossier' : 'Back to Review Queue'}
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
          {application.status === 'ON_HOLD' && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
              <span>⏸ {locale === 'ne' ? 'प्रतिक्षारत / होल्ड' : 'On Hold'}</span>
            </span>
          )}
          {application.status === 'REJECTED' && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
              <span>✕ {locale === 'ne' ? 'अस्वीकृत' : 'Rejected'}</span>
            </span>
          )}
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

      {/* Unassigned Candidate Review Info Banner */}
      {!isAssignedReviewer && (
        <div className="flex items-start sm:items-center gap-3 p-3.5 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 text-xs shadow-2xs">
          <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5 sm:mt-0" />
          <div className="flex-1">
            <span className="font-bold">
              {locale === 'ne' ? 'खुला अवलोकन मोड (Open Review Mode): ' : 'Open Review Mode: '}
            </span>
            <span className="text-blue-800 dark:text-blue-300">
              {locale === 'ne'
                ? 'तपाईं यस उम्मेदवारको सम्पूर्ण विवरण र कागजातहरू अध्ययन गर्न सक्नुहुन्छ। तर आधिकारिक मूल्याङ्कन अंक दर्ता गरी व्यवस्थापकसमक्ष पेश गर्ने अधिकार तोकिएका समीक्षकलाई मात्र सुरक्षित छ।'
                : 'You are reviewing this candidate dossier. Official rubric scoring and submission to the administrator is reserved for the assigned reviewer.'}
            </span>
          </div>
        </div>
      )}

      {/* On-Hold Simple, Direct Authority Widget */}
      {application.status === 'ON_HOLD' && (
        <HoldResolutionWidget
          applicationId={application.id}
          refNo={application.refNo}
          currentStage={application.stage}
          locale={locale}
          canManage={currentUser.role === 'ADMIN'}
        />
      )}

      {/* Selection Concluded Contextual Banner */}
      {application.status === 'REJECTED' && appData.rejectionDetails && (
        <div className="p-4 rounded-2xl border border-rose-300 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/40 space-y-2 text-xs shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-rose-200 dark:border-rose-900/80">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <strong className="text-rose-950 dark:text-rose-100 font-bold">
                {locale === 'ne' ? 'यस कोहोर्टका लागि आवेदन अस्वीकृत' : 'Application Rejected for STP 2027'}
              </strong>
            </div>
            <span className="px-2.5 py-0.5 rounded-full font-mono text-[11px] bg-rose-200/80 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200 font-bold">
              {locale === 'ne' ? appData.rejectionDetails.categoryNameNe : appData.rejectionDetails.categoryNameEn}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-rose-900 dark:text-rose-200 pt-1">
            <div>
              <span className="text-rose-700 dark:text-rose-400 block text-[11px]">
                {locale === 'ne' ? 'पुगेको अन्तिम चरण र मिति:' : 'Stage at Conclusion & Date:'}
              </span>
              <span>
                {t.stages[appData.rejectionDetails.stageAtRejection as keyof typeof t.stages] || appData.rejectionDetails.stageAtRejection} •{' '}
                {appData.rejectionDetails.rejectedAt ? new Date(appData.rejectionDetails.rejectedAt).toLocaleDateString() : '—'}
              </span>
            </div>
            <div>
              <span className="text-rose-700 dark:text-rose-400 block text-[11px]">
                {locale === 'ne' ? 'समिति सारांश / टिप्पणी:' : 'Committee Summary Note:'}
              </span>
              <span className="font-medium italic">
                {appData.rejectionDetails.feedbackNote || 'Concluded following standardized committee review.'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main 2-Column Split: Dossier (Left) vs. Scoring Rubric (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ================= LEFT COLUMN: APPLICANT DOSSIER (7 COLS) ================= */}
        <div className="lg:col-span-7 space-y-6">
          {/* Phone Screening Interview Calling Widget */}
          {(application.stage === 'PHONE_INTERVIEW' || appData.phoneInterviewSchedule) && (
            <PhoneInterviewCallWidget
              applicationId={application.id}
              candidateName={application.applicant.name}
              refNo={application.refNo}
              phoneNumber={appData.contactNumber || appData.phone || null}
              email={application.applicant.email}
              schedule={appData.phoneInterviewSchedule || null}
              currentStage={application.stage}
              currentStatus={application.status}
              locale={locale}
              userRole={currentUser.role as 'REVIEWER' | 'ADMIN'}
            />
          )}

          {/* Assessment Saathi Candidates (ASC) Decision & Evaluation Widget */}
          {(application.stage === 'ASC' || appData.ascBooking) && (
            <AscCandidateDecisionWidget
              applicationId={application.id}
              candidateName={application.applicant.name}
              refNo={application.refNo}
              booking={appData.ascBooking || null}
              currentStage={application.stage}
              currentStatus={application.status}
              locale={locale}
              userRole={currentUser.role as 'REVIEWER' | 'ADMIN'}
            />
          )}

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
                appData.experiences.map((exp: ApplicantExperience, idx: number) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-700 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-semibold text-stone-900 dark:text-stone-100">
                      <span>{exp.organization || 'Organization'}</span>
                      <span className="text-stone-500 text-[11px] font-normal">{exp.durationYears || '—'} {locale === 'ne' ? 'वर्ष' : 'years'}</span>
                    </div>
                    <div className="text-emerald-700 dark:text-emerald-400 font-medium">{exp.role || '—'}</div>
                    <p className="text-stone-600 dark:text-stone-400 text-[11px] leading-relaxed pt-1">
                      {exp.description || ''}
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
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <span className="text-stone-500 block text-xs">CV / Resume Attachment:</span>
                  <div className="font-bold text-stone-900 dark:text-stone-100 truncate max-w-xs" title={appData.cvFileName || 'Candidate CV'}>
                    {appData.cvFileName || 'Candidate_CV.pdf'}
                  </div>
                </div>
                <CvActionButtons
                  fileName={appData.cvFileName}
                  fileUrl={appData.cvFileUrl}
                  candidateName={application.applicant.name}
                  refNo={application.refNo}
                  subject={appData.teachingSubject}
                />
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
            isAssignedReviewer={isAssignedReviewer}
          />
        </div>
      </div>
    </div>
  );
}
