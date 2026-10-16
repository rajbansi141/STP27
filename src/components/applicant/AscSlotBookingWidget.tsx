'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Download,
  Users,
  ShieldCheck,
  Loader2,
  FileText,
  Sparkles,
  ArrowRight,
  Info,
  CalendarCheck,
  Eye,
  Printer,
  ExternalLink,
} from 'lucide-react';
import {
  AscSessionConfig,
  AscBooking,
  AscDateSlot,
  DEFAULT_ASC_CONFIG,
} from '@/lib/constants/applicationReview';
import {
  getAscSlotAvailabilityAction,
  bookAscSlotAction,
} from '@/app/api/asc/actions';
import { downloadAscPassPdf } from '@/lib/pdf/ascPassGenerator';
import { AscAdmitPassPreviewModal } from './AscAdmitPassPreviewModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AscSlotBookingWidgetProps {
  applicationId: string;
  refNo: string;
  candidateName: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  address?: string | null;
  degree?: string | null;
  existingBooking?: AscBooking | null;
  locale?: string;
  onBookingSuccess?: () => void;
}

export function AscSlotBookingWidget({
  applicationId,
  refNo,
  candidateName,
  email,
  phone,
  subject,
  address,
  degree,
  existingBooking,
  locale = 'en',
  onBookingSuccess,
}: AscSlotBookingWidgetProps) {
  const isNe = locale === 'ne';
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [config, setConfig] = useState<AscSessionConfig>(DEFAULT_ASC_CONFIG);
  const [slots, setSlots] = useState<AscDateSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(true);

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);
  const [isRebooking, setIsRebooking] = useState<boolean>(false);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Load live slots and availability
  const loadAvailability = async () => {
    try {
      setLoadingSlots(true);
      const res = await getAscSlotAvailabilityAction();
      if (res.success) {
        setConfig(res.config);
        setSlots(res.slots);
      }
    } catch (err) {
      console.error('Failed to load ASC slot availability:', err);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    loadAvailability();
  }, []);

  const [activeBooking, setActiveBooking] = useState<AscBooking | null>(
    existingBooking || null
  );
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  useEffect(() => {
    if (existingBooking) {
      setActiveBooking(existingBooking);
    }
  }, [existingBooking]);

  const currentBooking = activeBooking;
  const isBooked = Boolean(currentBooking?.bookedDate && !isRebooking);

  const handleDownloadPdf = () => {
    if (!currentBooking) return;
    downloadAscPassPdf({
      refNo,
      candidateName,
      email,
      phone,
      subject,
      address,
      degree,
      booking: currentBooking,
    });
  };

  const handleConfirmBooking = () => {
    if (!selectedDate) return;
    setFeedback(null);

    startTransition(async () => {
      const res = await bookAscSlotAction({
        applicationId,
        chosenDate: selectedDate,
      });

      if (res.success) {
        const newBooking: AscBooking = res.booking || {
          bookedDate: selectedDate,
          bookedAt: new Date().toISOString(),
          venue: config.venue,
          reportingTime: config.reportingTime,
          status: 'CONFIRMED',
        };
        setActiveBooking(newBooking);
        setFeedback({
          type: 'success',
          text:
            isNe
              ? 'तपाईंको ASC मूल्याङ्कन सिट सफलतापूर्वक बुक भयो!'
              : 'Your ASC assessment slot has been confirmed successfully!',
        });
        setConfirmModalOpen(false);
        setIsRebooking(false);
        loadAvailability();
        router.refresh();
        if (onBookingSuccess) onBookingSuccess();
      } else {
        setFeedback({
          type: 'error',
          text: res.message || 'Failed to book slot. Please choose another date.',
        });
        setConfirmModalOpen(false);
        loadAvailability();
      }
    });
  };

  const selectedSlotMeta = slots.find((s) => s.date === selectedDate);
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    currentBooking?.venue || config.venue || 'Sanothimi Bhaktapur Nepal'
  )}`;

  return (
    <div className="rounded-2xl border border-emerald-300 dark:border-emerald-800/80 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/40 p-5 sm:p-6 shadow-xs space-y-5">
      {/* 1. Header & Stage Title */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-emerald-200/80 dark:border-emerald-800/60">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-700 text-white shadow-md shadow-emerald-700/20 shrink-0 mt-0.5">
            <CalendarCheck className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-heading font-extrabold text-base sm:text-lg text-emerald-950 dark:text-emerald-50">
                {isNe
                  ? 'ASC - मिति तथा सिट छनोट'
                  : 'ASC - Slot Booking & Admit Pass'}
              </h3>
              {isBooked ? (
                <span className="font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>{isNe ? 'सिट निश्चित भएको' : 'Seat Confirmed'}</span>
                </span>
              ) : (
                <span className="font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{isNe ? 'सिट छनोट बाँकी' : 'Booking Required'}</span>
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-emerald-900/90 dark:text-emerald-200/90 leading-relaxed">
              {isNe
                ? 'बधाई छ! तपाईं साथी शिक्षक कार्यक्रम २०२७ को तेस्रो चरण "ASC" का लागि छनोट हुनुभएको छ। तल दिइएका उपलब्ध मितिहरूमध्ये आफूलाई पायक पर्ने १ दिन छनोट गर्नुहोस्।'
                : 'Congratulations! You have advanced to the ASC stage. Please choose your preferred assessment date from the available slots below.'}
            </p>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300'
              : 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200 border border-red-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* 2. CASE A: SLOT IS ALREADY BOOKED -> SHOW ADMIT PASS & DOWNLOAD BUTTON */}
      {isBooked && currentBooking && (
        <div className="bg-white/90 dark:bg-stone-900/90 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200 dark:border-stone-800">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 block mb-1">
                {isNe ? 'आधिकारिक प्रवेशपत्र तथा स्थान विवरण' : 'Official ASC Admit Confirmation & Venue Pass'}
              </span>
              <h4 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {isNe
                  ? 'तपाईंको मूल्याङ्कन सिट निश्चित भएको छ'
                  : 'Your Assessment Slot & Seat are Confirmed'}
              </h4>
            </div>

            {/* Action Buttons: Direct PDF Download & Live Pass Preview */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Direct Server-Streaming Download Link */}
              <a
                href={`/api/asc/admit-pass/${applicationId}`}
                download={`ASC_Admit_Pass_${refNo}.pdf`}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-700/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                title="Direct PDF Download"
              >
                <Download className="h-4 w-4" />
                <span>
                  {isNe
                    ? 'प्रवेशपत्र डाउनलोड (PDF)'
                    : 'Download Official PDF Pass'}
                </span>
              </a>

              {/* View & Print Pass Modal Trigger */}
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white hover:bg-stone-50 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-800 dark:text-stone-200 font-semibold text-xs sm:text-sm transition-all cursor-pointer shadow-2xs"
              >
                <Eye className="h-4 w-4 text-emerald-600" />
                <span>{isNe ? 'हेर्नुहोस् र प्रिन्ट गर्नुहोस्' : 'View & Print Pass'}</span>
              </button>
            </div>
          </div>

          {/* Candidate Identity Particulars Strip */}
          <div className="p-3.5 rounded-xl bg-stone-50/80 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                {refNo}
              </span>
              <strong className="text-stone-900 dark:text-stone-100 text-xs sm:text-sm">{candidateName}</strong>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-600 dark:text-stone-300">
              <span><strong>Subject:</strong> {subject || 'Grade Teaching'}</span>
              <span>•</span>
              <span><strong>Phone:</strong> {phone || '—'}</span>
              <span>•</span>
              <span><strong>Address:</strong> {address || 'Nepal'}</span>
            </div>
          </div>

          {/* Confirmed Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
            {/* Booked Date Box */}
            <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 space-y-1">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                {isNe ? 'निश्चित भएको मिति' : 'Confirmed Date'}
              </span>
              <div className="flex items-center gap-2 font-bold text-stone-900 dark:text-stone-100 text-sm">
                <CalendarIcon className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{currentBooking.bookedDate}</span>
              </div>
              <p className="text-[11px] text-stone-500">
                {new Date(currentBooking.bookedDate).toLocaleDateString(
                  isNe ? 'ne-NP' : 'en-US',
                  { weekday: 'long' }
                )}
              </p>
            </div>

            {/* Reporting Time */}
            <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 space-y-1">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                {isNe ? 'उपस्थिति समय' : 'Mandatory Reporting Time'}
              </span>
              <div className="flex items-center gap-2 font-bold text-stone-900 dark:text-stone-100 text-sm">
                <Clock className="h-4 w-4 text-teal-600 shrink-0" />
                <span>{currentBooking.reportingTime || config.reportingTime}</span>
              </div>
              <p className="text-[11px] text-stone-500 font-medium text-rose-600 dark:text-rose-400">
                {isNe ? 'गेट बिहान ०८:४५ मा बन्द हुनेछ' : 'Gates close promptly at 08:45 AM'}
              </p>
            </div>

            {/* Venue Address & Maps Link */}
            <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 space-y-1 sm:col-span-2 lg:col-span-1 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                  {isNe ? 'स्थान / सेन्टर' : 'Assessment Center / Venue'}
                </span>
                <div className="flex items-start gap-2 font-medium text-stone-900 dark:text-stone-100 text-xs mt-0.5">
                  <MapPin className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{currentBooking.venue || config.venue}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-stone-200/60 dark:border-stone-700/60">
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  <MapPin className="h-3 w-3" />
                  <span>{isNe ? 'गुगल नक्सामा दिशा हेर्नुहोस्' : 'Open in Google Maps →'}</span>
                </a>
              </div>
            </div>
          </div>

          {/* Checklist Preview */}
          <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 text-xs space-y-2">
            <h5 className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5 text-xs">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              <span>
                {isNe
                  ? 'मूल्याङ्कन दिनमा अनिवार्य साथमा ल्याउनुपर्ने कागजातहरू:'
                  : 'Mandatory Requirements for Assessment Day:'}
              </span>
            </h5>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-emerald-950 dark:text-emerald-300 list-disc list-inside">
              <li>{isNe ? 'नेपाली नागरिकताको सक्कल प्रमाणपत्र' : 'Original Nepali Citizenship Card / National ID'}</li>
              <li>{isNe ? 'स्नातक तहका सक्कल ट्रान्सक्रिप्ट तथा चारित्रिक प्रमाणपत्र' : "Original Bachelor's Degree Transcripts & Certificates"}</li>
              <li>{isNe ? '२ प्रति हालसालै खिचिएको पासपोर्ट साइजको फोटो' : 'Two (2) recent passport-sized color photographs'}</li>
              <li>{isNe ? 'प्रवेशपत्रको प्रिन्ट वा डिजिटल कपी' : 'Printed copy of this official Admit Pass'}</li>
            </ul>
          </div>

          {/* Change Date Option */}
          <div className="pt-1 flex items-center justify-between text-xs text-stone-500">
            <span>
              {isNe
                ? 'मिति परिवर्तन गर्नुपरेमा नयाँ सिट छनोट गर्नुहोस्:'
                : 'Need to reschedule your session date?'}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsRebooking(true);
                setSelectedDate(currentBooking.bookedDate);
              }}
              className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
            >
              {isNe ? 'नयाँ मिति छनोट गर्नुहोस् →' : 'Select Another Date →'}
            </button>
          </div>
        </div>
      )}

      {/* 3. CASE B: NOT BOOKED YET OR REBOOKING -> INTERACTIVE SHADCN SLOT PICKER */}
      {(!isBooked || isRebooking) && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 block">
                {isNe ? 'उपलब्ध मिति र सिट संख्या:' : 'Select Available Date & Capacity:'}
              </span>
              <p className="text-xs text-stone-600 dark:text-stone-300">
                {isNe
                  ? `प्रशासकद्वारा तोकिएको मिति दायरा: ${config.startDate} देखि ${config.endDate} सम्म (दैनिक कोटा: ${config.dailyQuota} जना)`
                  : `Admin-scheduled Window: ${config.startDate} to ${config.endDate} (Daily Quota: ${config.dailyQuota} seats/day)`}
              </p>
            </div>

            {isRebooking && (
              <button
                type="button"
                onClick={() => setIsRebooking(false)}
                className="text-xs font-semibold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 cursor-pointer self-start sm:self-auto"
              >
                {isNe ? 'रद्द गरी पुरानै सिट राख्नुहोस्' : 'Cancel & Keep Current Slot'}
              </button>
            )}
          </div>

          {/* Slots Grid */}
          {loadingSlots ? (
            <div className="p-8 rounded-2xl bg-white/80 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-800 flex items-center justify-center gap-2 text-xs text-stone-500">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
              <span>{isNe ? 'उपलब्ध सिटहरू लोड हुँदैछ...' : 'Loading live seat availability...'}</span>
            </div>
          ) : slots.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white/80 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-800 text-center text-xs text-stone-500">
              {isNe
                ? 'हाल कुनै पनि मिति सक्रिय छैन। कृपया प्रशासकलाई सम्पर्क गर्नुहोस्।'
                : 'No assessment dates are currently active. Please contact administrator.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {slots.map((slot) => {
                const isSelected = selectedDate === slot.date;
                const isCurrent = currentBooking?.bookedDate === slot.date;

                return (
                  <button
                    key={slot.date}
                    type="button"
                    disabled={slot.isFull}
                    onClick={() => {
                      if (!slot.isFull) {
                        setSelectedDate(slot.date);
                      }
                    }}
                    className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-3 cursor-pointer disabled:cursor-not-allowed ${
                      slot.isFull
                        ? 'bg-stone-100/70 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800 opacity-60'
                        : isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20 scale-[1.01]'
                        : 'bg-white dark:bg-stone-900/90 border-emerald-200/90 dark:border-stone-800 hover:border-emerald-500 hover:shadow-xs'
                    }`}
                  >
                    {/* Top Row: Date & Day */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-bold uppercase tracking-wider ${
                            isSelected
                              ? 'text-emerald-100'
                              : 'text-stone-500 dark:text-stone-400'
                          }`}
                        >
                          {isNe ? slot.dayNameNe : slot.dayOfWeek}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                            {isNe ? 'हालको सिट' : 'Current'}
                          </span>
                        )}
                      </div>

                      <div
                        className={`text-base font-extrabold font-mono ${
                          isSelected
                            ? 'text-white'
                            : 'text-stone-900 dark:text-stone-100'
                        }`}
                      >
                        {slot.date}
                      </div>
                    </div>

                    {/* Bottom Row: Seat Availability Pill */}
                    <div className="pt-2 border-t border-stone-100/40 dark:border-stone-800/40 flex items-center justify-between text-xs">
                      {slot.isFull ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300">
                          ✕ {isNe ? 'सिट भरिएको' : 'Quota Full'}
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Users
                            className={`h-3.5 w-3.5 ${
                              isSelected ? 'text-emerald-200' : 'text-emerald-600'
                            }`}
                          />
                          <span
                            className={`text-[11px] font-semibold ${
                              isSelected
                                ? 'text-emerald-100'
                                : slot.remainingSeats <= 3
                                ? 'text-amber-600 dark:text-amber-400 font-bold'
                                : 'text-stone-700 dark:text-stone-300'
                            }`}
                          >
                            {isNe
                              ? `${slot.remainingSeats} सिट बाँकी`
                              : `${slot.remainingSeats} / ${slot.totalQuota} left`}
                          </span>
                        </div>
                      )}

                      {isSelected && (
                        <CheckCircle2 className="h-4 w-4 text-white shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Action Button to Confirm */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 dark:bg-stone-900/80 p-4 rounded-xl border border-emerald-200 dark:border-stone-800">
            <div className="text-xs">
              {selectedDate ? (
                <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    {isNe ? 'तपाईंले रोज्नुभएको मिति:' : 'Selected Assessment Date:'}{' '}
                    <strong className="text-emerald-800 dark:text-emerald-300 text-sm font-mono">
                      {selectedDate}
                    </strong>{' '}
                    ({selectedSlotMeta?.dayOfWeek})
                  </span>
                </div>
              ) : (
                <span className="text-stone-500">
                  {isNe
                    ? 'कृपया माथिबाट उपलब्ध मिति छनोट गर्नुहोस्।'
                    : 'Please click on an available date card above to proceed.'}
                </span>
              )}
            </div>

            <button
              type="button"
              disabled={!selectedDate || isPending}
              onClick={() => setConfirmModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              <span>{isNe ? 'सिट निश्चित गर्नुहोस्' : 'Confirm & Reserve Slot'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= CONFIRMATION MODAL ================= */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <CalendarCheck className="h-5 w-5 text-emerald-600" />
              <span>
                {isNe ? 'मूल्याङ्कन मिति पुष्टि गर्नुहोस्' : 'Confirm ASC Assessment Slot'}
              </span>
            </DialogTitle>
            <DialogDescription>
              {isNe
                ? `तपाईंले ASC का लागि ${selectedDate} मिति रोज्नुभएको छ।`
                : `You are booking your assessment slot for ${selectedDate} at ${config.venue}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-stone-500">{isNe ? 'उम्मेदवारको नाम:' : 'Candidate:'}</span>
              <strong className="text-stone-900 dark:text-stone-100">{candidateName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">{isNe ? 'दर्ता नम्बर:' : 'Reference No:'}</span>
              <strong className="text-stone-900 dark:text-stone-100 font-mono">{refNo}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">{isNe ? 'छनोट मिति:' : 'Selected Date:'}</span>
              <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{selectedDate}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">{isNe ? 'उपस्थिति समय:' : 'Reporting Time:'}</span>
              <strong className="text-stone-900 dark:text-stone-100">{config.reportingTime}</strong>
            </div>
            <div className="pt-2 border-t border-stone-200 dark:border-stone-700 text-[11px] text-stone-500">
              {isNe ? 'स्थान:' : 'Venue:'} {config.venue}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => setConfirmModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              {isNe ? 'रद्द गर्नुहोस्' : 'Cancel'}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleConfirmBooking}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{isNe ? 'सिट बुक गरिँदैछ...' : 'Reserving Seat...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{isNe ? 'निश्चित गर्नुहोस्' : 'Confirm Booking'}</span>
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Live Admit Pass & Venue Preview Modal */}
      {currentBooking && (
        <AscAdmitPassPreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          applicationId={applicationId}
          refNo={refNo}
          candidateName={candidateName}
          email={email}
          phone={phone}
          subject={subject}
          address={address}
          degree={degree}
          booking={currentBooking}
          locale={locale}
        />
      )}
    </div>
  );
}
