'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useI18n } from '@/lib/i18n/context';
import {
  GraduationCap,
  HeartHandshake,
  Sparkles,
  Lightbulb,
  Scale,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  HelpCircle,
  RotateCcw,
  Compass,
  BookOpen,
  Award,
  ChevronRight,
  PartyPopper,
} from 'lucide-react';

export interface EligibilityAnswers {
  qualification?: string;
  twoYearCommitment?: 'yes' | 'no' | '';
  makeDifference?: 'yes' | 'no' | '';
  childEmpowerment?: 'yes' | 'no' | '';
  opportunityDistribution?: 'yes' | 'no' | '';
}

interface EligibilityChecklistProps {
  onComplete: (answers: EligibilityAnswers) => void;
  onSkip: () => void;
  initialAnswers?: EligibilityAnswers;
}

interface QuestionConfig {
  id: number;
  key: keyof EligibilityAnswers;
  icon: React.ElementType;
  titleEn: string;
  titleNe: string;
  subtitleEn: string;
  subtitleNe: string;
  type: 'select' | 'yesno';
  options: Array<{
    value: string;
    labelEn: string;
    labelNe: string;
    badge?: string;
  }>;
}

const QUESTIONS: QuestionConfig[] = [
  {
    id: 1,
    key: 'qualification',
    icon: GraduationCap,
    titleEn: 'What is your latest educational qualification?',
    titleNe: 'तपाईंको पछिल्लो शैक्षिक योग्यता के हो?',
    subtitleEn: 'Candidates must possess or be completing a recognized undergraduate degree by the fellowship start.',
    subtitleNe: 'साथी फेलोशिप सुरु हुनुभन्दा अगाडि कम्तीमा स्नातक तह पूरा गरेको वा अन्तिम वर्षमा हुनुपर्छ।',
    type: 'select',
    options: [
      {
        value: 'Undergraduate complete',
        labelEn: 'Undergraduate complete',
        labelNe: 'स्नातक तह (Bachelor’s) उत्तीर्ण',
        badge: 'Eligible',
      },
      {
        value: 'Undergraduate running',
        labelEn: 'Undergraduate running',
        labelNe: 'स्नातक तह अध्ययनरत (Running)',
      },
      {
        value: 'Masters complete',
        labelEn: 'Masters complete',
        labelNe: 'स्नातकोत्तर (Master’s) उत्तीर्ण',
        badge: 'Eligible',
      },
      {
        value: 'Masters running',
        labelEn: 'Masters running',
        labelNe: 'स्नातकोत्तर अध्ययनरत (Running)',
      },
      {
        value: 'PhD complete',
        labelEn: 'PhD complete',
        labelNe: 'विद्यावारिधि (PhD) सम्पन्न',
        badge: 'Eligible',
      },
      {
        value: 'Undergraduate degree will complete by April 2027',
        labelEn: 'Undergraduate degree will complete by April 2027',
        labelNe: 'अप्रिल २०२७ सम्म स्नातक तह सम्पन्न हुने',
        badge: 'Cohort 2027 Ready',
      },
    ],
  },
  {
    id: 2,
    key: 'twoYearCommitment',
    icon: Compass,
    titleEn: 'Are you willing to commit for a transformative two-years in a rural community?',
    titleNe: 'के तपाईं ग्रामीण समुदायमा २ वर्षको रूपान्तरणकारी शिक्षण सेवाका लागि प्रतिबद्ध हुनुहुन्छ?',
    subtitleEn: 'The fellowship entails living, teaching full-time, and mobilizing community initiatives in remote partner schools.',
    subtitleNe: 'फेलोहरूले २ वर्षसम्म तोकिएको ग्रामीण विद्यालयमा पूर्णकालीन साथी शिक्षक र समुदाय सहजकर्ताको रूपमा कार्य गर्नुपर्छ।',
    type: 'yesno',
    options: [
      { value: 'yes', labelEn: 'Yes, I am committed', labelNe: 'हो, म पूर्ण प्रतिबद्ध छु' },
      { value: 'no', labelEn: 'No', labelNe: 'होइन' },
    ],
  },
  {
    id: 3,
    key: 'makeDifference',
    icon: HeartHandshake,
    titleEn: 'Are you willing to make a difference through the Saathi Teachers Programme?',
    titleNe: 'के तपाईं साथी शिक्षक कार्यक्रममार्फत बालबालिकाको सिकाइमा सकारात्मक परिवर्तन ल्याउन तयार हुनुहुन्छ?',
    subtitleEn: 'Our mission is to eliminate educational inequity by nurturing passionate educators and community leaders.',
    subtitleNe: 'हाम्रो उद्देश्य सबै बालबालिकालाई गुणस्तरीय र समतामूलक शिक्षाको अवसर प्रदान गर्नु हो।',
    type: 'yesno',
    options: [
      { value: 'yes', labelEn: 'Yes, absolutely', labelNe: 'हो, म तत्पर छु' },
      { value: 'no', labelEn: 'No', labelNe: 'होइन' },
    ],
  },
  {
    id: 4,
    key: 'childEmpowerment',
    icon: Lightbulb,
    titleEn: 'Do you believe a child in a rural village studying in a government school can someday become an empowered and educated individual?',
    titleNe: 'के तपाईं विश्वास गर्नुहुन्छ कि सरकारी विद्यालयमा पढ्ने ग्रामीण बालबालिका पनि सक्षम र सशक्त नागरिक बन्न सक्छन्?',
    subtitleEn: 'Every child possesses boundless potential when given committed mentors, active guidance, and belief.',
    subtitleNe: 'उचित अवसर र निष्ठावान साथी शिक्षक पाएमा हरेक बालबालिकाले आफ्नो भविष्य उज्ज्वल बनाउन सक्छन्।',
    type: 'yesno',
    options: [
      { value: 'yes', labelEn: 'Yes, I believe so', labelNe: 'हो, म दृढ विश्वास गर्दछु' },
      { value: 'no', labelEn: 'No', labelNe: 'होइन' },
    ],
  },
  {
    id: 5,
    key: 'opportunityDistribution',
    icon: Scale,
    titleEn: 'Are opportunities and well-rounded Saathi Teachers distributed evenly across all terrains and every postcode?',
    titleNe: 'के नेपालका सबै भौगोलिक क्षेत्र र विकट बस्तीहरूमा समान शैक्षिक अवसर र दक्ष साथी शिक्षक उपलब्ध छन्?',
    subtitleEn: 'Reflect on educational disparity between urban hubs and remote public schools across the country.',
    subtitleNe: 'सहरी केन्द्र र विकट गाउँहरू बीचको शैक्षिक विभेद र साथी शिक्षक उपलब्धताको वास्तविकता विचार गर्नुहोस्।',
    type: 'yesno',
    options: [
      { value: 'yes', labelEn: 'Yes', labelNe: 'हो' },
      { value: 'no', labelEn: 'No', labelNe: 'होइन' },
    ],
  },
];

export function EligibilityChecklist({
  onComplete,
  onSkip,
  initialAnswers = {},
}: EligibilityChecklistProps) {
  const { locale } = useI18n();
  const isNe = locale === 'ne';

  // Current question index (0 to 4) or 5 for result screen
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<EligibilityAnswers>(() => {
    return initialAnswers && typeof initialAnswers === 'object' ? initialAnswers : {};
  });
  const [showResult, setShowResult] = useState<boolean>(false);

  const [optionsContainerRef] = useAutoAnimate<HTMLDivElement>();

  const currentQuestion = QUESTIONS[currentIndex];

  const handleSelectOption = (value: string) => {
    setAnswers((prev) => ({
      ...(prev || {}),
      [currentQuestion.key]: value,
    }));
  };

  const handleClearSelection = () => {
    setAnswers((prev) => ({
      ...(prev || {}),
      [currentQuestion.key]: '',
    }));
  };

  const handleNext = () => {
    if (currentIndex < QUESTIONS.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setShowResult(true);
    }
  };

  const handleBack = () => {
    if (showResult) {
      setShowResult(false);
      setCurrentIndex(QUESTIONS.length - 1);
    } else if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Determine if candidate selected "Yes" in all commitment / attitude questions
  const isAllYesAndEligible = React.useMemo(() => {
    const a = answers || {};
    const q1Selected = Boolean(a.qualification && a.qualification !== '');
    const q2Yes = a.twoYearCommitment === 'yes';
    const q3Yes = a.makeDifference === 'yes';
    const q4Yes = a.childEmpowerment === 'yes';
    return q1Selected && q2Yes && q3Yes && q4Yes;
  }, [answers]);

  return (
    <div className="w-full max-w-2xl mx-auto my-4">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden backdrop-blur-sm">
        {/* Subtle decorative background gradient */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* ================= HEADER SECTION ================= */}
        {!showResult && (
          <div className="space-y-4 mb-6 border-b border-stone-100 dark:border-stone-800 pb-5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <span className="font-heading font-extrabold text-stone-900 dark:text-stone-100 text-sm block">
                    {isNe ? 'योग्यता जाँच' : 'Check Your Eligibility'}
                  </span>
                  <span className="text-[11px] text-stone-500">
                    {isNe ? 'आवेदन फारम भर्नुअघि संक्षिप्त प्रश्नावली' : '1-minute reflection before applying'}
                  </span>
                </div>
              </div>

              {/* Skip to Application Link */}
              <button
                type="button"
                onClick={onSkip}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-xs font-semibold flex items-center gap-1 transition-colors group"
                title="Skip directly to application"
              >
                <span>{isNe ? 'फारममा जानुहोस्' : 'Skip to Application'}</span>
                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Stepper Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-stone-500 font-medium">
                <span>
                  {isNe ? `प्रश्न ०${currentIndex + 1} / ०${QUESTIONS.length}` : `Question 0${currentIndex + 1} of 0${QUESTIONS.length}`}
                </span>
                <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                  {Math.round(((currentIndex + 1) / QUESTIONS.length) * 100)}%
                </span>
              </div>
              <div className="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
                <motion.div
                  className="bg-emerald-600 h-full rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${((currentIndex + 1) / QUESTIONS.length) * 100}%` }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ================= BODY SECTION ================= */}
        <AnimatePresence mode="wait">
          {!showResult ? (
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              {/* Question Title & Details */}
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                  <currentQuestion.icon className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{isNe ? `प्रश्न ०${currentQuestion.id}` : `Question 0${currentQuestion.id}`}</span>
                </div>
                <h3 className="text-base sm:text-lg font-heading font-extrabold text-stone-900 dark:text-stone-50 leading-snug">
                  {isNe ? currentQuestion.titleNe : currentQuestion.titleEn}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                  {isNe ? currentQuestion.subtitleNe : currentQuestion.subtitleEn}
                </p>
              </div>

              {/* Options List */}
              <div ref={optionsContainerRef} className="space-y-2.5 pt-1">
                {currentQuestion.options.map((opt) => {
                  const isSelected = (answers?.[currentQuestion.key] || '') === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelectOption(opt.value)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 group cursor-pointer ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/30 shadow-xs'
                          : 'border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/40 hover:bg-stone-100/80 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Radio indicator circle */}
                        <div
                          className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-600 text-white'
                              : 'border-stone-300 dark:border-stone-600 group-hover:border-stone-400'
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <span className="text-xs sm:text-sm font-semibold">
                          {isNe ? opt.labelNe : opt.labelEn}
                        </span>
                      </div>

                      {opt.badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          {opt.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Optional Clear Button */}
              {answers[currentQuestion.key] && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="text-[11px] font-medium text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>{isNe ? 'चयन हटाउनुहोस्' : 'Clear selection'}</span>
                  </button>
                </div>
              )}

              {/* ================= BOTTOM NAVIGATION ================= */}
              <div className="flex items-center justify-between pt-6 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={handleBack}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>{isNe ? 'अघिल्लो' : 'Previous'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-md flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                  >
                    <span>
                      {currentIndex === QUESTIONS.length - 1
                        ? isNe
                          ? 'नतिजा हेर्नुहोस्'
                          : 'View Result'
                        : answers?.[currentQuestion.key]
                        ? isNe
                          ? 'अर्को प्रश्न'
                          : 'Next Question'
                        : isNe
                        ? 'छोड्नुहोस् र अगाडि बढ्नुहोस्'
                        : 'Skip & Next'}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            /* ================= RESULT / CELEBRATION CARD ================= */
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center space-y-6 py-4"
            >
              {isAllYesAndEligible ? (
                /* Celebration for all Yes / eligible responses */
                <div className="space-y-4">
                  <div className="inline-flex p-4 rounded-3xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 ring-8 ring-emerald-50 dark:ring-emerald-950/40 shadow-md">
                    <PartyPopper className="h-10 w-10 animate-bounce" />
                  </div>

                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{isNe ? 'योग्य उम्मेदवार' : 'Eligibility Confirmed'}</span>
                    </span>

                    <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-stone-900 dark:text-stone-50">
                      {isNe
                        ? 'तपाईं आवेदनका लागि योग्य हुनुहुन्छ!'
                        : 'You are eligible to apply!'}
                    </h2>

                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 max-w-md mx-auto">
                      {isNe
                        ? 'साथी शिक्षक कार्यक्रमको यात्रामा तपाईंलाई हार्दिक स्वागत छ!'
                        : 'Welcome to the beginning of your Saathi Journey!'}
                    </p>

                    <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed pt-1">
                      {isNe
                        ? 'तपाईंको शैक्षिक पृष्ठभूमि र ग्रामीण समुदायमा सेवा गर्ने प्रतिबद्धता साथी फेलोशिपको लक्ष्यसँग मेल खान्छ।'
                        : 'Your academic background and passionate commitment to educational equity strongly align with our fellowship mission.'}
                    </p>
                  </div>
                </div>
              ) : (
                /* Encouraging card if skipped or answered No */
                <div className="space-y-4">
                  <div className="inline-flex p-4 rounded-3xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 ring-8 ring-blue-50 dark:ring-blue-950/40 shadow-md">
                    <CheckCircle2 className="h-10 w-10 text-blue-600" />
                  </div>

                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                      <Check className="h-3.5 w-3.5" />
                      <span>{isNe ? 'प्रश्नावली सम्पन्न' : 'Check Completed'}</span>
                    </span>

                    <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-stone-900 dark:text-stone-50">
                      {isNe
                        ? 'साथी शिक्षक कार्यक्रममा स्वागत छ'
                        : 'Ready to Begin Your Application'}
                    </h2>

                    <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 max-w-md mx-auto leading-relaxed">
                      {isNe
                        ? 'हाम्रो छनोट समितिले हरेक उम्मेदवारको पृष्ठभूमि र सम्भावनालाई समग्र रूपमा मूल्याङ्कन गर्दछ। तपाईं फारम भर्न अगाडि बढ्न सक्नुहुन्छ।'
                        : 'Our Selection Committee evaluates each candidate holistically. You can now proceed directly to complete your application dossier.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons on Result Card */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>{isNe ? 'पुनरावलोकन गर्नुहोस्' : 'Review Answers'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onComplete(answers || {})}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <span>{isNe ? 'आवेदन फारम सुरु गर्नुहोस्' : 'Proceed to Application Form'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
