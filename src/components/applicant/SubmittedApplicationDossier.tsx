'use client';

import React, { useState } from 'react';
import {
  FileText,
  User,
  GraduationCap,
  Briefcase,
  BookOpen,
  CheckCircle2,
  Printer,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  Phone,
  Mail,
  Download,
  ExternalLink,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import { countWords } from '@/lib/validations/application';

interface SubmittedApplicationDossierProps {
  refNo: string;
  applicantName: string;
  applicantEmail: string;
  submittedAt: string | null;
  stage: string;
  status: string;
  data: Record<string, any>;
  locale?: string;
}

export function SubmittedApplicationDossier({
  refNo,
  applicantName,
  applicantEmail,
  submittedAt,
  stage,
  status,
  data,
  locale = 'en',
}: SubmittedApplicationDossierProps) {
  const isNe = locale === 'ne';
  const [isExpanded, setIsExpanded] = useState(true);

  const formattedDate = submittedAt
    ? new Date(submittedAt).toLocaleDateString(isNe ? 'ne-NP' : 'en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  const experiences = Array.isArray(data.experiences) ? data.experiences : [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Dossier Toggle & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-sm sm:text-base text-stone-900 dark:text-stone-100">
              {isNe ? 'तपाईंको आधिकारिक दरखास्त विवरण (Dossier)' : 'Official Application Dossier'}
            </h3>
            <p className="text-xs text-stone-500">
              {isNe
                ? 'पेश गरिएको फारमको विस्तृत प्रतिलिपि तथा उत्तरहरू'
                : 'Complete submitted application responses and documentation'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white hover:bg-stone-50 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-800 dark:text-stone-200 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            title="Print or Save Dossier as PDF"
          >
            <Printer className="h-3.5 w-3.5 text-emerald-600" />
            <span>{isNe ? 'प्रिन्ट / PDF सेभ' : 'Print / Save PDF'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 text-xs font-semibold transition-all cursor-pointer"
          >
            {isExpanded ? (
              <>
                <span>{isNe ? 'लुकाउनुहोस्' : 'Collapse'}</span>
                <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                <span>{isNe ? 'विस्तृत हेर्नुहोस्' : 'Expand Dossier'}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expanded Dossier Container */}
      {isExpanded && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-8 print:p-0 print:border-none print:shadow-none">
          {/* Print-Only Header */}
          <div className="hidden print:block pb-6 border-b border-stone-200 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold font-heading text-stone-900">
                  Saathi Teachers Programme (STP) 2027
                </h1>
                <p className="text-xs text-stone-500">Official Fellowship Application Dossier</p>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-sm px-3 py-1 rounded bg-stone-100 border">
                  {refNo}
                </span>
                <div className="text-[10px] text-stone-400 mt-1">{formattedDate}</div>
              </div>
            </div>
          </div>

          {/* Section 1: Personal Particulars */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-stone-100 dark:border-stone-800">
              <User className="h-4 w-4 text-emerald-600" />
              <h4 className="font-heading font-bold text-sm text-stone-900 dark:text-stone-100">
                {isNe ? '१. व्यक्तिगत विवरण' : '1. Personal Information'}
              </h4>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-stone-400 block text-[11px]">{isNe ? 'पूरा नाम:' : 'Full Name:'}</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">{data.fullName || applicantName}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">{isNe ? 'जन्म मिति (ई.सं.):' : 'Date of Birth:'}</span>
                <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">{data.dob || '—'}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">{isNe ? 'लिङ्ग:' : 'Gender:'}</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100 capitalize">{data.gender || '—'}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">{isNe ? 'राष्ट्रियता:' : 'Nationality:'}</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">{data.nationality || 'Nepali'}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">{isNe ? 'सम्पर्क नम्बर:' : 'Contact Phone:'}</span>
                <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">{data.contactNumber || '—'}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">{isNe ? 'इमेल:' : 'Email Address:'}</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">{applicantEmail}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-stone-400 block text-[11px]">{isNe ? 'हालको ठेगाना:' : 'Current Address:'}</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">
                  {data.currentMunicipality ? `${data.currentMunicipality}-${data.currentWard || ''}, ${data.currentProvince || ''}` : '—'}
                </span>
              </div>
            </div>
          </section>

          {/* Section 2: Educational Background */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-stone-100 dark:border-stone-800">
              <GraduationCap className="h-4 w-4 text-emerald-600" />
              <h4 className="font-heading font-bold text-sm text-stone-900 dark:text-stone-100">
                {isNe ? '२. शैक्षिक विवरण' : '2. Educational Background'}
              </h4>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-stone-400 block text-[11px]">{isNe ? 'उच्चतम शैक्षिक तह:' : 'Highest Degree:'}</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">{data.highestLevel || "Bachelor's Degree"}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">{isNe ? 'अध्ययनको संकाय:' : 'Field of Study:'}</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">{data.fieldOfStudy || '—'}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">{isNe ? 'विश्वविद्यालय / कलेज:' : 'University / College:'}</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">{data.university || '—'}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">{isNe ? 'उत्तीर्ण वर्ष:' : 'Graduation Year:'}</span>
                <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">{data.gradYear || '—'}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">{isNe ? 'SLC/SEE श्रेणी:' : 'SLC/SEE Division:'}</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">{data.slcDivision || '—'}</span>
              </div>
            </div>
          </section>

          {/* Section 3: Work & Volunteer Experiences */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-stone-100 dark:border-stone-800">
              <Briefcase className="h-4 w-4 text-emerald-600" />
              <h4 className="font-heading font-bold text-sm text-stone-900 dark:text-stone-100">
                {isNe ? '३. कार्य तथा स्वयंसेवा अनुभव' : '3. Work & Volunteer Experience'}
              </h4>
            </div>

            {experiences.length === 0 ? (
              <p className="text-xs text-stone-400 italic">
                {isNe ? 'कुनै अनुभव दर्ता गरिएको छैन।' : 'No previous experiences recorded.'}
              </p>
            ) : (
              <div className="space-y-3">
                {experiences.map((exp: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/70 dark:border-stone-800 text-xs space-y-1"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-stone-900 dark:text-stone-100 text-xs font-semibold">
                        {exp.role || 'Role'} — {exp.organization || 'Organization'}
                      </strong>
                      <span className="font-mono text-[11px] text-stone-500 bg-white dark:bg-stone-800 px-2 py-0.5 rounded border border-stone-200 dark:border-stone-700">
                        {exp.durationYears || '—'}
                      </span>
                    </div>
                    {exp.description && (
                      <p className="text-stone-600 dark:text-stone-400 leading-relaxed text-[11.5px] mt-1">
                        {exp.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section 4: Leadership & Motivation Essays */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-stone-100 dark:border-stone-800">
              <BookOpen className="h-4 w-4 text-emerald-600" />
              <h4 className="font-heading font-bold text-sm text-stone-900 dark:text-stone-100">
                {isNe ? '४. अभिप्रेरणा तथा नेतृत्व निबन्धहरू' : '4. Motivation & Leadership Essays'}
              </h4>
            </div>

            <div className="space-y-4">
              {/* Essay 1 */}
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/70 dark:border-stone-800 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs text-stone-900 dark:text-stone-100">
                    {isNe
                      ? '१. साथी शिक्षक बन्न किन चाहनुहुन्छ? (Fellowship Motivation)'
                      : 'Essay 1: Why do you want to become a Saathi Teacher?'}
                  </span>
                  <span className="font-mono text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    {countWords(data.essay1 || '')} words
                  </span>
                </div>
                <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-line">
                  {data.essay1 || '—'}
                </p>
              </div>

              {/* Essay 2 */}
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/70 dark:border-stone-800 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs text-stone-900 dark:text-stone-100">
                    {isNe
                      ? '२. नेतृत्व वा चुनौती समाधान गरेको अनुभव (Leadership Challenge)'
                      : 'Essay 2: Describe a leadership or problem-solving challenge you faced.'}
                  </span>
                  <span className="font-mono text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    {countWords(data.essay2 || '')} words
                  </span>
                </div>
                <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-line">
                  {data.essay2 || '—'}
                </p>
              </div>

              {/* Essay 3 */}
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/70 dark:border-stone-800 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs text-stone-900 dark:text-stone-100">
                    {isNe
                      ? '३. ग्रामीण समुदायमा २ वर्ष अध्यापन गर्ने प्रतिबद्धता (Rural Commitment)'
                      : 'Essay 3: Your commitment to 2-year rural community teaching.'}
                  </span>
                  <span className="font-mono text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    {countWords(data.essay3 || '')} words
                  </span>
                </div>
                <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-line">
                  {data.essay3 || '—'}
                </p>
              </div>
            </div>
          </section>

          {/* Section 5: Teaching Subject & Attached Documents */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-stone-100 dark:border-stone-800">
              <FileCheck className="h-4 w-4 text-emerald-600" />
              <h4 className="font-heading font-bold text-sm text-stone-900 dark:text-stone-100">
                {isNe ? '५. शिक्षण प्राथमिकता तथा बायोडाटा' : '5. Teaching Subject & CV Attachment'}
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/70 dark:border-stone-800 space-y-1">
                <span className="text-stone-400 block text-[11px]">{isNe ? 'छनोट गरिएको शिक्षण विषय:' : 'Teaching Subject:'}</span>
                <span className="font-bold text-stone-900 dark:text-stone-100 capitalize text-sm">
                  {data.teachingSubject || 'Grade Teaching'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/70 dark:border-stone-800 space-y-1 flex items-center justify-between">
                <div>
                  <span className="text-stone-400 block text-[11px]">{isNe ? 'संलग्न बायोडाटा (CV):' : 'Attached CV File:'}</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100 truncate max-w-[180px] block">
                    {data.cvFileName || 'Candidate_CV.pdf'}
                  </span>
                </div>
                {data.cvFileName && (
                  <a
                    href={`/api/files/${encodeURIComponent(data.cvFileName)}?download=1`}
                    download={data.cvFileName}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-2xs transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </a>
                )}
              </div>
            </div>
          </section>

          {/* Verification Footer Banner */}
          <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500">
            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
              <ShieldCheck className="h-4 w-4" />
              <span>{isNe ? 'आधिकारिक रूपमा दर्ता तथा प्रमाणित' : 'Electronically Lodged & Certified'}</span>
            </div>
            <div className="font-mono text-[11px] text-stone-400">
              Ref: {refNo} • {formattedDate}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
