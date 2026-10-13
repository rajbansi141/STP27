'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/context';
import {
  updateEmailTemplateAction,
  flushOutboxAction,
} from '@/app/api/admin/actions';
import {
  Mail,
  Send,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
  X,
  Save,
  RotateCw,
  Terminal,
} from 'lucide-react';

interface EmailTemplateItem {
  id: string;
  code: string;
  stage: string | null;
  locale: string;
  subject: string;
  body: string;
  active: boolean;
}

interface EmailLogItem {
  id: string;
  to: string;
  subject: string | null;
  templateCode: string | null;
  status: string;
  error: string | null;
  sentAt: string;
}

interface AdminEmailHubProps {
  templates: EmailTemplateItem[];
  recentLogs: EmailLogItem[];
  pendingCount: number;
}

export function AdminEmailHub({
  templates,
  recentLogs,
  pendingCount,
}: AdminEmailHubProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Edit template modal state
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplateItem | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [flushMessage, setFlushMessage] = useState<string | null>(null);

  // Manual Flush Queue
  const handleFlushQueue = () => {
    setFlushMessage(null);
    startTransition(async () => {
      const res = await flushOutboxAction();
      if (res.success) {
        setFlushMessage(res.message);
        router.refresh();
      } else {
        setFlushMessage(res.message || 'Error processing outbox queue.');
      }
    });
  };

  const openEditModal = (tmpl: EmailTemplateItem) => {
    setEditingTemplate(tmpl);
    setEditSubject(tmpl.subject);
    setEditBody(tmpl.body);
    setFeedback(null);
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    setFeedback(null);
    startTransition(async () => {
      const res = await updateEmailTemplateAction({
        id: editingTemplate.id,
        subject: editSubject,
        body: editBody,
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          text: t.admin.emailHub.editModal.savedSuccess,
        });
        setTimeout(() => {
          setEditingTemplate(null);
          setFeedback(null);
          router.refresh();
        }, 1000);
      } else {
        setFeedback({
          type: 'error',
          text: res.message || 'Error updating email template.',
        });
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Top Controls: Flush Queue Banner */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-50 flex items-center gap-2">
            <Mail className="h-5 w-5 text-emerald-600" />
            <span>{t.admin.emailHub.title}</span>
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            {t.admin.emailHub.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              {pendingCount} Pending in Queue
            </span>
          )}
          <button
            type="button"
            disabled={isPending}
            onClick={handleFlushQueue}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCw className="h-3.5 w-3.5" />
            )}
            <span>{t.admin.emailHub.flushQueueBtn}</span>
          </button>
        </div>
      </div>

      {flushMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{flushMessage}</span>
        </div>
      )}

      {/* Templates Grid */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h4 className="font-heading font-bold text-sm text-stone-900 dark:text-stone-100">
          {t.admin.emailHub.templatesTitle}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-700 space-y-2 text-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300">
                      {tmpl.code}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300">
                      {tmpl.locale}
                    </span>
                  </div>
                  <h5 className="font-semibold text-stone-900 dark:text-stone-100 mt-1">
                    {tmpl.subject}
                  </h5>
                </div>

                <button
                  type="button"
                  onClick={() => openEditModal(tmpl)}
                  className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors shrink-0"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="p-2.5 rounded-lg bg-stone-100/80 dark:bg-stone-900/60 font-mono text-[11px] text-stone-600 dark:text-stone-400 max-h-24 overflow-y-auto leading-relaxed border border-stone-200/60 dark:border-stone-800">
                {tmpl.body}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Outbox Delivery Logs */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h4 className="font-heading font-bold text-sm text-stone-900 dark:text-stone-100">
          {t.admin.emailHub.outboxTitle}
        </h4>

        <div className="overflow-x-auto border border-stone-200 dark:border-stone-800 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-[11px] font-bold text-stone-600 dark:text-stone-300 uppercase">
                <th className="px-4 py-3">{t.admin.emailHub.logsTable.sentAt}</th>
                <th className="px-4 py-3">{t.admin.emailHub.logsTable.to}</th>
                <th className="px-4 py-3">{t.admin.emailHub.logsTable.subject}</th>
                <th className="px-4 py-3">{t.admin.emailHub.logsTable.template}</th>
                <th className="px-4 py-3">{t.admin.emailHub.logsTable.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {recentLogs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-stone-50/60 dark:hover:bg-stone-800/30 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-[11px] text-stone-500 whitespace-nowrap">
                    {new Date(log.sentAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono font-medium text-stone-900 dark:text-stone-100">
                    {log.to}
                  </td>
                  <td className="px-4 py-3 text-stone-700 dark:text-stone-300 font-medium">
                    {log.subject || '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-stone-500">
                    {log.templateCode || 'Custom'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {log.status === 'SENT' ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{t.admin.emailHub.logsTable.sent}</span>
                      </span>
                    ) : log.status === 'PENDING' ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{t.admin.emailHub.logsTable.pending}</span>
                      </span>
                    ) : (
                      <span
                        title={log.error || 'Failed to dispatch'}
                        className="inline-flex items-center gap-1 font-semibold text-red-600 dark:text-red-400"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>{t.admin.emailHub.logsTable.failed}</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Template Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-50">
                  {t.admin.emailHub.editModal.title}
                </h3>
                <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400">
                  {editingTemplate.code} ({editingTemplate.locale.toUpperCase()})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  {t.admin.emailHub.editModal.subjectLabel}
                </label>
                <input
                  type="text"
                  required
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  {t.admin.emailHub.editModal.bodyLabel}
                </label>
                <textarea
                  required
                  rows={6}
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-[11px] text-stone-600 dark:text-stone-400">
                {t.admin.emailHub.editModal.placeholdersLabel}
              </div>

              {feedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium ${
                    feedback.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
                      : 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300'
                  }`}
                >
                  {feedback.text}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  <span>{t.admin.emailHub.editModal.saveBtn}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
