import React from 'react';
import Link from 'next/link';
import { getServerTranslations } from '@/lib/i18n/server';
import {
  FileText,
  PhoneCall,
  Award,
  Users,
  GraduationCap,
  MapPin,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

export default async function ProcessPage() {
  const { t, locale } = await getServerTranslations();
  const isNe = locale === 'ne';

  const stages = [
    {
      num: '01',
      code: 'APPLICATION',
      titleEn: 'Stage 1: Application Screening',
      titleNe: 'पहिलो चरण: दरखास्त फारम छानबिन',
      descEn:
        'Comprehensive review of submitted academic qualifications, leadership experience, and motivation essays by the Selection Committee.',
      descNe:
        'उम्मेदवारद्वारा पेश गरिएको शैक्षिक योग्यता, अनुभव र अभिप्रेरणा पत्रको छनोट समितिद्वारा विस्तृत रुजु तथा मूल्याङ्कन।',
      icon: FileText,
      duration: 'Rolling Basis',
    },
    {
      num: '02',
      code: 'PHONE_INTERVIEW',
      titleEn: 'Stage 2: Phone Interview',
      titleNe: 'दोस्रो चरण: टेलिफोन अन्तर्वार्ता',
      descEn:
        'A 15-20 minute structured conversational screening call assessing teaching mindset, resilience, and fellowship commitment.',
      descNe:
        'उम्मेदवारको शिक्षण अभिरुचि, प्रतिकूल परिस्थितिमा अनुकूलन क्षमता र प्रतिबद्धता बुझ्न १५-२० मिनेटको टेलिफोन संवाद।',
      icon: PhoneCall,
      duration: '15-20 mins',
    },
    {
      num: '03',
      code: 'ASC',
      titleEn: 'Stage 3: Assessment Center (ASC)',
      titleNe: 'तेस्रो चरण: मूल्याङ्कन केन्द्र (ASC)',
      descEn:
        'Rigorous full-day assessment featuring simulated micro-teaching sessions, collaborative group activities, and panel interview.',
      descNe:
        'नमुना शिक्षण (Micro-teaching), समूह कार्य र व्यक्तिगत अन्तर्वार्तामार्फत प्रत्यक्ष क्षमता मूल्याङ्कन।',
      icon: Award,
      duration: '1 Day Intensive',
    },
    {
      num: '04',
      code: 'PARENTS_MEET',
      titleEn: "Stage 4: Parents' & Guardians' Meet",
      titleNe: 'चौथो चरण: अभिभावक भेटघाट',
      descEn:
        'Open consultation with finalists and their parents to ensure transparent understanding of rural placement, safety, and community immersion.',
      descNe:
        '२ वर्षे ग्रामीण बसाइ, आवास सुरक्षा र फेलोसिप यात्राबारे उम्मेदवार र अभिभावकसँग परामर्श तथा संवाद।',
      icon: Users,
      duration: 'Half Day',
    },
    {
      num: '05',
      code: 'SAATHI_SCHOOL',
      titleEn: 'Stage 5: 24-Day Saathi Summer School',
      titleNe: 'पाँचौं चरण: साथी समर स्कुल (२४ दिने तालिम)',
      descEn:
        'Intensive residential pedagogical academy covering child-centered instructional methods, lesson design, and leadership practice.',
      descNe:
        'बालकेन्द्रित शिक्षण विधि, दैनिक पाठयोजना निर्माण र नेतृत्व कला विकासका लागि २४ दिने विशेष आवासीय तालिम शिविर।',
      icon: GraduationCap,
      duration: '24 Days Residential',
    },
    {
      num: '06',
      code: 'PLACEMENT',
      titleEn: 'Stage 6: School Placement & Deployment',
      titleNe: 'छैटौं चरण: विद्यालय पदस्थापन तथा यात्रा सुरु',
      descEn:
        'Official deployment to rural partner community schools across Nepal to commence your transformative 2-year fellowship journey.',
      descNe:
        'नेपालका दुर्गम सामुदायिक विद्यालयहरूमा आधिकारिक पदस्थापन भई २ वर्षे शिक्षण यात्राको प्रारम्भ।',
      icon: MapPin,
      duration: '2 Years Full-Time',
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Header */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-8 border-b border-stone-200 dark:border-stone-800 bg-gradient-to-b from-stone-50 via-stone-100/60 to-white dark:from-stone-950 dark:via-stone-900/60 dark:to-stone-950">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 text-xs font-semibold shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Selection & Progression Journey</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-heading font-extrabold text-stone-900 dark:text-stone-50 tracking-tight">
            {isNe ? 'छनोट प्रक्रिया तथा चरणहरू' : 'STP Selection Process & Stages'}
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-stone-600 dark:text-stone-300 leading-relaxed">
            {isNe
              ? 'पारदर्शी, योग्यतामा आधारित र निष्पक्ष मूल्याङ्कन प्रणालीमार्फत योग्य युवाहरूको छनोट गरिन्छ।'
              : 'Our 6-stage recruitment journey is designed to evaluate passion, instructional potential, grit, and cultural adaptability through rigorous, fair assessment.'}
          </p>
        </div>
      </section>

      {/* Stepper Timeline */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <div className="space-y-6">
          {stages.map((stage, idx) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.code}
                className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col sm:flex-row gap-5 items-start relative hover:border-emerald-500/50 transition-all"
              >
                <div className="flex items-center gap-3 shrink-0">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="sm:hidden font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    {stage.num}
                  </div>
                </div>

                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                      {isNe ? stage.titleNe : stage.titleEn}
                    </h3>
                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                      {stage.duration}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                    {isNe ? stage.descNe : stage.descEn}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Banner */}
        <div className="mt-12 text-center p-8 rounded-2xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-4">
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
            {isNe ? 'पहिलो चरणको लागि तयार हुनुहुन्छ?' : 'Ready to Start Stage 1?'}
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 max-w-md mx-auto">
            {isNe
              ? 'अनलाइन आवेदन फारम भर्नुहोस्। तपाईंको प्रगति सुरक्षित राख्दै कुनै पनि समयमा पूरा गर्न सकिन्छ।'
              : 'Submit your online application and take the first step towards an inspiring 2-year journey.'}
          </p>
          <Link
            href="/apply"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-md transition-all"
          >
            <span>{isNe ? 'अनलाइन दरखास्त फारम' : 'Start Online Application'}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
