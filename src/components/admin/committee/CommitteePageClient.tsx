'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommitteeTable, type CommitteeMemberRow } from './CommitteeTable';
import { AddMemberSheet } from './AddMemberSheet';
import { OneTimeCredentialsDialog } from './OneTimeCredentialsDialog';
import { useI18n } from '@/lib/i18n';

interface CommitteePageClientProps {
  members: CommitteeMemberRow[];
  totalReviewers: number;
  activeReviewers: number;
  totalEvaluations: number;
}

export function CommitteePageClient({
  members,
  totalReviewers,
  activeReviewers,
  totalEvaluations,
}: CommitteePageClientProps) {
  const router = useRouter();
  const { t, locale } = useI18n();

  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [credentials, setCredentials] = React.useState<{
    username: string;
    email: string;
    password: string;
  } | null>(null);
  const [isCredentialsOpen, setIsCredentialsOpen] = React.useState(false);

  const handleMemberCreated = (creds: { username: string; email: string; password: string }) => {
    setCredentials(creds);
    setIsCredentialsOpen(true);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t?.committee?.title || 'Selection Committee Management'}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {t?.committee?.description ||
              'Onboard evaluators, enforce blind scoring, and assign candidate interview stages.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsAddOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            {t?.committee?.addMember || 'Add Committee Member'}
          </Button>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">
              {t?.committee?.kpis?.totalMembers || 'Total Committee Members'}
            </span>
            <Users className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold">{totalReviewers}</div>
          <p className="mt-1 text-xs text-muted-foreground">Onboarded evaluators</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">
              {t?.committee?.kpis?.activeReviewers || 'Active Members'}
            </span>
            <CheckCircle2 className="h-4 w-4 text-teal-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-teal-600">{activeReviewers}</div>
          <p className="mt-1 text-xs text-muted-foreground">Eligible to review</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">
              {locale === 'ne' ? 'कुल मूल्याङ्कन' : 'Evaluations Completed'}
            </span>
            <FileSpreadsheet className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-600">{totalEvaluations}</div>
          <p className="mt-1 text-xs text-muted-foreground">Submitted score rubrics</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">
              {locale === 'ne' ? 'सक्रिय मूल्याङ्कनकर्ता' : 'Active Ratio'}
            </span>
            <ShieldCheck className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-600">
            {activeReviewers} / {totalReviewers}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {locale === 'ne' ? 'सक्रिय मूल्याङ्कनकर्ता' : 'Active reviewer pool'}
          </p>
        </div>
      </div>

      {/* 3. Member Table */}
      <CommitteeTable initialMembers={members} />

      {/* Add Member Sheet */}
      <AddMemberSheet
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSuccess={handleMemberCreated}
      />

      {/* One-Time Credentials Modal */}
      <OneTimeCredentialsDialog
        open={isCredentialsOpen}
        onOpenChange={setIsCredentialsOpen}
        credentials={credentials}
      />
    </div>
  );
}
