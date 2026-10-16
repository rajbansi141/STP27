'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calendar,
  Clock,
  MapPin,
  Download,
  Printer,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { AscBooking } from '@/lib/constants/applicationReview';

interface AscAdmitPassPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  refNo: string;
  candidateName: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  address?: string | null;
  degree?: string | null;
  booking: AscBooking;
  locale?: string;
}

export function AscAdmitPassPreviewModal({
  isOpen,
  onClose,
  applicationId,
  refNo,
  candidateName,
  email,
  phone,
  subject,
  address,
  degree,
  booking,
  locale = 'en',
}: AscAdmitPassPreviewModalProps) {
  const isNe = locale === 'ne';
  const [copiedRef, setCopiedRef] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyRef = () => {
    navigator.clipboard.writeText(refNo);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const formattedDate = new Date(booking.bookedDate).toLocaleDateString(
    isNe ? 'ne-NP' : 'en-US',
    {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }
  );

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    booking.venue || 'Sanothimi Bhaktapur Nepal'
  )}`;

  const sessionCode = `ASC-${booking.bookedDate.replace(/-/g, '')}-${refNo.slice(-4)}`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[96vw] max-w-4xl sm:max-w-4xl md:max-w-4xl max-h-[92vh] overflow-y-auto p-0 rounded-3xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 shadow-2xl focus:outline-none">
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #asc-admit-pass-card,
            #asc-admit-pass-card * {
              visibility: visible !important;
            }
            #asc-admit-pass-card {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              border: 1.5px solid #047857 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}</style>

        {/* Top Floating Control Bar (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-stone-200/80 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 sticky top-0 z-20 backdrop-blur-md print:hidden">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle className="text-sm font-bold font-heading text-stone-900 dark:text-stone-100">
                {isNe ? 'आधिकारिक प्रवेशपत्र' : 'Official ASC Admit Pass'}
              </DialogTitle>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                {isNe ? 'साथी शिक्षक कार्यक्रम २०२७' : 'Saathi Teachers Programme 2027'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct PDF Download Link */}
            <a
              href={`/api/asc/admit-pass/${applicationId}`}
              download={`ASC_Admit_Pass_${refNo}.pdf`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isNe ? 'डाउनलोड PDF' : 'Download PDF'}</span>
            </a>

            {/* Print Trigger */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>{isNe ? 'प्रिन्ट' : 'Print'}</span>
            </button>
          </div>
        </div>

        {/* Boarding Pass / Credential Container */}
        <div className="p-4 sm:p-6 space-y-4 print:p-0">
          <div
            id="asc-admit-pass-card"
            className="rounded-2xl border-2 border-emerald-700/80 dark:border-emerald-600/60 bg-white dark:bg-stone-900 overflow-hidden shadow-lg shadow-emerald-950/5"
          >
            {/* Pass Hero Banner */}
            <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 p-5 text-white relative">
              <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-white/5 rounded-full pointer-events-none blur-xl" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-700/60 border border-emerald-500/40 text-[10px] font-bold tracking-widest text-emerald-200 uppercase">
                    <ShieldCheck className="h-3 w-3" />
                    <span>Official Selection Credential</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black font-heading tracking-tight text-white">
                    SAATHI TEACHERS PROGRAMME 2027
                  </h2>
                  <p className="text-xs text-emerald-200/90 font-medium">
                    Assessment Saathi Candidates (ASC) • Official Admit Pass & Gate Pass
                  </p>
                </div>

                <div className="flex flex-col sm:items-end gap-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white font-mono text-xs font-bold">
                    <span>REF: {refNo}</span>
                    <button
                      type="button"
                      onClick={handleCopyRef}
                      title="Copy Reference Number"
                      className="text-emerald-300 hover:text-white transition-colors"
                    >
                      {copiedRef ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                    Seat: Confirmed & Reserved
                  </span>
                </div>
              </div>
            </div>

            {/* Candidate Dossier & QR Code Strip */}
            <div className="p-5 border-b border-stone-200 dark:border-stone-800 grid grid-cols-1 md:grid-cols-3 gap-5 items-center bg-stone-50/50 dark:bg-stone-900/50">
              <div className="md:col-span-2 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-black text-lg border border-emerald-200 dark:border-emerald-800">
                    {candidateName.charAt(0)}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                      Saathi Teacher Candidate
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                      {candidateName}
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                      Specialization Track: <strong className="text-stone-700 dark:text-stone-200">{subject || 'Grade Teaching'}</strong>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                    <span className="text-[10px] text-stone-400 block font-semibold">Contact Mobile</span>
                    <strong className="text-stone-800 dark:text-stone-200 break-words block text-xs mt-0.5">{phone || '—'}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                    <span className="text-[10px] text-stone-400 block font-semibold">Registered Email</span>
                    <span className="text-stone-800 dark:text-stone-200 break-words block text-xs font-medium mt-0.5" title={email}>{email}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                    <span className="text-[10px] text-stone-400 block font-semibold">Qualification</span>
                    <strong className="text-stone-800 dark:text-stone-200 break-words block text-xs mt-0.5" title={degree || "Bachelor's Degree"}>{degree || "Bachelor's Degree"}</strong>
                  </div>
                </div>

                {address && (
                  <div className="pt-1 text-[11px] text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Permanent Address: <strong className="text-stone-800 dark:text-stone-200">{address}</strong></span>
                  </div>
                )}
              </div>

              {/* Digital QR Code Badge */}
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-center space-y-2">
                <div className="h-24 w-24 rounded-xl bg-stone-900 text-white flex items-center justify-center relative overflow-hidden group shadow-inner">
                  {/* Decorative QR Pattern */}
                  <div className="grid grid-cols-5 gap-1 p-2">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-2.5 w-2.5 rounded-xs ${
                          (i % 2 === 0 || i % 7 === 0 || i === 0 || i === 4 || i === 20 || i === 24)
                            ? 'bg-emerald-400'
                            : 'bg-stone-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <span className="font-mono text-[10px] font-bold text-stone-700 dark:text-stone-300 block">
                    {sessionCode}
                  </span>
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold block uppercase">
                    Scan At Security Gate
                  </span>
                </div>
              </div>
            </div>

            {/* Logistics & Schedule Section */}
            <div className="p-5 space-y-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                Assessment Schedule & Venue Details
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0 mt-0.5">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase block">
                      Assigned Exam Date
                    </span>
                    <strong className="text-sm font-extrabold text-stone-900 dark:text-stone-100 block">
                      {booking.bookedDate}
                    </strong>
                    <span className="text-xs text-stone-600 dark:text-stone-400 block">
                      {formattedDate}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/60 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-teal-600 text-white shrink-0 mt-0.5">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-teal-800 dark:text-teal-300 uppercase block">
                      Reporting Time & Cutoff
                    </span>
                    <strong className="text-sm font-extrabold text-stone-900 dark:text-stone-100 block">
                      {booking.reportingTime || '08:30 AM NPT (Sharp)'}
                    </strong>
                    <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      <span>Gates close strictly at 08:45 AM</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Venue Address Card */}
              <div className="p-4 rounded-2xl bg-stone-100/70 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-rose-600 text-white shrink-0 mt-0.5">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-stone-500 uppercase block">
                      Venue Location
                    </span>
                    <strong className="text-stone-900 dark:text-stone-100 block text-sm">
                      {booking.venue || 'Saathi Central Assessment Center, Sanothimi, Bhaktapur'}
                    </strong>
                    <span className="text-[11px] text-stone-500 dark:text-stone-400 block">
                      Sanothimi, Bhaktapur (Near CTEVT / Education Training Center)
                    </span>
                  </div>
                </div>

                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 text-xs font-bold transition-all shadow-xs shrink-0 self-start sm:self-auto"
                >
                  <span>Google Maps</span>
                  <ExternalLink className="h-3 w-3 text-stone-500" />
                </a>
              </div>

              {/* Mandatory Checklist */}
              <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-900/60 text-xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Mandatory Documents Required for Entry:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-stone-700 dark:text-stone-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Original Nepali Citizenship / National ID Card</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Original Bachelor&apos;s Transcript & Certificates</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>2 Passport-size Color Photographs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Printed copy of this ASC Admit Pass</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notice on Data Accuracy & Correction */}
            <div className="px-5 py-2.5 bg-stone-100/60 dark:bg-stone-850 border-t border-stone-200 dark:border-stone-800 text-[11px] text-stone-600 dark:text-stone-400 flex items-center gap-2 print:hidden">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>
                {isNe
                  ? 'विवरण संशोधन: यदि प्रवेशपत्रमा कुनै विवरण (फोन, विषय, डिग्री) फरक परेमा ड्यासबोर्डको स्पष्टीकरण सन्देश वा प्रशासनमार्फत सच्याउन सकिन्छ।'
                  : 'Data Correction: If any particulars (phone, degree, subject) are incorrect, request a correction via committee notes on your dashboard or contact Admissions.'}
              </span>
            </div>

            {/* Pass Footer & Security Seal */}
            <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[10px] text-stone-500 dark:text-stone-400">
              <div className="font-mono">
                SEC-HASH: [STP27-ASC-{refNo}-VERIFIED] • SYSTEM AUTHENTICATED
              </div>
              <div className="text-left sm:text-right">
                <span className="font-bold text-stone-700 dark:text-stone-200 block text-[11px]">
                  Member Secretary
                </span>
                <span>Selection Committee • Saathi Teachers Programme</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
