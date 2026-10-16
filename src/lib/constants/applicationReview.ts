export const REJECTION_REASON_MAP: Record<
  string,
  { en: string; ne: string; defaultNote: string }
> = {
  ACADEMIC_CRITERIA: {
    en: 'Academic & Minimum Eligibility Criteria Not Met',
    ne: 'शैक्षिक योग्यता तथा न्यूनतम मापदण्ड पूरा नभएको',
    defaultNote:
      'The minimum academic degree/qualification threshold or mandatory eligibility criteria were not met.',
  },
  SCORE_CUTOFF: {
    en: 'Evaluation Score Below Stage Cutoff',
    ne: 'मूल्याङ्कन कट-अफ स्कोर नपुगेको',
    defaultNote:
      'The aggregate score from standardized committee evaluation did not meet the stage progression cutoff.',
  },
  QUOTA_EXCEEDED: {
    en: 'Subject or Regional Cohort Quota Exceeded',
    ne: 'विषयगत वा क्षेत्रीय कोटा सीमितता',
    defaultNote:
      'Due to strictly bounded subject placements across partner schools, we are unable to advance further candidates in this specialization.',
  },
  INTERVIEW_PERFORMANCE: {
    en: 'Interview / Assessment Center Competency Benchmark',
    ne: 'अन्तर्वार्ता वा व्यवहारिक मूल्याङ्कन बेन्चमार्क',
    defaultNote:
      'Key competencies during experiential and communication assessments did not reach the cohort threshold.',
  },
  INCOMPLETE_DOCS: {
    en: 'Incomplete Documentation or Missed Clarification Deadline',
    ne: 'कागजात अपूर्ण वा म्यादभित्र स्पष्टीकरण नआएको',
    defaultNote:
      'Mandatory verification records were incomplete, or clarification inquiries were not answered within the stipulated window.',
  },
  UNREACHABLE_INTERVIEW: {
    en: 'Unreachable / Unresponsive during Call Window',
    ne: 'अन्तर्वार्ता अवधिभर फोन सम्पर्क हुन नसकेको',
    defaultNote:
      'Multiple calling attempts during the scheduled office hours window were unanswered or unreachable.',
  },
  OTHER: {
    en: 'Other Committee Consensus',
    ne: 'अन्य समिति निर्णय',
    defaultNote: 'Selection committee concluded review for this application cycle.',
  },
};

export const ON_HOLD_CATEGORY_MAP: Record<
  string,
  { en: string; ne: string; desc: string }
> = {
  QUOTA_BALANCING: {
    en: 'Subject & Regional Quota Balancing',
    ne: 'विषयगत तथा क्षेत्रीय कोटा सन्तुलन',
    desc: 'Comparative deliberation across partner school needs and candidate subject specializations.',
  },
  DOCUMENT_CLARIFICATION: {
    en: 'Awaiting Candidate Clarification / Verification',
    ne: 'कागजात वा थप स्पष्टीकरण आवश्यक',
    desc: 'Candidate has been contacted for additional verification or document submission.',
  },
  TIEBREAKER_REVIEW: {
    en: 'Tiebreaker / Second Reviewer Assignment',
    ne: 'टाईब्रेकर समीक्षा आवश्यक',
    desc: 'Borderline or tie score undergoing secondary evaluation by senior committee members.',
  },
  BORDERLINE_SCORE: {
    en: 'Borderline Score Committee Deliberation',
    ne: 'सीमावर्ती स्कोर छलफल',
    desc: 'Deliberating progression based on holistic background and interview potential.',
  },
  GENERAL_HOLD: {
    en: 'General Committee Deliberation',
    ne: 'सामान्य समिति छलफल',
    desc: 'Application placed under executive deliberation.',
  },
};

export interface PhoneInterviewSchedule {
  startDate: string; // e.g. "2027-05-10"
  endDate: string; // e.g. "2027-05-15"
  timeWindow: string; // e.g. "10:00 AM – 5:00 PM NPT (Office Hours / कार्यालय समय)"
  timezone?: string;
  instructions?: string;
  scheduledAt: string;
  scheduledBy: string;
  callOutcome?:
    | 'PENDING'
    | 'COMPLETED'
    | 'UNREACHABLE_ATTEMPT_1'
    | 'UNREACHABLE_ATTEMPT_2'
    | 'UNREACHABLE_ATTEMPT_3'
    | 'RESCHEDULE_REQUESTED';
  callOutcomeNote?: string;
  calledAt?: string;
  calledBy?: string;
  callDurationMinutes?: number;
}

export const PHONE_CALL_OUTCOME_MAP: Record<
  string,
  { en: string; ne: string; color: string; badgeClass: string }
> = {
  PENDING: {
    en: 'Call Pending',
    ne: 'सम्पर्क हुन बाँकी',
    color: 'amber',
    badgeClass: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
  },
  COMPLETED: {
    en: 'Call Completed / Evaluated',
    ne: 'फोन अन्तर्वार्ता सम्पन्न',
    color: 'emerald',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
  },
  UNREACHABLE_ATTEMPT_1: {
    en: 'Unreachable (Attempt 1)',
    ne: 'सम्पर्क हुन सकेन (प्रयास १)',
    color: 'orange',
    badgeClass: 'bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-800',
  },
  UNREACHABLE_ATTEMPT_2: {
    en: 'Unreachable (Attempt 2)',
    ne: 'सम्पर्क हुन सकेन (प्रयास २)',
    color: 'rose',
    badgeClass: 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800',
  },
  UNREACHABLE_ATTEMPT_3: {
    en: 'Unreachable (Attempt 3 - Final)',
    ne: 'सम्पर्क हुन सकेन (प्रयास ३ - अन्तिम)',
    color: 'red',
    badgeClass: 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800',
  },
  RESCHEDULE_REQUESTED: {
    en: 'Reschedule Requested',
    ne: 'समय परिवर्तन अनुरोध',
    color: 'blue',
    badgeClass: 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800',
  },
};

export interface AscSessionConfig {
  startDate: string; // e.g. "2026-10-10"
  endDate: string; // e.g. "2026-10-17"
  dailyQuota: number; // e.g. 20 seats per day
  venue: string; // e.g. "Saathi Assessment Center, Sanothimi, Bhaktapur / Kathmandu"
  reportingTime: string; // e.g. "08:30 AM NPT"
  instructions?: string;
  isActive: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export interface AscBooking {
  bookedDate: string; // e.g. "2026-10-12"
  bookedAt: string;
  venue: string;
  reportingTime: string;
  status: 'CONFIRMED' | 'ATTENDED' | 'ABSENT' | 'CANCELLED';
  attendanceNote?: string;
  evaluatedBy?: string;
  evaluatedAt?: string;
}

export interface AscDateSlot {
  date: string; // "2026-10-10"
  dayOfWeek: string; // "Saturday"
  dayNameNe: string; // "शनिबार"
  totalQuota: number; // e.g. 20
  bookedCount: number; // e.g. 14
  remainingSeats: number; // e.g. 6
  isFull: boolean;
}

export const DEFAULT_ASC_CONFIG: AscSessionConfig = {
  startDate: '2026-10-10',
  endDate: '2026-10-17',
  dailyQuota: 20,
  venue: 'Saathi Central Assessment Center, Sanothimi, Bhaktapur (Kathmandu Valley)',
  reportingTime: '08:30 AM NPT (Sharp)',
  instructions:
    'Please bring your original Nepali Citizenship card, original Bachelor’s degree academic transcripts/certificates, 2 passport-size photographs, and writing stationery. Candidates must arrive at the venue by 08:30 AM NPT in formal attire.',
  isActive: true,
};


