import React from 'react';
import Link from 'next/link';
import { getServerTranslations } from '@/lib/i18n/server';
import {
  HelpCircle,
  Mail,
  Phone,
  MessageSquare,
  FileText,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default async function HelpPage() {
  const { t, locale } = await getServerTranslations();
  const isNe = locale === 'ne';

  const faqs = [
    {
      qEn: 'Who is eligible to apply for STP 2027?',
      qNe: 'साथी शिक्षक कार्यक्रम २०२७ का लागि को योग्य छन्?',
      aEn:
        "Nepali citizens holding a completed Bachelor's degree (or awaiting final transcripts) in any discipline with strong passion for education and commitment to a 2-year rural residency.",
      aNe:
        'नेपाली नागरिक, कुनै पनि विषयमा स्नातक तह उत्तीर्ण (वा अन्तिम ट्रान्सक्रिप्ट पर्खिरहेका), शिक्षाप्रति समर्पित र २ वर्षे ग्रामीण बसाइका लागि तयार युवाहरू।',
    },
    {
      qEn: 'Can I save my application as a draft and finish later?',
      qNe: 'के म फारम ड्राफ्टको रूपमा सुरक्षित गरेर पछि भर्न सक्छु?',
      aEn:
        'Yes. The system automatically autosaves your progress every 15 seconds. You can log in anytime before the deadline to resume and submit.',
      aNe:
        'सकिन्छ। प्रणालीले प्रत्येक १५ सेकेन्डमा तपाईंको विवरण स्वतः सुरक्षित गर्दछ। म्याद समाप्त हुनु अगावै लगइन गरी फारम पूरा गर्न सक्नुहुन्छ।',
    },
    {
      qEn: 'What documents do I need to prepare before applying?',
      qNe: 'फारम भर्नु अगाडि कुन कुन कागजात आवश्यक पर्छ?',
      aEn:
        '1) Recent CV / Resume (PDF or DOCX, max 5MB), 2) Citizenship details, 3) Academic transcripts (SLC/SEE, +2, Bachelor), and 4) Thoughtful motivation essay responses.',
      aNe:
        '१) व्यक्तिगत विवरण (CV/Resume), २) नागरिकता विवरण, ३) शैक्षिक प्रमाणपत्रहरू (SEE, +2, स्नातक), र ४) अभिप्रेरणा सम्बन्धी प्रश्नहरूको मौलिक उत्तर।',
    },
    {
      qEn: 'How does the Selection Committee evaluate applications?',
      qNe: 'छनोट समितिले कसरी आवेदनको मूल्याङ्कन गर्दछ?',
      aEn:
        'Applications undergo a multi-criteria blind evaluation scoring academic background, commitment to educational equity, resilience, and written communication clarity.',
      aNe:
        'समितिले शैक्षिक पृष्ठभूमि, सार्वजनिक शिक्षा प्रतिको प्रतिबद्धता, समस्या समाधान क्षमता र सञ्चार स्पष्टताका आधारमा निष्पक्ष मूल्याङ्कन गर्दछ।',
    },
    {
      qEn: 'What happens after I submit my application?',
      qNe: 'आवेदन पेश गरेपछि के हुन्छ?',
      aEn:
        'You will receive an official submission confirmation with a unique reference number (STP-2027-XXXX). You can track your status in real time from your applicant portal.',
      aNe:
        'तपाईंले आधिकारिक दर्ता नम्बर (STP-2027-XXXX) सहितको रसिद प्राप्त गर्नुहुनेछ। आफ्नो आवेदक पोर्टलबाट नियमित नतिजा र स्थिति हेर्न सक्नुहुन्छ।',
    },
    {
      qEn: 'Is there an application fee to apply?',
      qNe: 'के आवेदन शुल्क लाग्छ?',
      aEn:
        'No. The application and entire recruitment process for Saathi Teachers Programme is completely free of charge.',
      aNe:
        'लाग्दैन। साथी शिक्षक कार्यक्रमको आवेदन तथा छनोट प्रक्रिया पूर्णतः निःशुल्क छ।',
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Header */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-8 border-b border-stone-200 dark:border-stone-800 bg-gradient-to-b from-stone-50 via-stone-100/60 to-white dark:from-stone-950 dark:via-stone-900/60 dark:to-stone-950">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 text-xs font-semibold shadow-xs">
            <HelpCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Support & Application Assistance</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-heading font-extrabold text-stone-900 dark:text-stone-50 tracking-tight">
            {isNe ? 'सहायता केन्द्र तथा बारम्बार सोधिने प्रश्नहरू' : 'Help Desk & Frequently Asked Questions'}
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-stone-600 dark:text-stone-300 leading-relaxed">
            {isNe
              ? 'आवेदन प्रक्रिया, योग्यता, आवश्यक कागजात वा प्राविधिक सहयोग सम्बन्धी सम्पूर्ण जिज्ञासाहरूको समाधान।'
              : 'Find quick answers regarding application criteria, fellowship commitments, document verification, and technical support.'}
          </p>
        </div>
      </section>

      {/* FAQs Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full space-y-8">
        <div className="grid grid-cols-1 gap-4">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-2 hover:border-emerald-500/40 transition-all"
            >
              <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 flex items-start gap-2.5">
                <span className="text-emerald-600 font-mono text-sm shrink-0 font-bold">Q{i + 1}.</span>
                <span>{isNe ? faq.qNe : faq.qEn}</span>
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 pl-6 leading-relaxed">
                {isNe ? faq.aNe : faq.aEn}
              </p>
            </div>
          ))}
        </div>

        {/* Contact Support Cards */}
        <div className="pt-8 border-t border-stone-200 dark:border-stone-800">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 text-center mb-6">
            {isNe ? 'थप सहयोग चाहिएमा सिधै सम्पर्क गर्नुहोस्' : 'Still need assistance? Contact Admissions Desk'}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs text-stone-500 block">{isNe ? 'इमेल सहयोग' : 'Admissions Email'}</span>
                <a
                  href="mailto:admissions@saathiteachers.org.np"
                  className="text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  admissions@saathiteachers.org.np
                </a>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs text-stone-500 block">{isNe ? 'हेल्पलाइन फोन' : 'Candidate Helpline'}</span>
                <span className="text-xs sm:text-sm font-semibold text-stone-800 dark:text-stone-200">
                  +977-1-5912345 (Sun-Fri, 9am-5pm)
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
