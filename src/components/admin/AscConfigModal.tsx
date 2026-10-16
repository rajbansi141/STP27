'use client';

import React, { useState, useEffect, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import {
  Calendar,
  CalendarRange,
  Users,
  MapPin,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sliders,
  ExternalLink,
  Plus,
  Minus,
  FileText,
  ShieldCheck,
  Check,
  ChevronRight,
  RefreshCw,
  X,
  Building2,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  AscSessionConfig,
  AscDateSlot,
  DEFAULT_ASC_CONFIG,
} from '@/lib/constants/applicationReview';
import {
  getAscSlotAvailabilityAction,
  updateAscSessionConfigAction,
} from '@/app/api/asc/actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Zod Validation Schema
const ascConfigSchema = z
  .object({
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    dailyQuota: z
      .number()
      .int('Must be a whole number')
      .min(1, 'Daily quota must be at least 1 candidate per day')
      .max(200, 'Daily quota cannot exceed 200 candidates per day'),
    venue: z.string().min(3, 'Venue location or address is required'),
    reportingTime: z.string().min(2, 'Reporting time is required'),
    instructions: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.startDate || !data.endDate) return true;
      return new Date(data.startDate) <= new Date(data.endDate);
    },
    {
      message: 'Start date cannot be after end date',
      path: ['endDate'],
    }
  );

type AscConfigFormValues = z.infer<typeof ascConfigSchema>;

interface AscConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated?: () => void;
}

const NEP_DAYS: Record<string, string> = {
  Sunday: 'आइतबार',
  Monday: 'सोमबार',
  Tuesday: 'मङ्गलबार',
  Wednesday: 'बुधबार',
  Thursday: 'बिहीबार',
  Friday: 'शुक्रबार',
  Saturday: 'शनिबार',
};

const QUOTA_PRESETS = [10, 12, 15, 20, 25, 30];
const TIME_PRESETS = [
  '08:00 AM NPT (Sharp)',
  '08:30 AM NPT (Sharp)',
  '09:00 AM NPT (Sharp)',
  '09:30 AM NPT (Sharp)',
];

const STANDARD_INSTRUCTIONS_TEMPLATE =
  "1. Mandatory Documents: Original Nepali Citizenship Certificate, Bachelor's degree academic transcripts/certificates, and 2 passport-size photographs.\n2. Reporting: Arrive at the venue at least 30 minutes before your scheduled reporting time in formal attire.\n3. Stationery: Bring writing pens (black/blue ballpoint) and a personal notepad.\n4. Conduct: Mobile phones and digital devices must remain switched off during assessment evaluations.";

export function AscConfigModal({
  isOpen,
  onClose,
  onConfigUpdated,
}: AscConfigModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedbackRef] = useAutoAnimate<HTMLDivElement>();
  const [slotsRef] = useAutoAnimate<HTMLDivElement>();

  const [activeTab, setActiveTab] = useState<'settings' | 'slots'>('settings');
  const [slots, setSlots] = useState<AscDateSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AscConfigFormValues>({
    resolver: zodResolver(ascConfigSchema),
    defaultValues: {
      startDate: DEFAULT_ASC_CONFIG.startDate,
      endDate: DEFAULT_ASC_CONFIG.endDate,
      dailyQuota: DEFAULT_ASC_CONFIG.dailyQuota,
      venue: DEFAULT_ASC_CONFIG.venue,
      reportingTime: DEFAULT_ASC_CONFIG.reportingTime,
      instructions: DEFAULT_ASC_CONFIG.instructions || '',
    },
  });

  const watchedStartDate = watch('startDate');
  const watchedEndDate = watch('endDate');
  const watchedDailyQuota = watch('dailyQuota') || 12;
  const watchedVenue = watch('venue') || '';
  const watchedReportingTime = watch('reportingTime') || '';

  // Load active server configuration when opened
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setFeedback(null);
      getAscSlotAvailabilityAction()
        .then((res) => {
          if (res.success && res.config) {
            reset({
              startDate: res.config.startDate,
              endDate: res.config.endDate,
              dailyQuota: res.config.dailyQuota,
              venue: res.config.venue,
              reportingTime: res.config.reportingTime || '08:30 AM NPT (Sharp)',
              instructions: res.config.instructions || '',
            });
            setSlots(res.slots || []);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, reset]);

  // Derived date calculations
  const dateDifferenceDays = useMemo(() => {
    if (!watchedStartDate || !watchedEndDate) return 0;
    const start = new Date(watchedStartDate);
    const end = new Date(watchedEndDate);
    if (start > end) return 0;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [watchedStartDate, watchedEndDate]);

  const totalCalculatedCapacity = useMemo(() => {
    return dateDifferenceDays * (watchedDailyQuota || 0);
  }, [dateDifferenceDays, watchedDailyQuota]);

  // Computed live booking stats from fetched slots
  const totalBookedFromSlots = useMemo(() => {
    return slots.reduce((acc, s) => acc + (s.bookedCount || 0), 0);
  }, [slots]);

  const overallOccupancyPct = useMemo(() => {
    if (!totalCalculatedCapacity) return 0;
    return Math.min(100, Math.round((totalBookedFromSlots / totalCalculatedCapacity) * 100));
  }, [totalBookedFromSlots, totalCalculatedCapacity]);

  // Date range presets helpers
  const handleApplyPresetDays = (days: number) => {
    const start = new Date(watchedStartDate || DEFAULT_ASC_CONFIG.startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + (days - 1));
    setValue('endDate', end.toISOString().split('T')[0], { shouldValidate: true });
  };

  // Google Maps URL detector / link builder
  const mapsLinkInfo = useMemo(() => {
    if (!watchedVenue) return null;
    const trimmed = watchedVenue.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return { isUrl: true, url: trimmed };
    }
    return {
      isUrl: false,
      url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`,
    };
  }, [watchedVenue]);

  const onSubmit = (data: AscConfigFormValues) => {
    setFeedback(null);

    startTransition(async () => {
      const res = await updateAscSessionConfigAction({
        startDate: data.startDate,
        endDate: data.endDate,
        dailyQuota: data.dailyQuota,
        venue: data.venue,
        reportingTime: data.reportingTime,
        instructions: data.instructions,
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          text: res.message || 'ASC session configuration updated!',
        });

        // Refresh slots in modal
        if (res.slots) {
          setSlots(res.slots);
        }

        router.refresh();
        if (onConfigUpdated) onConfigUpdated();

        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setFeedback({
          type: 'error',
          text: res.message || 'Failed to update ASC configuration. Please check permissions.',
        });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl lg:max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl bg-white dark:bg-stone-900 focus:outline-none">
        {/* Header with Emerald Gradient */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-emerald-800 via-teal-900 to-stone-900 text-white shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <Sparkles className="h-3 w-3" />
                  ASC
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-200/70">
                  Session Engine & Quotas
                </span>
              </div>
              <DialogTitle className="text-lg sm:text-xl font-heading font-extrabold text-white tracking-tight flex items-center gap-2">
                <Sliders className="h-5 w-5 text-emerald-400" />
                <span>Schedule Window & Seat Quota Configuration</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-emerald-100/80 max-w-2xl leading-relaxed">
                Configure the multi-day assessment calendar, enforce strict per-day seat quotas, set center venue and reporting times, and monitor live candidate bookings.
              </DialogDescription>
            </div>
          </div>

          {/* Tremor-Style Quick KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-emerald-700/50 text-xs">
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
              <span className="text-[10px] font-semibold text-emerald-200 block uppercase">
                Assessment Window
              </span>
              <span className="font-bold text-sm text-white">
                {dateDifferenceDays > 0 ? `${dateDifferenceDays} Days` : 'Invalid Range'}
              </span>
              <span className="text-[10px] text-emerald-300 block truncate">
                {watchedStartDate || '—'} → {watchedEndDate || '—'}
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
              <span className="text-[10px] font-semibold text-emerald-200 block uppercase">
                Daily Seat Quota
              </span>
              <span className="font-bold text-sm text-white">
                {watchedDailyQuota} Seats / Day
              </span>
              <span className="text-[10px] text-emerald-300 block">
                Strict max per date
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
              <span className="text-[10px] font-semibold text-emerald-200 block uppercase">
                Total Cohort Capacity
              </span>
              <span className="font-bold text-sm text-emerald-300 font-mono">
                {totalCalculatedCapacity} Total Seats
              </span>
              <span className="text-[10px] text-emerald-200 block">
                {dateDifferenceDays} days × {watchedDailyQuota} seats
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
              <span className="text-[10px] font-semibold text-emerald-200 block uppercase">
                Live Bookings
              </span>
              <span className="font-bold text-sm text-white font-mono flex items-center gap-1.5">
                <span>{totalBookedFromSlots} Booked</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/30 text-emerald-200">
                  {overallOccupancyPct}%
                </span>
              </span>
              <span className="text-[10px] text-emerald-300 block">
                {Math.max(0, totalCalculatedCapacity - totalBookedFromSlots)} seats remaining
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation for Compact Screens & Quick View */}
        <div className="flex items-center justify-between px-6 pt-3 pb-1 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Session Rules & Venue</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('slots')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'slots'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Live Slots & Seat Capacity</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono">
                {slots.length}
              </span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-stone-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Admin-Enforced Capacity Constraints</span>
          </div>
        </div>

        {/* Feedback Alert Banner */}
        <div ref={feedbackRef} className="px-6 pt-2">
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 shadow-xs ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-950/60 text-red-900 dark:text-red-200 border border-red-300 dark:border-red-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                )}
                <span>{feedback.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-0.5 rounded cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )}
        </div>

        {/* Form Body with 2-Column Responsive View */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {activeTab === 'settings' ? (
            <div className="space-y-5">
              {/* Card 1: Date Range & Daily Quota */}
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-850/60 border border-stone-200 dark:border-stone-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 dark:border-stone-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <CalendarRange className="h-4 w-4 text-emerald-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
                      1. Assessment Date Range & Daily Seat Limit
                    </h3>
                  </div>
                  {/* Preset Day Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-stone-500 font-semibold">Presets:</span>
                    <button
                      type="button"
                      onClick={() => handleApplyPresetDays(7)}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 transition-colors cursor-pointer"
                    >
                      7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPresetDays(10)}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 transition-colors cursor-pointer"
                    >
                      10 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPresetDays(14)}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 transition-colors cursor-pointer"
                    >
                      14 Days (2 Weeks)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Start Date */}
                  <div className="space-y-1.5">
                    <label className="flex items-center justify-between text-xs font-bold text-stone-700 dark:text-stone-300">
                      <span>Start Date (सुरु मिति):</span>
                      <span className="text-[10px] font-mono text-stone-400">YYYY-MM-DD</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        {...register('startDate')}
                        className={`w-full px-3 py-2.5 rounded-xl bg-white dark:bg-stone-900 border text-xs text-stone-900 dark:text-stone-100 font-mono shadow-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all ${
                          errors.startDate
                            ? 'border-red-400 dark:border-red-600'
                            : 'border-stone-300 dark:border-stone-700'
                        }`}
                      />
                    </div>
                    {errors.startDate && (
                      <p className="text-[11px] text-red-600">{errors.startDate.message}</p>
                    )}
                  </div>

                  {/* End Date */}
                  <div className="space-y-1.5">
                    <label className="flex items-center justify-between text-xs font-bold text-stone-700 dark:text-stone-300">
                      <span>End Date (अन्तिम मिति):</span>
                      <span className="text-[10px] font-mono text-stone-400">YYYY-MM-DD</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        {...register('endDate')}
                        className={`w-full px-3 py-2.5 rounded-xl bg-white dark:bg-stone-900 border text-xs text-stone-900 dark:text-stone-100 font-mono shadow-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all ${
                          errors.endDate
                            ? 'border-red-400 dark:border-red-600'
                            : 'border-stone-300 dark:border-stone-700'
                        }`}
                      />
                    </div>
                    {errors.endDate && (
                      <p className="text-[11px] text-red-600">{errors.endDate.message}</p>
                    )}
                  </div>

                  {/* Daily Quota Stepper & Presets */}
                  <div className="space-y-1.5">
                    <label className="flex items-center justify-between text-xs font-bold text-stone-700 dark:text-stone-300">
                      <span>Daily Quota (दैनिक सिट):</span>
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                        Max / Day
                      </span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setValue('dailyQuota', Math.max(1, (watchedDailyQuota || 1) - 1), {
                            shouldValidate: true,
                          })
                        }
                        className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                        title="Decrease quota by 1"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>

                      <input
                        type="number"
                        min="1"
                        max="200"
                        {...register('dailyQuota', { valueAsNumber: true })}
                        className={`w-full text-center px-2 py-2 rounded-xl bg-white dark:bg-stone-900 border text-sm font-mono font-extrabold text-stone-900 dark:text-stone-100 shadow-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all ${
                          errors.dailyQuota
                            ? 'border-red-400 dark:border-red-600'
                            : 'border-stone-300 dark:border-stone-700'
                        }`}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setValue('dailyQuota', Math.min(200, (watchedDailyQuota || 1) + 1), {
                            shouldValidate: true,
                          })
                        }
                        className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                        title="Increase quota by 1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Quick Quota Pill Selector */}
                    <div className="flex items-center gap-1 pt-1 flex-wrap">
                      {QUOTA_PRESETS.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setValue('dailyQuota', q, { shouldValidate: true })}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer ${
                            watchedDailyQuota === q
                              ? 'bg-emerald-700 text-white shadow-2xs'
                              : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-750'
                          }`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                    {errors.dailyQuota && (
                      <p className="text-[11px] text-red-600">{errors.dailyQuota.message}</p>
                    )}
                  </div>
                </div>

                {/* Calculation Helper Banner */}
                <div className="px-3 py-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200">
                    <Info className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>
                      Total Assessment Capacity: <strong>{dateDifferenceDays} Days</strong> ×{' '}
                      <strong>{watchedDailyQuota} Seats</strong> ={' '}
                      <strong className="underline decoration-emerald-500 font-mono">
                        {totalCalculatedCapacity} candidates maximum
                      </strong>
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                    Enforces strict slot lockout when filled
                  </span>
                </div>
              </div>

              {/* Card 2: Assessment Venue & Reporting Time */}
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-850/60 border border-stone-200 dark:border-stone-800 space-y-4">
                <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-2.5">
                  <Building2 className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
                    2. Assessment Center Venue & Schedule
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Venue Name & Map Link */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-stone-700 dark:text-stone-300">
                      <label>Assessment Center / Venue (स्थान):</label>
                      {mapsLinkInfo && (
                        <a
                          href={mapsLinkInfo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 dark:text-purple-400 hover:underline"
                          title="Verify in Google Maps"
                        >
                          <MapPin className="h-3 w-3" />
                          <span>Verify Map ↗</span>
                        </a>
                      )}
                    </div>

                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                      <input
                        type="text"
                        {...register('venue')}
                        placeholder="Saathi Central Assessment Center, Sanothimi, Bhaktapur"
                        className={`w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-stone-900 border text-xs text-stone-900 dark:text-stone-100 shadow-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all ${
                          errors.venue
                            ? 'border-red-400 dark:border-red-600'
                            : 'border-stone-300 dark:border-stone-700'
                        }`}
                      />
                    </div>
                    <p className="text-[11px] text-stone-500">
                      Can be a descriptive physical address or a shareable Google Maps location link.
                    </p>
                    {errors.venue && (
                      <p className="text-[11px] text-red-600">{errors.venue.message}</p>
                    )}
                  </div>

                  {/* Reporting Time */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                      Reporting Time (उपस्थिति समय):
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                      <input
                        type="text"
                        {...register('reportingTime')}
                        placeholder="08:30 AM NPT (Sharp)"
                        className={`w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-stone-900 border text-xs text-stone-900 dark:text-stone-100 shadow-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all ${
                          errors.reportingTime
                            ? 'border-red-400 dark:border-red-600'
                            : 'border-stone-300 dark:border-stone-700'
                        }`}
                      />
                    </div>

                    {/* Time Presets */}
                    <div className="flex items-center gap-1 pt-1 flex-wrap">
                      {TIME_PRESETS.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setValue('reportingTime', t, { shouldValidate: true })}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                            watchedReportingTime === t
                              ? 'bg-purple-700 text-white font-bold'
                              : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-750'
                          }`}
                        >
                          {t.replace(' NPT (Sharp)', '')}
                        </button>
                      ))}
                    </div>
                    {errors.reportingTime && (
                      <p className="text-[11px] text-red-600">{errors.reportingTime.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 3: Instructions & Admit Pass Guidelines */}
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-850/60 border border-stone-200 dark:border-stone-800 space-y-3">
                <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-emerald-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
                      3. Instructions & Admit Pass Guidelines (निर्देशनहरू)
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setValue('instructions', STANDARD_INSTRUCTIONS_TEMPLATE, {
                        shouldValidate: true,
                      })
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-colors cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Apply Standard Template</span>
                  </button>
                </div>

                <textarea
                  rows={4}
                  {...register('instructions')}
                  placeholder="Provide assessment day instructions, mandatory documents, and reporting protocols..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 text-xs shadow-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-none resize-none leading-relaxed"
                />
                <p className="text-[11px] text-stone-500">
                  These instructions are automatically rendered on every candidate&apos;s downloadable ASC Admit Pass PDF.
                </p>
              </div>
            </div>
          ) : (
            /* Tab 2: Live Slots & Capacity Inspector */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
                    Live Seat Availability & Booking Saturation
                  </h3>
                  <p className="text-xs text-stone-500">
                    Review candidate bookings across individual dates. System locks slots when booked count reaches the quota.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    getAscSlotAvailabilityAction()
                      .then((res) => {
                        if (res.success) setSlots(res.slots);
                      })
                      .finally(() => setLoading(false));
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh Counts</span>
                </button>
              </div>

              {slots.length === 0 ? (
                <div className="p-8 text-center bg-stone-50 dark:bg-stone-850 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700">
                  <Calendar className="h-8 w-8 mx-auto text-stone-400 mb-2" />
                  <p className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                    No active slots computed. Save a valid date range to initialize slots.
                  </p>
                </div>
              ) : (
                <div ref={slotsRef} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {slots.map((s) => {
                    const pct = Math.min(100, Math.round((s.bookedCount / s.totalQuota) * 100));
                    const isFull = s.isFull;
                    const isFilling = pct >= 70 && !isFull;

                    return (
                      <div
                        key={s.date}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                          isFull
                            ? 'bg-red-50/60 dark:bg-red-950/20 border-red-200 dark:border-red-900/60'
                            : isFilling
                            ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
                            : 'bg-white dark:bg-stone-850 border-stone-200 dark:border-stone-750 shadow-2xs'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1 mb-1.5">
                            <span className="font-mono font-bold text-xs text-stone-900 dark:text-stone-100">
                              {s.date}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                isFull
                                  ? 'bg-red-200 dark:bg-red-900/80 text-red-800 dark:text-red-200'
                                  : isFilling
                                  ? 'bg-amber-200 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200'
                                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                              }`}
                            >
                              {isFull ? 'Full' : `${s.remainingSeats} Left`}
                            </span>
                          </div>

                          <div className="text-[11px] text-stone-500 flex items-center justify-between">
                            <span>{s.dayOfWeek}</span>
                            <span className="font-medium text-stone-400">{s.dayNameNe}</span>
                          </div>
                        </div>

                        {/* Capacity Progress Bar */}
                        <div className="mt-3 space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-stone-600 dark:text-stone-400">
                              {s.bookedCount} / {s.totalQuota} booked
                            </span>
                            <span className="font-bold text-stone-800 dark:text-stone-200">
                              {pct}%
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isFull
                                  ? 'bg-red-500'
                                  : isFilling
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-600'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <DialogFooter className="sticky bottom-0 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md pt-3 pb-1 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3">
            <div className="text-[11px] text-stone-500 hidden sm:block">
              Changes apply instantly to candidate date pickers &amp; PDF passes.
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving Schedule &amp; Quotas...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Save ASC Configuration</span>
                  </>
                )}
              </button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
