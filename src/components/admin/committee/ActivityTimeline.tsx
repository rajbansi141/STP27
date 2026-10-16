'use client';

import * as React from 'react';
import {
  Clock,
  Download,
  Filter,
  Activity,
  CheckCircle2,
  KeyRound,
  FileText,
  UserCheck,
  UserX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';
import { buildSanitizedCsv, downloadCsv } from '@/lib/csv';

export interface AuditItem {
  id: string;
  action: string;
  at: string;
  ip?: string | null;
  userAgent?: string | null;
  meta?: string | null;
}

interface ActivityTimelineProps {
  logs: AuditItem[];
  memberName: string;
}

export function ActivityTimeline({ logs, memberName }: ActivityTimelineProps) {
  const { locale } = useI18n();
  const [filterAction, setFilterAction] = React.useState('ALL');
  const [searchDate, setSearchDate] = React.useState('');

  const filteredLogs = React.useMemo(() => {
    return logs.filter((log) => {
      const matchesAction = filterAction === 'ALL' || log.action === filterAction;
      const matchesDate = !searchDate || log.at.includes(searchDate);
      return matchesAction && matchesDate;
    });
  }, [logs, filterAction, searchDate]);

  const exportCSV = () => {
    const headers = ['ID', 'Action', 'Timestamp', 'IP Address', 'Metadata'];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.action,
      l.at,
      l.ip || '—',
      l.meta || '',
    ]);

    const csv = buildSanitizedCsv(headers, rows);
    downloadCsv(`audit_log_${memberName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'SUBMIT_REVIEW':
      case 'EVALUATION_COMPLETED':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case 'RESET_COMMITTEE_MEMBER_PASSWORD':
        return <KeyRound className="h-4 w-4 text-amber-600" />;
      case 'SUSPEND_COMMITTEE_MEMBER':
        return <UserX className="h-4 w-4 text-red-600" />;
      case 'REACTIVATE_COMMITTEE_MEMBER':
        return <UserCheck className="h-4 w-4 text-emerald-600" />;
      default:
        return <Activity className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <div className="rounded-xl border bg-card p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-600" />
            {locale === 'ne' ? 'गतिविधि र अडिट लग' : 'Activity & Audit Log'}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cryptographic timestamped record of evaluation submissions, logins, and status changes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            className="h-8 text-xs w-36"
          />

          <Button variant="outline" size="sm" onClick={exportCSV} className="h-8 text-xs">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        {filteredLogs.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No activity records found matching filters.
          </p>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
            {filteredLogs.map((log) => (
              <div key={log.id} className="relative flex items-start gap-3 text-xs">
                <span className="absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-background border shadow-xs">
                  {getActionIcon(log.action)}
                </span>
                <div className="flex-1 rounded-lg border bg-muted/20 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold font-mono text-foreground">{log.action}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(log.at).toLocaleString()}
                    </span>
                  </div>
                  {log.meta && (
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground break-all">
                      {log.meta}
                    </p>
                  )}
                  {log.ip && (
                    <span className="inline-block mt-1 text-[10px] text-muted-foreground">
                      IP: {log.ip}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
