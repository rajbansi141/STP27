'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  User,
  Phone,
  BookOpen,
  GraduationCap,
  MapPin,
  Calendar,
  Clock,
  Building2,
  FileEdit,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { adminUpdateCandidateDossierAction } from '@/app/api/admin/actions';

interface EditCandidateDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  refNo: string;
  initialData: {
    fullName: string;
    phone: string;
    subject: string;
    degree: string;
    address: string;
    ascBookedDate?: string;
    ascReportingTime?: string;
    ascVenue?: string;
  };
  locale?: string;
}

export function EditCandidateDossierModal({
  isOpen,
  onClose,
  applicationId,
  refNo,
  initialData,
  locale = 'en',
}: EditCandidateDossierModalProps) {
  const isNe = locale === 'ne';
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [fullName, setFullName] = useState(initialData.fullName || '');
  const [phone, setPhone] = useState(initialData.phone || '');
  const [subject, setSubject] = useState(initialData.subject || '');
  const [degree, setDegree] = useState(initialData.degree || '');
  const [address, setAddress] = useState(initialData.address || '');
  const [ascBookedDate, setAscBookedDate] = useState(initialData.ascBookedDate || '');
  const [ascReportingTime, setAscReportingTime] = useState(initialData.ascReportingTime || '');
  const [ascVenue, setAscVenue] = useState(initialData.ascVenue || '');
  const [adminNote, setAdminNote] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const res = await adminUpdateCandidateDossierAction({
        applicationId,
        fullName: fullName.trim(),
        phone: phone.trim(),
        teachingSubject: subject.trim(),
        highestLevel: degree.trim(),
        address: address.trim(),
        ascBookedDate: ascBookedDate.trim() || undefined,
        ascReportingTime: ascReportingTime.trim() || undefined,
        ascVenue: ascVenue.trim() || undefined,
        adminNote: adminNote.trim() || undefined,
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          text: res.message || 'Candidate particulars successfully updated!',
        });
        setTimeout(() => {
          onClose();
          router.refresh();
        }, 1200);
      } else {
        setFeedback({
          type: 'error',
          text: res.message || 'Failed to update candidate particulars.',
        });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[96vw] max-w-2xl sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-stone-100 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-850">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <FileEdit className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold font-heading text-stone-900 dark:text-stone-100">
                {isNe ? 'उम्मेदवार विवरण संशोधन' : 'Edit & Correct Candidate Particulars'}
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-500 dark:text-stone-400">
                Ref: <strong className="font-mono text-stone-700 dark:text-stone-300">{refNo}</strong> • Corrections will reflect on the candidate dashboard, official Admit Pass, and PDF documents.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {feedback && (
            <div
              className={`p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-medium border ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-emerald-600" />
                <span>Candidate Full Name</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-stone-900 dark:text-stone-100"
                placeholder="e.g. Bir Thapa"
              />
            </div>

            {/* Contact Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-emerald-600" />
                <span>Contact Mobile Number</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-medium text-stone-900 dark:text-stone-100"
                placeholder="e.g. 9876543210"
              />
            </div>

            {/* Specialization Track */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-emerald-600" />
                <span>Teaching Track / Subject</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-stone-900 dark:text-stone-100"
                placeholder="e.g. Math, Science, English, Grade Teaching"
              />
            </div>

            {/* Academic Qualification */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-emerald-600" />
                <span>Academic Degree / Qualification</span>
              </label>
              <input
                type="text"
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-stone-900 dark:text-stone-100"
                placeholder="e.g. Master's Degree (Mathematics) / Bachelor's"
              />
            </div>
          </div>

          {/* Permanent Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-emerald-600" />
              <span>Permanent Address</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-stone-900 dark:text-stone-100"
              placeholder="e.g. Lalitpur Metropolitan City-04, Bagmati Province"
            />
          </div>

          {/* ASC Schedule & Venue Section */}
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300 block">
              ASC Assessment Slot & Venue (Optional Override)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-emerald-600" />
                  <span>Assigned Exam Date (YYYY-MM-DD)</span>
                </label>
                <input
                  type="date"
                  value={ascBookedDate}
                  onChange={(e) => setAscBookedDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 font-mono text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-teal-600" />
                  <span>Reporting Time & Cutoff</span>
                </label>
                <input
                  type="text"
                  value={ascReportingTime}
                  onChange={(e) => setAscReportingTime(e.target.value)}
                  placeholder="08:30 AM NPT (Sharp)"
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 flex items-center gap-1">
                <Building2 className="h-3 w-3 text-emerald-600" />
                <span>Assessment Center / Venue</span>
              </label>
              <input
                type="text"
                value={ascVenue}
                onChange={(e) => setAscVenue(e.target.value)}
                placeholder="Saathi Central Assessment Center, Sanothimi, Bhaktapur"
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100"
              />
            </div>
          </div>

          {/* Reason / Admin Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">
              Administrative Correction Note (Logged to Audit History)
            </label>
            <input
              type="text"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="e.g. Corrected 9-digit mobile number typo per candidate phone verification"
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving Updates...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Save & Update Dossier</span>
                </>
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
