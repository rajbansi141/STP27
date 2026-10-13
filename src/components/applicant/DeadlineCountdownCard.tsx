'use client';

import * as React from 'react';
import { Clock, AlertCircle, Calendar } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface DeadlineCountdownCardProps {
  deadlineDate: string | null;
}

export function DeadlineCountdownCard({ deadlineDate }: DeadlineCountdownCardProps) {
  const { t, locale } = useI18n();
  const [timeLeft, setTimeLeft] = React.useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false });

  React.useEffect(() => {
    if (!deadlineDate) return;

    const calcTime = () => {
      const target = new Date(deadlineDate).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
    };

    calcTime();
    const timer = setInterval(calcTime, 1000);
    return () => clearInterval(timer);
  }, [deadlineDate]);

  if (!deadlineDate) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/10 via-emerald-800/5 to-teal-900/10 p-6 shadow-sm dark:border-emerald-500/20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <Clock className="h-4 w-4" />
            <span>{t?.landing?.deadlineLabel || 'Application Deadline'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {timeLeft.isExpired
              ? locale === 'ne'
                ? 'आवेदन प्रक्रिया समाप्त भएको छ'
                : 'Applications Are Closed'
              : locale === 'ne'
              ? 'आवेदन बुझाउने अन्तिम समय'
              : 'Time Remaining to Submit'}
          </h2>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(deadlineDate).toLocaleDateString(locale === 'ne' ? 'ne-NP' : 'en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        {/* Live Countdown Box */}
        {!timeLeft.isExpired ? (
          <div className="flex items-center gap-2 sm:gap-3">
            {[
              { label: t?.landing?.days || 'Days', value: timeLeft.days },
              { label: t?.landing?.hours || 'Hours', value: timeLeft.hours },
              { label: t?.landing?.minutes || 'Min', value: timeLeft.minutes },
              { label: t?.landing?.seconds || 'Sec', value: timeLeft.seconds },
            ].map((unit, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center rounded-xl bg-background/90 px-3 py-2 shadow-sm border border-emerald-500/20 min-w-[60px]"
              >
                <span className="font-mono text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {String(unit.value).padStart(2, '0')}
                </span>
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                  {unit.label}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 border border-red-500/20">
            <AlertCircle className="h-4 w-4" />
            <span>{locale === 'ne' ? 'आवेदन दर्ता बन्द' : 'Submission Closed'}</span>
          </div>
        )}
      </div>
    </div>
  );
}
