'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Video, Sparkles, ExternalLink, Play } from 'lucide-react';

interface VideoItem {
  id: string;
  youtubeId: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
}

const videos: VideoItem[] = [
  {
    id: 'announcement',
    youtubeId: '6mBoxPVTN34',
    badge: 'Cohort Announcement',
    title: 'Applications Are Officially Open for the Cohort!',
    subtitle: 'Helambu Education & Livelihood Partnership (HELP)',
    description:
      'Learn about the cohort recruitment process, key selection criteria, and how motivated young educators can step forward to lead change.',
  },
  {
    id: 'why-join',
    youtubeId: 'QKFLHy1daVY',
    badge: 'Fellowship Journey',
    title: 'Why Join The Saathi Teachers Programme',
    subtitle: 'Impact & Life in Rural Classrooms',
    description:
      'Discover the transformative two-year experience of teaching in rural community schools, mentoring children, and building lasting educational foundations.',
  },
];

export function HomeVideosSection() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
      <div className="space-y-10">
        {/* Section Header matching System UI */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 text-xs font-semibold shadow-xs">
            <Video className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Stories From The Field</span>
          </div>

          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-stone-900 dark:text-stone-50 tracking-tight">
            See the Reality and the Transformation
          </h2>

          <p className="text-sm sm:text-base text-stone-600 dark:text-stone-300 leading-relaxed font-normal">
            Watch official briefings and authentic stories from fellows and classrooms across rural Nepal.
          </p>
        </div>

        {/* Dual Video Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {videos.map((vid, idx) => (
            <motion.div
              key={vid.id}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: idx * 0.15 }}
              className="flex flex-col justify-between rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-lg overflow-hidden group hover:border-emerald-500/40 transition-all"
            >
              <div className="p-4 sm:p-5 space-y-3">
                {/* 16:9 Video Frame */}
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-stone-950 shadow-inner border border-stone-200/70 dark:border-stone-800">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${vid.youtubeId}?rel=0&modestbranding=1`}
                    title={vid.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    loading="lazy"
                    className="absolute inset-0 w-full h-full border-0"
                  />
                </div>

                {/* Metadata & Title */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] uppercase tracking-wider">
                      {vid.badge}
                    </span>
                    <a
                      href={`https://www.youtube.com/watch?v=${vid.youtubeId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors inline-flex items-center gap-1 text-[11px]"
                    >
                      <span>YouTube</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  <h3 className="font-heading font-bold text-base sm:text-lg text-stone-900 dark:text-stone-100 leading-snug">
                    {vid.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                    {vid.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
