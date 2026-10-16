'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useI18n } from '@/lib/i18n/context';
import { countWords, MIN_ESSAY_WORDS } from '@/lib/validations/application';
import { autosaveDraftAction, submitApplicationAction } from '@/app/api/application/actions';
import { ManualDobInput } from '@/components/ui/ManualDobInput';
import {
  CheckCircle2,
  Clock,
  Sparkles,
  Save,
  ArrowRight,
  ArrowLeft,
  UploadCloud,
  FileCheck,
  AlertCircle,
  Plus,
  Trash2,
  Calendar,
  Lock,
  Loader2,
  Check,
} from 'lucide-react';
import { EligibilityChecklist, type EligibilityAnswers } from '@/components/apply/EligibilityChecklist';

interface ApplicationWizardProps {
  userEmail: string;
  userName: string;
  initialDraft: any;
  deadlineIso: string;
}

interface ExperienceRow {
  organization: string;
  role: string;
  durationYears: string;
  description: string;
}

export function ApplicationWizard({
  userEmail,
  userName,
  initialDraft,
}: ApplicationWizardProps) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Active step (1 to 6)
  const [currentStep, setCurrentStep] = useState<number>(initialDraft?.currentStep || 1);
  const [autosaveTime, setAutosaveTime] = useState<string | null>(initialDraft?.lastSavedAt ? new Date(initialDraft.lastSavedAt).toLocaleTimeString() : null);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Check if eligibility should be presented before the user begins filling the form
  const [showEligibility, setShowEligibility] = useState<boolean>(() => {
    if (initialDraft?.eligibilityCompleted) return false;
    if (initialDraft?.currentStep && initialDraft.currentStep > 1) return false;
    return true;
  });

  const handleEligibilityComplete = (answers: EligibilityAnswers) => {
    setFormData((prev) => {
      const next = {
        ...prev,
        eligibilityCompleted: true,
        eligibilityAnswers: answers,
      };

      if (answers.qualification) {
        if (answers.qualification.includes('Undergraduate complete')) {
          next.highestLevel = "Bachelor's Degree";
        } else if (answers.qualification.includes('Undergraduate running')) {
          next.highestLevel = "Bachelor's Degree";
        } else if (answers.qualification.includes('April 2027')) {
          next.highestLevel = "Bachelor's Degree";
        } else if (answers.qualification.includes('Masters complete')) {
          next.highestLevel = "Master's Degree";
        } else if (answers.qualification.includes('Masters running')) {
          next.highestLevel = "Master's Degree";
        } else if (answers.qualification.includes('PhD')) {
          next.highestLevel = "Doctorate / PhD";
        }
      }

      if (answers.twoYearCommitment) {
        next.commitment2Years = answers.twoYearCommitment;
      }
      if (answers.opportunityDistribution) {
        next.opportunityDistribution = answers.opportunityDistribution;
      }

      return next;
    });

    setShowEligibility(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEligibilitySkip = () => {
    setShowEligibility(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Auto-animate ref for repeatable experience list
  const [experienceListRef] = useAutoAnimate<HTMLDivElement>();

  // Form State
  const [formData, setFormData] = useState({
    // Section 1: Personal
    fullName: initialDraft?.fullName || userName || '',
    dob: initialDraft?.dob || '',
    gender: initialDraft?.gender || 'female',
    nationality: initialDraft?.nationality || 'Nepali',
    contactNumber: initialDraft?.contactNumber || '',
    email: userEmail,
    currentCountry: initialDraft?.currentCountry || 'Nepal',
    currentProvince: initialDraft?.currentProvince || 'Bagmati Province',
    currentMunicipality: initialDraft?.currentMunicipality || '',
    currentWard: initialDraft?.currentWard || '',
    sameAsCurrent: initialDraft?.sameAsCurrent || false,
    permanentCountry: initialDraft?.permanentCountry || 'Nepal',
    permanentProvince: initialDraft?.permanentProvince || 'Bagmati Province',
    permanentMunicipality: initialDraft?.permanentMunicipality || '',
    permanentWard: initialDraft?.permanentWard || '',

    // Section 2: Education
    highestLevel: initialDraft?.highestLevel || "Bachelor's Degree",
    fieldOfStudy: initialDraft?.fieldOfStudy || '',
    university: initialDraft?.university || '',
    gradYear: initialDraft?.gradYear || '2024',
    slcDivision: initialDraft?.slcDivision || 'First Division',

    // Section 3: Experience
    experiences: (initialDraft?.experiences as ExperienceRow[]) || [
      { organization: '', role: '', durationYears: '', description: '' },
    ],

    // Section 4: Essays
    essay1: initialDraft?.essay1 || '',
    essay2: initialDraft?.essay2 || '',
    essay3: initialDraft?.essay3 || '',

    // Section 5: Commitment & CV
    commitment2Years: initialDraft?.commitment2Years || 'yes',
    preServiceTraining: initialDraft?.preServiceTraining || 'yes',
    villageEmpowerment: initialDraft?.villageEmpowerment || 'yes',
    opportunityDistribution: initialDraft?.opportunityDistribution || 'no',
    teachingSubject: initialDraft?.teachingSubject || 'english',
    cvFileName: initialDraft?.cvFileName || '',
    cvFileUrl: initialDraft?.cvFileUrl || '',

    // Section 6: Declaration
    declarationAgreed: false,

    // Eligibility reflection
    eligibilityCompleted: initialDraft?.eligibilityCompleted || false,
    eligibilityAnswers: initialDraft?.eligibilityAnswers || null,
  });


  // File Upload State
  const [uploadingCv, setUploadingCv] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Address synchronizer
  useEffect(() => {
    if (formData.sameAsCurrent) {
      setFormData((prev) => ({
        ...prev,
        permanentCountry: prev.currentCountry,
        permanentProvince: prev.currentProvince,
        permanentMunicipality: prev.currentMunicipality,
        permanentWard: prev.currentWard,
      }));
    }
  }, [
    formData.sameAsCurrent,
    formData.currentCountry,
    formData.currentProvince,
    formData.currentMunicipality,
    formData.currentWard,
  ]);

  // Periodic autosave every ~15 seconds
  const formDataRef = useRef(formData);
  formDataRef.current = formData;
  const currentStepRef = useRef(currentStep);
  currentStepRef.current = currentStep;

  useEffect(() => {
    const triggerSave = async () => {
      setIsAutosaving(true);
      const res = await autosaveDraftAction(formDataRef.current, currentStepRef.current);
      if (res.success && res.savedAt) {
        setAutosaveTime(res.savedAt);
      }
      setIsAutosaving(false);
    };

    const interval = setInterval(triggerSave, 15000);
    return () => clearInterval(interval);
  }, []);

  // Save draft on demand (or on step change)
  const saveDraftNow = async () => {
    setIsAutosaving(true);
    const res = await autosaveDraftAction(formData, currentStep);
    if (res.success && res.savedAt) {
      setAutosaveTime(res.savedAt);
    }
    setIsAutosaving(false);
  };

  // Step navigation
  const goToNextStep = async () => {
    setFieldErrors({});
    await saveDraftNow();
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPrevStep = async () => {
    await saveDraftNow();
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };


  // Experience row management
  const addExperienceRow = () => {
    setFormData((prev) => ({
      ...prev,
      experiences: [
        ...prev.experiences,
        { organization: '', role: '', durationYears: '', description: '' },
      ],
    }));
  };

  const removeExperienceRow = (idx: number) => {
    if (formData.experiences.length <= 1) {
      setFormData((prev) => ({
        ...prev,
        experiences: [{ organization: 'NA', role: 'NA', durationYears: '0', description: 'NA' }],
      }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      experiences: prev.experiences.filter((_, i) => i !== idx),
    }));
  };

  const updateExperienceField = (
    index: number,
    field: keyof ExperienceRow,
    value: string
  ) => {
    setFormData((prev) => {
      const updated = [...prev.experiences];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, experiences: updated };
    });
  };

  // File Upload handler
  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCv(true);
    setUploadError(null);

    const body = new FormData();
    body.append('file', file);

    try {
      const res = await fetch('/api/upload/cv', {
        method: 'POST',
        body,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setUploadError(json.error || 'Upload failed.');
      } else {
        setFormData((prev) => ({
          ...prev,
          cvFileName: json.fileName,
          cvFileUrl: json.fileUrl,
        }));
      }
    } catch {
      setUploadError('Network error uploading CV.');
    } finally {
      setUploadingCv(false);
    }
  };

  // Final submit handler
  const handleFinalSubmit = async () => {
    setSubmitError(null);
    setFieldErrors({});

    startTransition(async () => {
      const res = await submitApplicationAction(formData);
      if (res.success && res.refNo) {
        router.push(`/apply/confirmation?ref=${res.refNo}`);
      } else {
        if (res.errors) {
          setFieldErrors(res.errors);
        }
        setSubmitError(res.message || 'Submission failed. Please review errors.');
      }
    });
  };

  const stepsList = [
    { id: 1, title: t.apply.steps.personal },
    { id: 2, title: t.apply.steps.education },
    { id: 3, title: t.apply.steps.experience },
    { id: 4, title: t.apply.steps.essays },
    { id: 5, title: t.apply.steps.commitment },
    { id: 6, title: t.apply.steps.review },
  ];

  if (showEligibility) {
    return (
      <div className="space-y-6">
        <EligibilityChecklist
          onComplete={handleEligibilityComplete}
          onSkip={handleEligibilitySkip}
          initialAnswers={(formData.eligibilityAnswers || initialDraft?.eligibilityAnswers) ?? {}}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner: Bilingual Notice & Estimated Time */}
      <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="font-medium text-stone-700 dark:text-stone-300">
            {t.apply.bilingualIntro}
          </span>
        </div>
        <div className="flex items-center gap-4 text-stone-500 dark:text-stone-400">
          <button
            type="button"
            onClick={() => setShowEligibility(true)}
            className="flex items-center gap-1 font-semibold text-emerald-800 dark:text-emerald-300 hover:underline cursor-pointer"
            title="Review eligibility questionnaire"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{locale === 'ne' ? 'योग्यता जाँच' : 'Check Eligibility'}</span>
          </button>
          <span className="flex items-center gap-1 font-semibold text-emerald-800 dark:text-emerald-300">
            <Clock className="h-3.5 w-3.5" />
            <span>{t.apply.estimatedTime}</span>
          </span>
          <span className="flex items-center gap-1 text-[11px]">
            <Save className="h-3 w-3 text-stone-400" />
            <span>
              {isAutosaving
                ? t.apply.savingDraft
                : autosaveTime
                ? `${t.apply.autosavedAt} ${autosaveTime}`
                : ''}
            </span>
          </span>
        </div>
      </div>

      {/* Stepper Header & Progress Bar */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between text-xs font-semibold text-stone-600 dark:text-stone-400">
          <span>{t.apply.stepOf.replace('{current}', String(currentStep)).replace('{total}', '6')}</span>
          <span className="text-emerald-700 dark:text-emerald-400 font-bold">
            {stepsList[currentStep - 1].title}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
          <div
            className="bg-emerald-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / 6) * 100}%` }}
          />
        </div>

        {/* Step Icons (Desktop) */}
        <div className="hidden md:grid grid-cols-6 gap-2 pt-1 text-center">
          {stepsList.map((s) => {
            const isCompleted = currentStep > s.id;
            const isCurrent = currentStep === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  saveDraftNow();
                  setCurrentStep(s.id);
                }}
                className={`flex flex-col items-center gap-1 p-1 rounded-xl transition-all ${
                  isCurrent
                    ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                    : isCompleted
                    ? 'text-stone-700 dark:text-stone-300 font-medium'
                    : 'text-stone-400'
                }`}
              >
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : isCompleted
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-400'
                  }`}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : s.id}
                </div>
                <span className="text-[10px] truncate max-w-[110px]">{s.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Wizard Form Body with Framer Motion Transition */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* ================= STEP 1: PERSONAL INFORMATION ================= */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold font-heading text-stone-900 dark:text-stone-50">
                    {t.apply.sec1.title}
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Please provide your authentic biographical and contact information.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      {t.apply.sec1.fullName} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="e.g. Pooja Thapa"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>

                  {/* Systematic Manual Date of Birth Input with AD/BS Toggle */}
                  <ManualDobInput
                    value={formData.dob}
                    onChange={(adDate) => setFormData({ ...formData, dob: adDate })}
                    label={t.apply.sec1.dob}
                    required
                    locale={locale}
                  />

                  {/* Gender */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      {t.apply.sec1.gender} *
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    >
                      <option value="female">{t.apply.sec1.genderFemale}</option>
                      <option value="male">{t.apply.sec1.genderMale}</option>
                      <option value="other">{t.apply.sec1.genderOther}</option>
                      <option value="prefer_not_to_say">{t.apply.sec1.genderPreferNot}</option>
                    </select>
                  </div>

                  {/* Nationality */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      {t.apply.sec1.nationality} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>

                  {/* Contact Number */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      {t.apply.sec1.contactNumber} *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.contactNumber}
                      onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                      placeholder="e.g. 9841XXXXXX"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>

                  {/* Email Address (Pre-filled, read-only) */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      {t.apply.sec1.email} * ({locale === 'ne' ? 'प्रमाणित खाता' : 'Verified Account'})
                    </label>
                    <input
                      type="email"
                      readOnly
                      disabled
                      value={formData.email}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-800 text-stone-500 text-sm cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Current Address */}
                <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-3">
                  <h3 className="font-semibold text-sm text-stone-800 dark:text-stone-200">
                    {t.apply.sec1.currentAddress}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                        {t.apply.sec1.country} *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.currentCountry}
                        onChange={(e) => setFormData({ ...formData, currentCountry: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-xs focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                        {t.apply.sec1.province} *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.currentProvince}
                        onChange={(e) => setFormData({ ...formData, currentProvince: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-xs focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                        {t.apply.sec1.municipality} *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.currentMunicipality}
                        onChange={(e) => setFormData({ ...formData, currentMunicipality: e.target.value })}
                        placeholder="e.g. Pokhara Metropolitan"
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-xs focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                        {t.apply.sec1.ward} *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.currentWard}
                        onChange={(e) => setFormData({ ...formData, currentWard: e.target.value })}
                        placeholder="e.g. 8"
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-xs focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Permanent Address with Same As Checkbox */}
                <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="font-semibold text-sm text-stone-800 dark:text-stone-200">
                      {t.apply.sec1.permanentAddress} *
                    </h3>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                      <input
                        type="checkbox"
                        checked={formData.sameAsCurrent}
                        onChange={(e) => setFormData({ ...formData, sameAsCurrent: e.target.checked })}
                        className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-600"
                      />
                      <span>{t.apply.sec1.sameAsCurrent}</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                        {t.apply.sec1.country} *
                      </label>
                      <input
                        type="text"
                        required
                        disabled={formData.sameAsCurrent}
                        value={formData.permanentCountry}
                        onChange={(e) => setFormData({ ...formData, permanentCountry: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-xs disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                        {t.apply.sec1.province} *
                      </label>
                      <input
                        type="text"
                        required
                        disabled={formData.sameAsCurrent}
                        value={formData.permanentProvince}
                        onChange={(e) => setFormData({ ...formData, permanentProvince: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-xs disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                        {t.apply.sec1.municipality} *
                      </label>
                      <input
                        type="text"
                        required
                        disabled={formData.sameAsCurrent}
                        value={formData.permanentMunicipality}
                        onChange={(e) => setFormData({ ...formData, permanentMunicipality: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-xs disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                        {t.apply.sec1.ward} *
                      </label>
                      <input
                        type="text"
                        required
                        disabled={formData.sameAsCurrent}
                        value={formData.permanentWard}
                        onChange={(e) => setFormData({ ...formData, permanentWard: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-xs disabled:opacity-60"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= STEP 2: EDUCATIONAL BACKGROUND ================= */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold font-heading text-stone-900 dark:text-stone-50">
                    {t.apply.sec2.title}
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Provide details regarding your higher education and school credentials.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      {t.apply.sec2.highestLevel} *
                    </label>
                    <select
                      value={formData.highestLevel}
                      onChange={(e) => setFormData({ ...formData, highestLevel: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-sm focus:ring-2 focus:ring-emerald-600"
                    >
                      <option value="Bachelor's Degree">{t.apply.sec2.levels.bachelor}</option>
                      <option value="Master's Degree">{t.apply.sec2.levels.master}</option>
                      <option value="M.Phil / PhD">{t.apply.sec2.levels.mphil_phd}</option>
                      <option value="Other">{t.apply.sec2.levels.other}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      {t.apply.sec2.fieldOfStudy} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.fieldOfStudy}
                      onChange={(e) => setFormData({ ...formData, fieldOfStudy: e.target.value })}
                      placeholder="e.g. Education / Science / Management / Humanities"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-sm focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      {t.apply.sec2.university} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.university}
                      onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                      placeholder="e.g. Tribhuvan University / Kathmandu University / Pokhara University"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-sm focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      {t.apply.sec2.gradYear} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.gradYear}
                      onChange={(e) => setFormData({ ...formData, gradYear: e.target.value })}
                      placeholder="e.g. 2024"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-sm focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      {t.apply.sec2.slcDivision} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.slcDivision}
                      onChange={(e) => setFormData({ ...formData, slcDivision: e.target.value })}
                      placeholder="e.g. Distinction / First Division / 3.6 GPA"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-sm focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ================= STEP 3: WORK, TRAINING & VOLUNTEER EXPERIENCE ================= */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold font-heading text-stone-900 dark:text-stone-50">
                    {t.apply.sec3.title}
                  </h2>
                  <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                    {t.apply.sec3.notice}
                  </p>
                </div>

                <div ref={experienceListRef} className="space-y-4">
                  {formData.experiences.map((exp, idx) => (
                    <div
                      key={idx}
                      className="p-4 sm:p-5 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 space-y-3 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-emerald-800 dark:text-emerald-300">
                          {t.apply.sec3.sn} {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeExperienceRow(idx)}
                          className="text-stone-400 hover:text-red-600 text-xs flex items-center gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>{t.apply.sec3.remove}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                            {t.apply.sec3.orgName} *
                          </label>
                          <input
                            type="text"
                            required
                            value={exp.organization}
                            onChange={(e) => updateExperienceField(idx, 'organization', e.target.value)}
                            placeholder="e.g. Teach For Nepal / Youth Club / NA"
                            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs focus:ring-2 focus:ring-emerald-600"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                            {t.apply.sec3.duration} *
                          </label>
                          <input
                            type="text"
                            required
                            value={exp.durationYears}
                            onChange={(e) => updateExperienceField(idx, 'durationYears', e.target.value)}
                            placeholder="e.g. 1 year / 6 months / NA"
                            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs focus:ring-2 focus:ring-emerald-600"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                            {t.apply.sec3.role} *
                          </label>
                          <input
                            type="text"
                            required
                            value={exp.role}
                            onChange={(e) => updateExperienceField(idx, 'role', e.target.value)}
                            placeholder="e.g. Volunteer Saathi Teacher / Project Assistant / NA"
                            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs focus:ring-2 focus:ring-emerald-600"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                            {t.apply.sec3.description} *
                          </label>
                          <textarea
                            rows={2}
                            required
                            value={exp.description}
                            onChange={(e) => updateExperienceField(idx, 'description', e.target.value)}
                            placeholder="Briefly describe what you accomplished or learned (or write NA)"
                            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs focus:ring-2 focus:ring-emerald-600"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addExperienceRow}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-emerald-600 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span>{t.apply.sec3.addExperience}</span>
                </button>
              </div>
            )}

            {/* ================= STEP 4: ESSAY QUESTIONS (MIN 150 WORDS) ================= */}
            {currentStep === 4 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-bold font-heading text-stone-900 dark:text-stone-50">
                    {t.apply.sec4.title}
                  </h2>
                  <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
                    {t.apply.sec4.instruction}
                  </p>
                </div>

                {/* Essay 1 */}
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      {t.apply.sec4.q1Title}
                    </label>
                    <span
                      className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-full ${
                        countWords(formData.essay1) >= MIN_ESSAY_WORDS
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {countWords(formData.essay1)} / {MIN_ESSAY_WORDS} {t.apply.sec4.wordCount}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-stone-800/40 p-3 rounded-xl border border-stone-200/80 dark:border-stone-700 leading-relaxed">
                    {t.apply.sec4.q1Prompt}
                  </p>
                  <textarea
                    rows={6}
                    required
                    value={formData.essay1}
                    onChange={(e) => setFormData({ ...formData, essay1: e.target.value })}
                    placeholder={locale === 'ne' ? 'यहाँ आफ्नो उत्तर लेख्नुहोस्...' : 'Write your response here...'}
                    className="w-full p-3.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none leading-relaxed"
                  />
                  {countWords(formData.essay1) < MIN_ESSAY_WORDS && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400">
                      * {t.apply.sec4.minWordsNotice} ({MIN_ESSAY_WORDS - countWords(formData.essay1)} words remaining)
                    </p>
                  )}
                </div>

                {/* Essay 2 */}
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      {t.apply.sec4.q2Title}
                    </label>
                    <span
                      className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-full ${
                        countWords(formData.essay2) >= MIN_ESSAY_WORDS
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {countWords(formData.essay2)} / {MIN_ESSAY_WORDS} {t.apply.sec4.wordCount}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-stone-800/40 p-3 rounded-xl border border-stone-200/80 dark:border-stone-700 leading-relaxed">
                    {t.apply.sec4.q2Prompt}
                  </p>
                  <textarea
                    rows={6}
                    required
                    value={formData.essay2}
                    onChange={(e) => setFormData({ ...formData, essay2: e.target.value })}
                    placeholder={locale === 'ne' ? 'यहाँ आफ्नो उत्तर लेख्नुहोस्...' : 'Write your response here...'}
                    className="w-full p-3.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none leading-relaxed"
                  />
                  {countWords(formData.essay2) < MIN_ESSAY_WORDS && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400">
                      * {t.apply.sec4.minWordsNotice} ({MIN_ESSAY_WORDS - countWords(formData.essay2)} words remaining)
                    </p>
                  )}
                </div>

                {/* Essay 3 */}
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      {t.apply.sec4.q3Title}
                    </label>
                    <span
                      className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-full ${
                        countWords(formData.essay3) >= MIN_ESSAY_WORDS
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {countWords(formData.essay3)} / {MIN_ESSAY_WORDS} {t.apply.sec4.wordCount}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-stone-800/40 p-3 rounded-xl border border-stone-200/80 dark:border-stone-700 leading-relaxed">
                    {t.apply.sec4.q3Prompt}
                  </p>
                  <textarea
                    rows={6}
                    required
                    value={formData.essay3}
                    onChange={(e) => setFormData({ ...formData, essay3: e.target.value })}
                    placeholder={locale === 'ne' ? 'यहाँ आफ्नो उत्तर लेख्नुहोस्...' : 'Write your response here...'}
                    className="w-full p-3.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none leading-relaxed"
                  />
                  {countWords(formData.essay3) < MIN_ESSAY_WORDS && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400">
                      * {t.apply.sec4.minWordsNotice} ({MIN_ESSAY_WORDS - countWords(formData.essay3)} words remaining)
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ================= STEP 5: COMMITMENT, AVAILABILITY & CV ================= */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold font-heading text-stone-900 dark:text-stone-50">
                    {t.apply.sec5.title}
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Confirm your fellowship commitment and upload your curriculum vitae.
                  </p>
                </div>

                {/* Yes/No Radios */}
                <div className="space-y-4">
                  {/* 5.1 */}
                  <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-700 space-y-2">
                    <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                      {t.apply.sec5.q51}
                    </p>
                    <div className="flex items-center gap-6 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="commitment2Years"
                          value="yes"
                          checked={formData.commitment2Years === 'yes'}
                          onChange={(e) => setFormData({ ...formData, commitment2Years: e.target.value as any })}
                          className="text-emerald-600 focus:ring-emerald-600"
                        />
                        <span>{t.apply.sec5.yesAns}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="commitment2Years"
                          value="no"
                          checked={formData.commitment2Years === 'no'}
                          onChange={(e) => setFormData({ ...formData, commitment2Years: e.target.value as any })}
                          className="text-emerald-600 focus:ring-emerald-600"
                        />
                        <span>{t.apply.sec5.noAns}</span>
                      </label>
                    </div>
                  </div>

                  {/* 5.2 */}
                  <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-700 space-y-2">
                    <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                      {t.apply.sec5.q52}
                    </p>
                    <div className="flex items-center gap-6 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="preServiceTraining"
                          value="yes"
                          checked={formData.preServiceTraining === 'yes'}
                          onChange={(e) => setFormData({ ...formData, preServiceTraining: e.target.value as any })}
                          className="text-emerald-600 focus:ring-emerald-600"
                        />
                        <span>{t.apply.sec5.yesAns}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="preServiceTraining"
                          value="no"
                          checked={formData.preServiceTraining === 'no'}
                          onChange={(e) => setFormData({ ...formData, preServiceTraining: e.target.value as any })}
                          className="text-emerald-600 focus:ring-emerald-600"
                        />
                        <span>{t.apply.sec5.noAns}</span>
                      </label>
                    </div>
                  </div>

                  {/* 5.3 */}
                  <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-700 space-y-2">
                    <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                      {t.apply.sec5.q53}
                    </p>
                    <div className="flex items-center gap-6 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="villageEmpowerment"
                          value="yes"
                          checked={formData.villageEmpowerment === 'yes'}
                          onChange={(e) => setFormData({ ...formData, villageEmpowerment: e.target.value as any })}
                          className="text-emerald-600 focus:ring-emerald-600"
                        />
                        <span>{t.apply.sec5.yesAns}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="villageEmpowerment"
                          value="no"
                          checked={formData.villageEmpowerment === 'no'}
                          onChange={(e) => setFormData({ ...formData, villageEmpowerment: e.target.value as any })}
                          className="text-emerald-600 focus:ring-emerald-600"
                        />
                        <span>{t.apply.sec5.noAns}</span>
                      </label>
                    </div>
                  </div>

                  {/* 5.4 */}
                  <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-700 space-y-2">
                    <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                      {t.apply.sec5.q54}
                    </p>
                    <div className="flex items-center gap-6 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="opportunityDistribution"
                          value="yes"
                          checked={formData.opportunityDistribution === 'yes'}
                          onChange={(e) => setFormData({ ...formData, opportunityDistribution: e.target.value as any })}
                          className="text-emerald-600 focus:ring-emerald-600"
                        />
                        <span>{t.apply.sec5.yesAns}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="opportunityDistribution"
                          value="no"
                          checked={formData.opportunityDistribution === 'no'}
                          onChange={(e) => setFormData({ ...formData, opportunityDistribution: e.target.value as any })}
                          className="text-emerald-600 focus:ring-emerald-600"
                        />
                        <span>{t.apply.sec5.noAns}</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Subject Selection */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                    {t.apply.sec5.subjectTitle}
                  </label>
                  <select
                    value={formData.teachingSubject}
                    onChange={(e) => setFormData({ ...formData, teachingSubject: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-sm focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="english">{t.apply.sec5.subjectEnglish}</option>
                    <option value="math">{t.apply.sec5.subjectMath}</option>
                    <option value="grade_teaching">{t.apply.sec5.subjectGrade}</option>
                  </select>
                </div>

                {/* CV File Upload */}
                <div className="pt-2 space-y-2">
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                    {t.apply.sec5.cvTitle}
                  </label>
                  <p className="text-[11px] text-stone-500">
                    {t.apply.sec5.cvHelper}
                  </p>

                  {formData.cvFileName ? (
                    <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 truncate">
                        <FileCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="font-semibold truncate">{formData.cvFileName}</span>
                      </div>
                      <label className="text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 font-bold underline cursor-pointer shrink-0">
                        {t.apply.sec5.cvChange}
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleCvUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-emerald-600 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-stone-50/50 dark:bg-stone-800/20 hover:bg-emerald-50/20 transition-all">
                      <UploadCloud className="h-8 w-8 text-emerald-600" />
                      <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                        {t.apply.sec5.cvClickOrDrag}
                      </span>
                      <span className="text-[11px] text-stone-500">
                        {t.apply.sec5.cvSecureNote}
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleCvUpload}
                        className="hidden"
                      />
                    </label>
                  )}

                  {uploadingCv && (
                    <p className="text-xs text-emerald-700 flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Uploading & verifying file...</span>
                    </p>
                  )}
                  {uploadError && (
                    <p className="text-xs text-red-600">{uploadError}</p>
                  )}
                </div>
              </div>
            )}

            {/* ================= STEP 6: REVIEW BEFORE SUBMIT ================= */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold font-heading text-stone-900 dark:text-stone-50">
                    {t.apply.sec6.title}
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {t.apply.sec6.subtitle}
                  </p>
                </div>

                {submitError && (
                  <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">{submitError}</p>
                      {Object.keys(fieldErrors).length > 0 && (
                        <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11px]">
                          {Object.entries(fieldErrors).map(([f, errs]) => (
                            <li key={f}>
                              <strong>{f}:</strong> {errs.join(', ')}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {/* Section Review Accordions */}
                <div className="space-y-3 text-xs">
                  {/* Sec 1 Review */}
                  <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-700 space-y-2">
                    <div className="flex items-center justify-between font-bold text-stone-800 dark:text-stone-200">
                      <span>{t.apply.sec1.title}</span>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="text-emerald-700 dark:text-emerald-400 hover:underline"
                      >
                        {t.apply.sec6.editSection}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-stone-600 dark:text-stone-400">
                      <div>{t.apply.sec6.reviewLabels.name}: <strong className="text-stone-800 dark:text-stone-200">{formData.fullName}</strong></div>
                      <div>{t.apply.sec6.reviewLabels.dob}: <strong className="text-stone-800 dark:text-stone-200">{formData.dob}</strong></div>
                      <div>{t.apply.sec6.reviewLabels.gender}: <strong className="text-stone-800 dark:text-stone-200">{formData.gender}</strong></div>
                      <div>{t.apply.sec6.reviewLabels.phone}: <strong className="text-stone-800 dark:text-stone-200">{formData.contactNumber}</strong></div>
                    </div>
                  </div>

                  {/* Sec 2 Review */}
                  <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-700 space-y-2">
                    <div className="flex items-center justify-between font-bold text-stone-800 dark:text-stone-200">
                      <span>{t.apply.sec2.title}</span>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="text-emerald-700 dark:text-emerald-400 hover:underline"
                      >
                        {t.apply.sec6.editSection}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-stone-600 dark:text-stone-400">
                      <div>{t.apply.sec6.reviewLabels.degree}: <strong className="text-stone-800 dark:text-stone-200">{formData.highestLevel}</strong></div>
                      <div>{t.apply.sec6.reviewLabels.field}: <strong className="text-stone-800 dark:text-stone-200">{formData.fieldOfStudy}</strong></div>
                      <div>{t.apply.sec6.reviewLabels.university}: <strong className="text-stone-800 dark:text-stone-200">{formData.university}</strong></div>
                    </div>
                  </div>

                  {/* Sec 3 Review */}
                  <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-700 space-y-2">
                    <div className="flex items-center justify-between font-bold text-stone-800 dark:text-stone-200">
                      <span>{t.apply.sec3.title}</span>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        className="text-emerald-700 dark:text-emerald-400 hover:underline"
                      >
                        {t.apply.sec6.editSection}
                      </button>
                    </div>
                    <div>
                      {formData.experiences.map((exp, i) => (
                        <div key={i} className="text-stone-600 dark:text-stone-400">
                          #{i + 1}: {exp.organization} — {exp.role} ({exp.durationYears})
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sec 4 Review */}
                  <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-700 space-y-2">
                    <div className="flex items-center justify-between font-bold text-stone-800 dark:text-stone-200">
                      <span>{t.apply.sec4.title}</span>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(4)}
                        className="text-emerald-700 dark:text-emerald-400 hover:underline"
                      >
                        {t.apply.sec6.editSection}
                      </button>
                    </div>
                    <div className="space-y-1 text-stone-600 dark:text-stone-400">
                      <div>Q1: {countWords(formData.essay1)} words {countWords(formData.essay1) >= 150 ? '✓' : '⚠️ (<150)'}</div>
                      <div>Q2: {countWords(formData.essay2)} words {countWords(formData.essay2) >= 150 ? '✓' : '⚠️ (<150)'}</div>
                      <div>Q3: {countWords(formData.essay3)} words {countWords(formData.essay3) >= 150 ? '✓' : '⚠️ (<150)'}</div>
                    </div>
                  </div>

                  {/* Sec 5 Review */}
                  <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-700 space-y-2">
                    <div className="flex items-center justify-between font-bold text-stone-800 dark:text-stone-200">
                      <span>{t.apply.sec5.title}</span>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(5)}
                        className="text-emerald-700 dark:text-emerald-400 hover:underline"
                      >
                        {t.apply.sec6.editSection}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-stone-600 dark:text-stone-400">
                      <div>{t.apply.sec6.reviewLabels.subject}: <strong className="text-stone-800 dark:text-stone-200">{formData.teachingSubject}</strong></div>
                      <div>{t.apply.sec6.reviewLabels.cvAttached}: <strong className="text-emerald-700 dark:text-emerald-400">{formData.cvFileName || t.apply.sec6.reviewLabels.none}</strong></div>
                    </div>
                  </div>
                </div>

                {/* Declaration Agreement Checkbox */}
                <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.declarationAgreed}
                      onChange={(e) => setFormData({ ...formData, declarationAgreed: e.target.checked })}
                      className="mt-0.5 rounded border-stone-300 text-emerald-700 focus:ring-emerald-600"
                    />
                    <span className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed font-medium">
                      {t.apply.sec6.declaration}
                    </span>
                  </label>
                </div>

                {/* Final Submit Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isPending || !formData.declarationAgreed}
                    onClick={handleFinalSubmit}
                    className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{t.apply.sec6.submitting}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{t.apply.sec6.confirmSubmitBtn}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Step Navigation Controls */}
        <div className="pt-6 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-4">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={goToPrevStep}
              className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-semibold text-xs hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t.apply.prevStep}</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={saveDraftNow}
              className="px-3.5 py-2 rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{t.apply.saveAndExit}</span>
            </button>

            {currentStep < 6 && (
              <button
                type="button"
                onClick={goToNextStep}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5"
              >
                <span>{t.apply.nextStep}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
