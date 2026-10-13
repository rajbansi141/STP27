'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/context';
import {
  updateSettingsAction,
  updateStageAction,
} from '@/app/api/admin/actions';
import {
  Clock,
  Calendar,
  Layers,
  Edit2,
  CheckCircle2,
  Save,
  Loader2,
  X,
  Power,
} from 'lucide-react';

interface StageItem {
  id: string;
  code: string;
  nameEn: string;
  nameNe: string;
  order: number;
  isActive: boolean;
}

interface AdminSettingsEditorProps {
  initialSettings: {
    deadline: string; // ISO string
    cohortYear: number;
    cycleLabel: string;
  };
  stages: StageItem[];
}

export function AdminSettingsEditor({
  initialSettings,
  stages,
}: AdminSettingsEditorProps) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Cycle Settings State
  const initialDateStr = initialSettings.deadline
    ? new Date(initialSettings.deadline).toISOString().slice(0, 16)
    : '';

  const [deadline, setDeadline] = useState(initialDateStr);
  const [cohortYear, setCohortYear] = useState(initialSettings.cohortYear);
  const [cycleLabel, setCycleLabel] = useState(initialSettings.cycleLabel);
  const [settingsFeedback, setSettingsFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Edit Stage Modal State
  const [editingStage, setEditingStage] = useState<StageItem | null>(null);
  const [editNameEn, setEditNameEn] = useState('');
  const [editNameNe, setEditNameNe] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [stageFeedback, setStageFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Save Cycle Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsFeedback(null);

    startTransition(async () => {
      const res = await updateSettingsAction({
        deadline: new Date(deadline).toISOString(),
        cohortYear: Number(cohortYear),
        cycleLabel,
      });

      if (res.success) {
        setSettingsFeedback({
          type: 'success',
          text: t.admin.settings.settingsSaved,
        });
        router.refresh();
      } else {
        setSettingsFeedback({
          type: 'error',
          text: res.message || 'Error saving cycle settings.',
        });
      }
    });
  };

  // Open Edit Stage Modal
  const openEditStage = (s: StageItem) => {
    setEditingStage(s);
    setEditNameEn(s.nameEn);
    setEditNameNe(s.nameNe);
    setEditIsActive(s.isActive);
    setStageFeedback(null);
  };

  // Save Stage Details
  const handleSaveStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStage) return;

    setStageFeedback(null);
    startTransition(async () => {
      const res = await updateStageAction({
        id: editingStage.id,
        nameEn: editNameEn,
        nameNe: editNameNe,
        isActive: editIsActive,
      });

      if (res.success) {
        setStageFeedback({
          type: 'success',
          text: t.admin.settings.editStageModal.stageSaved,
        });
        setTimeout(() => {
          setEditingStage(null);
          setStageFeedback(null);
          router.refresh();
        }, 1000);
      } else {
        setStageFeedback({
          type: 'error',
          text: res.message || 'Error updating stage.',
        });
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Card 1: Recruitment Cohort & Deadline Settings */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-50">
              {t.admin.settings.cycleCardTitle}
            </h3>
            <p className="text-xs text-stone-500">
              {t.admin.settings.subtitle}
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Deadline */}
            <div>
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                {t.admin.settings.deadlineLabel}
              </label>
              <input
                type="datetime-local"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-mono"
              />
            </div>

            {/* Cohort Year */}
            <div>
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                {t.admin.settings.cohortYearLabel}
              </label>
              <input
                type="number"
                required
                min={2025}
                max={2035}
                value={cohortYear}
                onChange={(e) => setCohortYear(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-mono"
              />
            </div>

            {/* Cycle Label */}
            <div>
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                {t.admin.settings.cycleLabelLabel}
              </label>
              <input
                type="text"
                required
                value={cycleLabel}
                onChange={(e) => setCycleLabel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
              />
            </div>
          </div>

          {settingsFeedback && (
            <div
              className={`p-3 rounded-xl text-xs font-medium ${
                settingsFeedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
                  : 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300'
              }`}
            >
              {settingsFeedback.text}
            </div>
          )}

          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>{t.admin.settings.saveSettingsBtn}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Card 2: Selection Pipeline Stages Table */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-50">
              {t.admin.settings.stageCardTitle}
            </h3>
            <p className="text-xs text-stone-500">
              {t.admin.settings.stageCardDesc}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border border-stone-200 dark:border-stone-800 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-[11px] font-bold text-stone-600 dark:text-stone-300 uppercase">
                <th className="px-4 py-3">{t.admin.settings.table.order}</th>
                <th className="px-4 py-3">{t.admin.settings.table.code}</th>
                <th className="px-4 py-3">{t.admin.settings.table.nameEn}</th>
                <th className="px-4 py-3">{t.admin.settings.table.nameNe}</th>
                <th className="px-4 py-3">{t.admin.settings.table.status}</th>
                <th className="px-4 py-3 text-right">{t.admin.settings.table.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {stages.map((stage) => (
                <tr
                  key={stage.id}
                  className="hover:bg-stone-50/60 dark:hover:bg-stone-800/30 transition-colors"
                >
                  <td className="px-4 py-3 font-mono font-bold text-stone-700 dark:text-stone-300">
                    #{stage.order}
                  </td>
                  <td className="px-4 py-3 font-mono text-stone-500">{stage.code}</td>
                  <td className="px-4 py-3 font-semibold text-stone-900 dark:text-stone-100">
                    {stage.nameEn}
                  </td>
                  <td className="px-4 py-3 text-stone-800 dark:text-stone-200">
                    {stage.nameNe}
                  </td>
                  <td className="px-4 py-3">
                    {stage.isActive ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>{t.admin.settings.table.active}</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-stone-400">
                        {t.admin.settings.table.inactive}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEditStage(stage)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Stage Modal */}
      {editingStage && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-50">
                {t.admin.settings.editStageModal.title} ({editingStage.code})
              </h3>
              <button
                type="button"
                onClick={() => setEditingStage(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStage} className="space-y-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  {t.admin.settings.editStageModal.nameEnLabel}
                </label>
                <input
                  type="text"
                  required
                  value={editNameEn}
                  onChange={(e) => setEditNameEn(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  {t.admin.settings.editStageModal.nameNeLabel}
                </label>
                <input
                  type="text"
                  required
                  value={editNameNe}
                  onChange={(e) => setEditNameNe(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="stageActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-stone-300"
                />
                <label
                  htmlFor="stageActive"
                  className="text-xs font-medium text-stone-800 dark:text-stone-200"
                >
                  {t.admin.settings.editStageModal.activeLabel}
                </label>
              </div>

              {stageFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium ${
                    stageFeedback.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
                      : 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300'
                  }`}
                >
                  {stageFeedback.text}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingStage(null)}
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
                  <span>{t.admin.settings.editStageModal.saveBtn}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
