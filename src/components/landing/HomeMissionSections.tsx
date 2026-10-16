'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
  TrendingDown,
  AlertTriangle,
  GraduationCap,
  Compass,
  Quote,
  ShieldCheck,
  Heart,
} from 'lucide-react';
import { HomeVideosSection } from './HomeVideosSection';

interface HomeMissionSectionsProps {
  isDeadlineOpen: boolean;
  userRole?: string | null;
  existingAppRef?: string | null;
}

export function HomeMissionSections({
  isDeadlineOpen,
  userRole,
  existingAppRef,
}: HomeMissionSectionsProps) {
  return (
    <div className="w-full space-y-16 sm:space-y-24 py-8 sm:py-16">
      {/* 1. National Vision Card */}
      <motion.section
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6 }}
        className="max-w-5xl mx-auto px-4 sm:px-6"
      >
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-emerald-900 via-stone-900 to-emerald-950 text-white shadow-xl border border-emerald-800/60 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Our Vision for Nepal</span>
            </div>

            <p className="font-heading text-xl sm:text-2xl lg:text-3xl font-medium leading-relaxed text-stone-100">
              A Nepal where, through strengthened primary education, all children complete a strong
              foundational education and grow into empowered citizens capable of contributing to an
              equitable global society.
            </p>
          </div>
        </div>
      </motion.section>

      {/* 2. Postal Code & Specialism */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4 max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
            <GraduationCap className="h-3.5 w-3.5 text-emerald-600" />
            <span>Equal Educational Opportunities</span>
          </div>

          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold text-stone-900 dark:text-stone-50 tracking-tight leading-tight">
            A child’s postal code should not limit their potential
          </h2>

          <p className="text-base sm:text-lg text-stone-600 dark:text-stone-300 leading-relaxed font-normal">
            Saathi Teachers Programme (STP) recruits motivated young educators and places them in
            two-year paid placements across rural primary schools, where Saathi Teachers are needed most.
            While early education is too often treated as a stepping stone, STP treats it as a
            critical specialism.
          </p>
        </motion.div>

        {/* Foundation Crisis Highlight Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="p-6 sm:p-8 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-300/80 dark:border-amber-800/60 text-center shadow-xs"
        >
          <div className="max-w-3xl mx-auto space-y-2">
            <p className="font-heading font-bold text-lg sm:text-xl text-stone-900 dark:text-stone-100">
              The{' '}
              <span className="text-amber-600 dark:text-amber-400 underline decoration-amber-500 decoration-2 underline-offset-4">
                FOUNDATION
              </span>{' '}
              of our{' '}
              <span className="text-amber-600 dark:text-amber-400 underline decoration-amber-500 decoration-2 underline-offset-4">
                EDUCATION
              </span>{' '}
              is in crisis, but it can be{' '}
              <span className="text-amber-600 dark:text-amber-400 underline decoration-amber-500 decoration-2 underline-offset-4">
                CHANGED
              </span>
              !
            </p>
            <p className="text-sm sm:text-base text-stone-600 dark:text-stone-300 font-medium">
              The Saathi Teachers Programme is dedicated to transforming early childhood and primary
              education across rural Nepal.
            </p>
          </div>
        </motion.div>
      </section>

      {/* 3. Why Join The Saathi Mission & Dropout Crisis Statistics */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6 }}
          className="rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xl overflow-hidden p-6 sm:p-10 space-y-8"
        >
          <div className="space-y-4 text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold">
              <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
              <span>National Enrollment & Retention Realities</span>
            </div>

            <h2 className="font-heading text-2xl sm:text-4xl font-extrabold text-stone-900 dark:text-stone-50 tracking-tight">
              Why Join The Saathi Mission: To Transform The Way Children Receive Education
            </h2>

            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed text-justify sm:text-center">
              In Nepal more than half of all students enrolled in public (government) schools will
              never finish. In 2014, approximately 1.13 million students were enrolled in Grade 1
              in Nepal, a figure stated in the government report. Out of which, 7.8 million were
              enrolled in the government/public school system and the remaining 3.8 million private
              schools. In 2024, only 444,785 of those students appeared for its 10th grade exams,
              which means, 685,215 students who enrolled in Grade 1 in 2014 dropped out before they
              reached 10th grade.
            </p>
          </div>

          {/* 3 UI-Aligned Metric Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 pt-2">
            {/* Stat 1 */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="p-6 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 text-center shadow-xs space-y-2"
            >
              <div className="inline-flex p-2 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                <TrendingDown className="h-5 w-5" />
              </div>
              <div className="font-heading font-black text-3xl sm:text-4xl text-rose-700 dark:text-rose-400 tracking-tight">
                685,215
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-rose-950/80 dark:text-rose-300/80">
                Primary dropouts before Grade 10
              </div>
            </motion.div>

            {/* Stat 2 */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="p-6 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 text-center shadow-xs space-y-2"
            >
              <div className="inline-flex p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="font-heading font-black text-3xl sm:text-4xl text-amber-700 dark:text-amber-400 tracking-tight">
                36 of 100
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-950/80 dark:text-amber-300/80">
                Leave school before Grade 10
              </div>
            </motion.div>

            {/* Stat 3 */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="p-6 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 text-center shadow-xs space-y-2"
            >
              <div className="inline-flex p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="font-heading font-black text-3xl sm:text-4xl text-emerald-700 dark:text-emerald-400 tracking-tight">
                97.5%
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-950/80 dark:text-emerald-300/80">
                Initial Grade 1 enrollment
              </div>
            </motion.div>
          </div>

          {/* Follow-up Note */}
          <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-800 text-center">
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed font-medium">
              Despite increased enrollment in school level at 97.5% with relatively high investment
              from the government, high drop out remains a challenge. Out of 100 students enrolled
              in grade one, 36 students leave their study by the time they reach grade 10.
            </p>
          </div>
        </motion.div>
      </section>

      {/* 4. Rural Crisis Quote & Impact Call */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6 }}
          className="p-8 sm:p-12 rounded-3xl bg-stone-100/70 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 text-center space-y-6 shadow-sm"
        >
          <div className="inline-flex p-3 rounded-2xl bg-white dark:bg-stone-800 shadow-xs border border-stone-200/80 dark:border-stone-700">
            <Quote className="h-6 w-6 text-emerald-600" />
          </div>

          <blockquote className="font-heading text-xl sm:text-3xl font-bold text-stone-900 dark:text-stone-50 leading-snug max-w-2xl mx-auto">
            “We are seeing a crisis in the rural communities in Nepal where there is not only a huge
            shortage of Saathi Teachers, but also where children are going to school and not learning
            anything.”
          </blockquote>

          <p className="text-base sm:text-lg font-semibold text-emerald-700 dark:text-emerald-400">
            With your help we can make life-changing and long-lasting improvements to Education.
          </p>
        </motion.div>
      </section>

      {/* 5. Video Showcase Section (YouTube Videos 1 & 2) */}
      <HomeVideosSection />

      {/* 6. Grand Final Call to Action */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-emerald-800 to-teal-800 text-white shadow-xl text-center space-y-6"
        >
          <div className="space-y-3 max-w-2xl mx-auto">
            <span className="px-3 py-1 rounded-full bg-white/15 text-xs font-semibold uppercase tracking-wider text-emerald-200 inline-block">
              STP Cohort 2027 Admissions
            </span>
            <h3 className="font-heading text-2xl sm:text-4xl font-extrabold tracking-tight">
              Ready to Transform Rural Classrooms?
            </h3>
            <p className="text-xs sm:text-base text-emerald-100">
              Join motivated young leaders across Nepal. Check your eligibility in seconds or start your application today.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {isDeadlineOpen ? (
              existingAppRef ? (
                <Link
                  href={`/apply/confirmation?ref=${existingAppRef}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white text-emerald-950 font-bold text-sm shadow-md hover:bg-emerald-50 transition-all hover:scale-[1.02]"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>View Submitted Application ({existingAppRef})</span>
                </Link>
              ) : (
                <>
                  <Link
                    href="/apply"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white text-emerald-950 font-bold text-sm shadow-md hover:bg-emerald-50 transition-all hover:scale-[1.02]"
                  >
                    <span>Become A Saathi Teacher</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/apply"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-emerald-900/60 hover:bg-emerald-900/80 border border-white/20 text-white font-semibold text-sm transition-all"
                  >
                    <Compass className="h-4 w-4 text-emerald-300" />
                    <span>Check Your Eligibility</span>
                  </Link>
                </>
              )
            ) : (
              <div className="p-3 px-6 rounded-xl bg-emerald-900/60 text-emerald-200 text-sm font-semibold">
                Applications for Cohort 2027 are closed.
              </div>
            )}
          </div>
        </motion.div>
      </section>
    </div>
  );
}
