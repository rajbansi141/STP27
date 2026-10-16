'use client';

import React, { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  FileText,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  Bell,
  HelpCircle,
  Mail,
  Phone,
  AlertCircle,
  GraduationCap,
  Send,
  Loader2,
  XCircle,
  ChevronRight,
  Calendar,
  MapPin,
  ExternalLink,
  ShieldCheck,
  CheckCircle,
  ArrowUpRight,
  MessageSquare,
  BookmarkCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DeadlineCountdownCard } from '@/components/applicant/DeadlineCountdownCard';
import { AscSlotBookingWidget } from '@/components/applicant/AscSlotBookingWidget';
import { submitApplicantClarificationAction } from '@/app/api/application/actions';
import { AscBooking } from '@/lib/constants/applicationReview';

interface StageData {
  id: string;
  code: string;
  nameEn: string;
  nameNe: string;
  order: number;
}

interface NotificationData {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

interface HistoryData {
  id: string;
  fromStage: string;
  toStage: string;
  note: string | null;
  at: string;
}

interface ApplicationData {
  id: string;
  refNo: string;
  status: string;
  stage: string;
  submittedAt: string | null;
  data: any;
  draftData: any;
  histories: HistoryData[];
}

interface ApplicantOverviewProps {
  user: {
    name: string;
    email: string;
  };
  application: ApplicationData | null;
  stages: StageData[];
  notifications: NotificationData[];
  settings: {
    deadline: string | null;
    cycleLabel: string;
    cohortYear: number;
  };
  locale: string;
}

// Stage Information & Descriptions for Candidates
const STAGE_GUIDES: Record<
  string,
  {
    titleEn: string;
    titleNe: string;
    subtitleEn: string;
    subtitleNe: string;
    descriptionEn: string;
    descriptionNe: string;
    nextStepEn: string;
    nextStepNe: string;
  }
> = {
  APPLICATION: {
    titleEn: 'Application Screening',
    titleNe: 'दरखास्त फारम छानबिन',
    subtitleEn: 'Dossier Verification & Eligibility',
    subtitleNe: 'शैक्षिक योग्यता तथा प्रारम्भिक रुजु',
    descriptionEn:
      'The Selection Committee is evaluating your academic qualifications, verified transcripts, and leadership motivation essays against fellowship benchmarks.',
    descriptionNe:
      'छनोट समितिद्वारा तपाईंको शैक्षिक योग्यता, कागजात र अभिप्रेरणा पत्रको विस्तृत मूल्याङ्कन भइरहेको छ।',
    nextStepEn:
      'Successful applicants will be shortlisted and invited for the telephonic screening call.',
    nextStepNe:
      'छानबिनमा उत्तीर्ण उम्मेदवारहरूलाई टेलिफोन अन्तर्वार्ताका लागि सूचीकृत गरिनेछ।',
  },
  PHONE_INTERVIEW: {
    titleEn: 'Phone Screening Interview',
    titleNe: 'टेलिफोन अन्तर्वार्ता',
    subtitleEn: 'Communication & Fellowship Motivation',
    subtitleNe: 'सञ्चार क्षमता तथा उत्प्रेरणा जाँच',
    descriptionEn:
      'A structured 15-minute phone interview conducted by the recruitment team to explore your background, interpersonal communication, and commitment to rural public education.',
    descriptionNe:
      'भर्ती टोलीद्वारा १५ मिनेटको फोन अन्तर्वार्ता लिइनेछ, जसमा तपाईंको पृष्ठभूमि र सार्वजनिक शिक्षाप्रतिको प्रतिबद्धताको छलफल हुनेछ।',
    nextStepEn:
      'Please ensure your phone is kept switched on and accessible during official office hours.',
    nextStepNe:
      'कृपया कार्यालय समयमा आफ्नो मोबाइल फोन सम्पर्कमा रहने गरी खुला राख्नुहोला।',
  },
  ASC: {
    titleEn: 'Assessment of Saathi Candidates (ASC)',
    titleNe: 'साथी उम्मेदवार मूल्याङ्कन (ASC)',
    subtitleEn: 'In-Person Assessment Center & Micro-Teaching',
    subtitleNe: 'प्रत्यक्ष व्यवहारिक मूल्याङ्कन र नमुना शिक्षण',
    descriptionEn:
      'An intensive in-person assessment center session featuring collaborative group tasks, situational judgment exercises, and a 5-minute micro-teaching demonstration.',
    descriptionNe:
      'छनोट केन्द्रमा सामूहिक छलफल, व्यवहारिक समस्या समाधान र ५ मिनेटको नमुना शिक्षण अभ्यास सम्पन्न हुनेछ।',
    nextStepEn:
      'Review your scheduled ASC date, reporting time (08:30 AM NPT), and download your official Admit Pass.',
    nextStepNe:
      'तोकिएको मिति र समय (बिहान ८:३० बजे) मा आफ्नो आधिकारिक प्रवेशपत्र लिई उपस्थित हुनुहोला।',
  },
  PARENTS_MEET: {
    titleEn: 'Parents’ Meet Event',
    titleNe: 'अभिभावक भेटघाट कार्यक्रम',
    subtitleEn: 'Family Orientation & Fellowship Dialogue',
    subtitleNe: 'पारिवारिक परामर्श तथा कार्यक्रम अभिमुखीकरण',
    descriptionEn:
      'Congratulations on advancing to Stage 4! The Parents’ Meet is an essential consultative event where prospective fellows and their guardians meet the Saathi leadership team to discuss rural school deployments, living arrangements, and family support.',
    descriptionNe:
      'बधाई छ, तपाईं चौथो चरणमा पुग्नुभएको छ! यो कार्यक्रममा उम्मेदवार र उहाँका अभिभावकहरूसँग ग्रामीण विद्यालय पदस्थापना, सुरक्षा र सहकार्यबारे नेतृत्व टोलीसँग प्रत्यक्ष छलफल गरिन्छ।',
    nextStepEn:
      'The Admissions Desk will send venue details and meeting schedules directly via email and portal announcements.',
    nextStepNe:
      'भेटघाटको समय, स्थान र तालिका छिट्टै इमेल तथा यसै पोर्टलमा उपलब्ध गराइनेछ।',
  },
  SAATHI_SCHOOL: {
    titleEn: '24-Day Saathi School',
    titleNe: '२४-दिने साथी स्कुल',
    subtitleEn: 'Residential Pre-Service Teaching Institute',
    subtitleNe: 'आवासीय पूर्व-सेवा शिक्षण तालिम',
    descriptionEn:
      'A rigorous 24-day residential training institute covering experiential pedagogy, active classroom management, curriculum mapping, and community immersion.',
    descriptionNe:
      '२४ दिने सघन आवासीय तालिम, जसमा बालकेन्द्रित शिक्षण विधि, कक्षाकोठा व्यवस्थापन र समुदायमा आधारित परियोजना सिकाइन्छ।',
    nextStepEn:
      'Detailed onboarding packs, packing checklists, and institute logistics will be shared upon final selection.',
    nextStepNe:
      'तालिमका लागि आवश्यक सामग्री र विस्तृत विवरण छनोट पश्चात उपलब्ध गराइनेछ।',
  },
  PLACEMENT: {
    titleEn: 'Fellowship Placement',
    titleNe: 'विद्यालय पदस्थापना',
    subtitleEn: 'Partner Community School Induction',
    subtitleNe: 'साझेदार सामुदायिक विद्यालयमा नियुक्ति',
    descriptionEn:
      'Formal school assignment and deployment into partner public community schools across rural Nepal for your two-year fellowship journey.',
    descriptionNe:
      'नेपालका ग्रामीण सामुदायिक विद्यालयहरूमा दुई वर्षका लागि आधिकारिक शिक्षक फेलो पदस्थापना।',
    nextStepEn:
      'Fellows will be accompanied to their respective host communities for local induction and school integration.',
    nextStepNe:
      'सम्बन्धित समुदाय र विद्यालयमा सहजीकरणसहित स्वागत गरिनेछ।',
  },
};

export function ApplicantOverview({
  user,
  application,
  stages,
  notifications,
  settings,
  locale,
}: ApplicantOverviewProps) {
  const isNe = locale === 'ne';
  const isSubmitted = Boolean(application && application.status !== 'DRAFT');
  const isDraft = !application || application.status === 'DRAFT';

  // Copy reference state
  const [copiedRef, setCopiedRef] = useState(false);
  const handleCopyRef = () => {
    if (!application?.refNo) return;
    navigator.clipboard.writeText(application.refNo);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  // Safe parse application data
  const appData = useMemo(() => {
    if (!application?.data) return null;
    return typeof application.data === 'string'
      ? JSON.parse(application.data)
      : application.data;
  }, [application?.data]);

  // Clarification reply state
  const [clarificationReply, setClarificationReply] = useState('');
  const [clarificationSuccess, setClarificationSuccess] = useState<string | null>(null);
  const [clarificationError, setClarificationError] = useState<string | null>(null);
  const [isPendingClarification, startClarificationTransition] = useTransition();

  const handleSendClarification = () => {
    if (!clarificationReply.trim()) return;
    setClarificationError(null);
    startClarificationTransition(async () => {
      const res = await submitApplicantClarificationAction(clarificationReply);
      if (res.success) {
        setClarificationSuccess(res.message || 'Clarification submitted.');
      } else {
        setClarificationError(res.message || 'Failed to submit clarification.');
      }
    });
  };

  // Resolve Stage Order & Total Stages
  const currentStageCode = application?.stage || 'APPLICATION';
  const currentStageObj = stages.find((s) => s.code === currentStageCode);
  const currentStageOrder = currentStageObj?.order || 1;
  const totalStages = stages.length || 6;

  // Extract application metadata cleanly
  const appliedSubject =
    appData?.teachingSubject
      ? appData.teachingSubject.charAt(0).toUpperCase() + appData.teachingSubject.slice(1)
      : isNe
      ? 'शिक्षक फेलो'
      : 'Fellowship Fellow';

  const highestDegree = appData?.highestLevel || appData?.highestDegree || (isNe ? 'स्नातक' : "Bachelor's Degree");
  const submissionDateFormatted = application?.submittedAt
    ? new Date(application.submittedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

  // Stage Guide for current stage
  const currentGuide = STAGE_GUIDES[currentStageCode] || {
    titleEn: currentStageObj?.nameEn || 'Current Stage',
    titleNe: currentStageObj?.nameNe || 'वर्तमान चरण',
    subtitleEn: 'Selection Pipeline',
    subtitleNe: 'छनोट प्रक्रिया',
    descriptionEn: 'Your application is progressing through this official stage of the fellowship recruitment.',
    descriptionNe: 'तपाईंको आवेदन यस चरण अन्तर्गत मूल्याङ्कनको प्रक्रियामा रहेको छ।',
    nextStepEn: 'Official updates will be posted to your portal dashboard.',
    nextStepNe: 'नयाँ जानकारी यसै पोर्टलमा उपलब्ध गराइनेछ।',
  };

  // Combined timeline of histories and notifications
  const timelineEvents = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      detail: string | null;
      date: string;
      type: 'history' | 'notification';
    }> = [];

    if (application?.histories) {
      application.histories.forEach((h) => {
        let title = `Stage updated to ${h.toStage.replace(/_/g, ' ')}`;
        if (h.toStage === 'APPLICATION' && h.fromStage === 'DRAFT') {
          title = isNe ? 'आवेदन सफलतापूर्वक दर्ता भयो' : 'Application Lodged & Locked';
        } else if (h.toStage === 'ASC') {
          title = isNe ? 'साथी उम्मेदवार मूल्याङ्कन (ASC) मा छनोट' : 'Advanced to Assessment of Saathi Candidates (ASC)';
        } else if (h.toStage === 'PARENTS_MEET') {
          title = isNe ? 'अभिभावक भेटघाट कार्यक्रममा छनोट' : 'Advanced to Parents’ Meet Event';
        } else if (h.toStage === 'PHONE_INTERVIEW') {
          title = isNe ? 'टेलिफोन अन्तर्वार्ता चरणमा सिफारिस' : 'Shortlisted for Phone Screening Interview';
        }

        list.push({
          id: `hist-${h.id}`,
          title,
          detail: h.note || null,
          date: h.at,
          type: 'history',
        });
      });
    }

    if (notifications) {
      notifications.forEach((n) => {
        // Skip duplicate raw notifications if they mirror stage history exactly
        const isMirror = list.some((item) => n.title.includes(item.title));
        if (!isMirror) {
          // Format clean title without clumsy slashes
          let cleanTitle = n.title;
          if (cleanTitle.includes('/')) {
            const parts = cleanTitle.split('/');
            cleanTitle = isNe ? parts[1].trim() : parts[0].trim();
          }

          list.push({
            id: `notif-${n.id}`,
            title: cleanTitle,
            detail: n.body,
            date: n.createdAt,
            type: 'notification',
          });
        }
      });
    }

    // Sort descending by date
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [application?.histories, notifications, isNe]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* ================= 1. REFINED HEADER CARD ================= */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <Sparkles className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <span>{settings.cycleLabel || 'Saathi Teachers Programme 2027'}</span>
            </span>

            {application?.status === 'REJECTED' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                <XCircle className="h-3 w-3" />
                <span>{isNe ? 'छनोट सम्पन्न' : 'Selection Concluded'}</span>
              </span>
            ) : application?.status === 'ON_HOLD' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <Clock className="h-3 w-3 text-amber-600" />
                <span>{isNe ? 'समिति समीक्षामा (प्रतिक्षारत)' : 'Under Committee Review'}</span>
              </span>
            ) : isSubmitted ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                <span>{isNe ? 'सक्रिय उम्मेदवार' : 'Active Candidate'}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <Clock className="h-3 w-3" />
                <span>{isNe ? 'आवेदन ड्राफ्ट' : 'Draft in Progress'}</span>
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-stone-900 dark:text-stone-50 tracking-tight">
            {isNe ? `नमस्ते, ${user.name}` : `Welcome back, ${user.name}`}
          </h1>

          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
            {application?.status === 'ON_HOLD'
              ? isNe
                ? 'तपाईंको आवेदन प्रारम्भिक योग्यता पूरा गरी हाल समिति छलफलमा रहेको छ।'
                : 'Your application has met eligibility benchmarks and is currently under committee review.'
              : isSubmitted
              ? isNe
                ? `तपाईंको आवेदन सफलतापूर्वक चरण ${currentStageOrder}: ${currentGuide.titleNe} मा पुगेको छ।`
                : `Your fellowship application is actively in Stage ${currentStageOrder}: ${currentGuide.titleEn}.`
              : isNe
              ? 'साथी शिक्षक कार्यक्रम २०२७ मा सहभागी हुन आफ्नो आवेदन फारम पूरा गर्नुहोस्।'
              : 'Complete your application form to be considered for Cohort 2027.'}
          </p>
        </div>

        {/* Header Right: Ref & Quick Action */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0 pt-2 md:pt-0">
          {application?.refNo && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs">
              <span className="text-[11px] font-medium text-stone-400 uppercase">Ref:</span>
              <span className="font-mono font-bold text-stone-800 dark:text-stone-200">
                {application.refNo}
              </span>
              <button
                type="button"
                onClick={handleCopyRef}
                className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                title="Copy Reference"
              >
                {copiedRef ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          )}

          {isSubmitted && application ? (
            <Link
              href={`/apply/confirmation?ref=${application.refNo}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:hover:bg-white dark:text-stone-900 transition-all shadow-2xs"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>{isNe ? 'आवेदन विवरण' : 'View Application'}</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/apply"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all shadow-2xs"
              >
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                <span>{isNe ? 'योग्यता जाँच' : 'Check Eligibility'}</span>
              </Link>
              <Link
                href="/apply"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-all shadow-xs"
              >
                <span>{isDraft ? (isNe ? 'फारम जारी राख्नुहोस्' : 'Resume Application') : (isNe ? 'आवेदन सुरु गर्नुहोस्' : 'Start Application')}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Deadline Countdown if Draft */}
      {!isSubmitted && settings.deadline && (
        <DeadlineCountdownCard deadlineDate={settings.deadline} />
      )}

      {/* ================= 2. THE REAL 6-STAGE FELLOWSHIP JOURNEY ================= */}
      {isSubmitted && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
          {/* Section Header */}
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <BookmarkCheck className="h-4 w-4 text-emerald-600" />
                <span>{isNe ? 'छनोट यात्रा तथा चरणहरू' : 'Fellowship Selection Pipeline'}</span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {isNe
                  ? `६ चरणहरू मध्ये तपाईं हाल चरण ${currentStageOrder} मा हुनुहुन्छ`
                  : `Currently in Stage ${currentStageOrder} of ${totalStages}`}
              </p>
            </div>
            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              Stage {currentStageOrder} of {totalStages}
            </span>
          </div>

          {/* Clean Stepper Pipeline */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            {stages.map((stg) => {
              const isPast = stg.order < currentStageOrder;
              const isCurrent = stg.order === currentStageOrder;
              const isFuture = stg.order > currentStageOrder;

              return (
                <div
                  key={stg.code}
                  className={`relative p-3 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                      : isPast
                      ? 'bg-stone-50/60 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700'
                      : 'bg-white dark:bg-stone-900 border-dashed border-stone-200 dark:border-stone-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold font-mono text-stone-400">
                      0{stg.order}
                    </span>
                    {isPast ? (
                      <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : isCurrent ? (
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600" />
                      </span>
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-stone-300 dark:bg-stone-700" />
                    )}
                  </div>

                  <div className="font-semibold text-xs text-stone-900 dark:text-stone-100 line-clamp-1">
                    {isNe ? stg.nameNe.split('(')[0] : stg.nameEn.split('(')[0]}
                  </div>

                  <div className="text-[10px] text-stone-500 mt-0.5">
                    {isPast
                      ? isNe
                        ? 'सम्पन्न'
                        : 'Completed'
                      : isCurrent
                      ? isNe
                        ? 'वर्तमान चरण'
                        : 'Active Stage'
                      : isNe
                      ? 'आगामी'
                      : 'Upcoming'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ================= 3. ACTIVE STAGE SPOTLIGHT CARD ================= */}
          <div className="p-4 sm:p-5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400">
                    {isNe ? 'वर्तमान चरण विवरण' : 'Active Stage Guidance'}
                  </div>
                  <h3 className="font-heading font-bold text-sm sm:text-base text-stone-900 dark:text-stone-100">
                    {isNe ? currentGuide.titleNe : currentGuide.titleEn}
                  </h3>
                </div>
              </div>

              <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                {isNe ? currentGuide.subtitleNe : currentGuide.subtitleEn}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
              {isNe ? currentGuide.descriptionNe : currentGuide.descriptionEn}
            </p>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs">
              <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="text-stone-600 dark:text-stone-300">
                <strong>{isNe ? 'आगामी कदम:' : 'Next Step:'}</strong>{' '}
                {isNe ? currentGuide.nextStepNe : currentGuide.nextStepEn}
              </span>
            </div>

          </div>
        </div>
      )}

      {/* ================= ASC SLOT BOOKING & ADMIT PASS HUB ================= */}
      {(currentStageCode === 'ASC' || Boolean(appData?.ascBooking)) && application && (
        <AscSlotBookingWidget
          applicationId={application.id}
          refNo={application.refNo}
          candidateName={user.name}
          email={user.email}
          phone={appData?.contactNumber || appData?.phone}
          subject={appliedSubject}
          address={appData?.currentProvince ? `${appData.currentMunicipality}, ${appData.currentProvince}` : null}
          degree={highestDegree}
          existingBooking={appData?.ascBooking || null}
          locale={locale}
        />
      )}

      {/* ================= 4. CLARIFICATION REQUEST ALERT (IF PENDING) ================= */}
      {isSubmitted && appData?.clarificationRequest && (
        <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs uppercase tracking-wider">
            <AlertCircle className="h-4 w-4" />
            <span>{isNe ? 'छनोट समितिबाट थप स्पष्टीकरण अनुरोध' : 'Selection Committee Clarification Request'}</span>
          </div>

          <p className="text-xs sm:text-sm text-stone-800 dark:text-stone-200 bg-white dark:bg-stone-900 p-3.5 rounded-xl border border-amber-200 dark:border-stone-700 leading-relaxed">
            {appData.clarificationRequest.message}
          </p>

          {appData.clarificationRequest.response || clarificationSuccess ? (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                <span>{isNe ? 'स्पष्टीकरण सुरक्षित भयो' : 'Your response was submitted to the committee'}</span>
              </div>
              <p className="text-xs text-stone-700 dark:text-stone-300">
                {clarificationSuccess ? clarificationReply : appData.clarificationRequest.response}
              </p>
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              <textarea
                rows={3}
                value={clarificationReply}
                onChange={(e) => setClarificationReply(e.target.value)}
                placeholder={isNe ? 'यहाँ स्पष्टीकरण लेख्नुहोस्...' : 'Type your clarification here...'}
                disabled={isPendingClarification}
                className="w-full text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {clarificationError && (
                <p className="text-xs text-red-600 font-medium">{clarificationError}</p>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSendClarification}
                  disabled={isPendingClarification || !clarificationReply.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-700 hover:bg-amber-800 text-white shadow-xs disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isPendingClarification ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span>{isNe ? 'स्पष्टीकरण पेश गर्नुहोस्' : 'Submit Response'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= 5. TWO-COLUMN BALANCED BOTTOM SECTION ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width) - Updates & Timeline */}
        <div className="lg:col-span-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Bell className="h-4 w-4 text-emerald-600" />
              <span>{isNe ? 'प्रगति तथा आधिकारिक सूचनाहरू' : 'Official Updates & Milestones'}</span>
            </h3>
            <span className="text-[11px] font-mono text-stone-400">
              {timelineEvents.length} {isNe ? 'प्रविष्टिहरू' : 'events'}
            </span>
          </div>

          {timelineEvents.length === 0 ? (
            <div className="py-10 text-center text-xs text-stone-400 space-y-1">
              <Clock className="h-6 w-6 mx-auto text-stone-300 dark:text-stone-600" />
              <p>{isNe ? 'हाल कुनै नयाँ गतिविधि छैन।' : 'No updates recorded yet. Milestones will appear here.'}</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200 dark:before:bg-stone-800">
              {timelineEvents.map((evt) => (
                <div key={evt.id} className="relative space-y-1">
                  {/* Timeline bullet dot */}
                  <div
                    className={`absolute -left-6 top-1 h-3 w-3 rounded-full border-2 ring-2 ring-white dark:ring-stone-900 ${
                      evt.type === 'history'
                        ? 'bg-emerald-500 border-emerald-600'
                        : 'bg-blue-500 border-blue-600'
                    }`}
                  />

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                      {evt.title}
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono shrink-0">
                      {new Date(evt.date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {evt.detail && (
                    <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed bg-stone-50 dark:bg-stone-800/40 p-2.5 rounded-xl border border-stone-200/60 dark:border-stone-800">
                      {evt.detail}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column (1/3 width) - Application Details & Admissions Support */}
        <div className="space-y-4">
          {/* Compact Application Snapshot Card */}
          {isSubmitted && (
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs space-y-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center justify-between">
                <span>{isNe ? 'आवेदन संक्षिप्त विवरण' : 'Application Snapshot'}</span>
                <GraduationCap className="h-4 w-4 text-emerald-600" />
              </h3>

              <div className="space-y-2.5 text-xs divide-y divide-stone-100 dark:divide-stone-800">
                <div className="flex justify-between items-center pt-1">
                  <span className="text-stone-500">{isNe ? 'शिक्षण विषय:' : 'Teaching Subject:'}</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    {appliedSubject}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-stone-500">{isNe ? 'शैक्षिक तह:' : 'Highest Degree:'}</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100 truncate max-w-[150px]">
                    {highestDegree}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-stone-500">{isNe ? 'पेश मिति:' : 'Submitted Date:'}</span>
                  <span className="font-mono text-stone-700 dark:text-stone-300">
                    {submissionDateFormatted}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-stone-500">{isNe ? 'स्थिति:' : 'Verification:'}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Locked & Verified</span>
                  </span>
                </div>
              </div>

              {application && (
                <div className="pt-1">
                  <Link
                    href={`/apply/confirmation?ref=${application.refNo}`}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                  >
                    <span>View Submitted Form</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Admissions Assistance Card */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center justify-between">
              <span>{isNe ? 'सम्पर्क तथा सहयोग' : 'Admissions Desk'}</span>
              <HelpCircle className="h-4 w-4 text-emerald-600" />
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-stone-400 text-[11px] block">{isNe ? 'इमेल:' : 'Email:'}</span>
                  <a
                    href="mailto:admissions@saathiteachers.org.np"
                    className="text-stone-800 dark:text-stone-200 hover:text-emerald-600 font-medium break-all"
                  >
                    admissions@saathiteachers.org.np
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-stone-400 text-[11px] block">{isNe ? 'हेल्पलाइन:' : 'Phone Helpline:'}</span>
                  <span className="text-stone-800 dark:text-stone-200 font-medium">
                    +977-1-5912345
                  </span>
                  <span className="text-stone-400 text-[10px] block">Sun–Fri, 9am–5pm NPT</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
              <Link
                href="/help"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                <span>{isNe ? 'प्रायः सोधिने प्रश्नहरू (FAQs)' : 'FAQs & Candidate Guidelines'}</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
