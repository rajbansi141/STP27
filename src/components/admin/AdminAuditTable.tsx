'use client';

import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  flexRender,
} from '@tanstack/react-table';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useI18n } from '@/lib/i18n/context';
import {
  Search,
  Download,
  Filter,
  Eye,
  X,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Terminal,
} from 'lucide-react';

export interface AuditLogRow {
  id: string;
  actorName: string;
  actorEmail: string | null;
  role: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  meta: any;
  ip: string | null;
  at: string;
}

interface AdminAuditTableProps {
  logs: AuditLogRow[];
}

export function AdminAuditTable({ logs }: AdminAuditTableProps) {
  const { t } = useI18n();
  const [globalFilter, setGlobalFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'at', desc: true },
  ]);

  const [tableBodyRef] = useAutoAnimate<HTMLTableSectionElement>();
  const [inspectLog, setInspectLog] = useState<AuditLogRow | null>(null);

  // Distinct action list
  const availableActions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => set.add(l.action));
    return Array.from(set).sort();
  }, [logs]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return logs.filter((l) => {
      if (actionFilter !== 'ALL' && l.action !== actionFilter) return false;

      if (globalFilter.trim()) {
        const q = globalFilter.toLowerCase();
        const matchesActor = l.actorName.toLowerCase().includes(q);
        const matchesAction = l.action.toLowerCase().includes(q);
        const matchesEntity = l.entity.toLowerCase().includes(q);
        const matchesRole = l.role?.toLowerCase().includes(q) || false;
        if (!matchesActor && !matchesAction && !matchesEntity && !matchesRole) return false;
      }
      return true;
    });
  }, [logs, actionFilter, globalFilter]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Timestamp',
      'Actor Name',
      'Actor Email',
      'Role',
      'Action',
      'Entity',
      'Entity ID',
      'IP Address',
      'Metadata JSON',
    ];

    const rows = filteredData.map((l) => [
      `"${new Date(l.at).toISOString()}"`,
      `"${l.actorName.replace(/"/g, '""')}"`,
      `"${l.actorEmail || 'N/A'}"`,
      `"${l.role || 'GUEST'}"`,
      `"${l.action}"`,
      `"${l.entity}"`,
      `"${l.entityId || 'N/A'}"`,
      `"${l.ip || 'N/A'}"`,
      `"${JSON.stringify(l.meta || {}).replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'stp-2027-audit-trail.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = useMemo<ColumnDef<AuditLogRow>[]>(
    () => [
      {
        accessorKey: 'at',
        header: t.admin.audit.table.timestamp,
        cell: (info) => (
          <span className="font-mono text-[11px] text-stone-500">
            {new Date(info.getValue() as string).toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: 'actorName',
        header: t.admin.audit.table.actor,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div>
              <div className="font-semibold text-stone-900 dark:text-stone-100 text-xs">
                {row.actorName}
              </div>
              <div className="text-[10px] text-stone-400 font-mono">
                {row.actorEmail || 'System'}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'role',
        header: t.admin.audit.table.role,
        cell: (info) => {
          const role = (info.getValue() as string) || 'GUEST';
          const badgeClass =
            role === 'ADMIN'
              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
              : role === 'REVIEWER'
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
              : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300';

          return (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>
              {role}
            </span>
          );
        },
      },
      {
        accessorKey: 'action',
        header: t.admin.audit.table.action,
        cell: (info) => (
          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
            {info.getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: 'entity',
        header: t.admin.audit.table.entity,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="text-xs">
              <span className="font-semibold text-stone-800 dark:text-stone-200">{row.entity}</span>
              {row.entityId && (
                <span className="text-[10px] text-stone-400 block font-mono truncate max-w-[120px]">
                  {row.entityId}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: 'details',
        header: t.admin.audit.table.details,
        cell: ({ row }) => {
          const l = row.original;
          return (
            <button
              type="button"
              onClick={() => setInspectLog(l)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors"
            >
              <Terminal className="h-3 w-3" />
              <span>Inspect JSON</span>
            </button>
          );
        },
      },
    ],
    [t]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 15 },
    },
  });

  return (
    <div className="space-y-4">
      {/* Top Search Toolbar */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={t.admin.audit.searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-stone-900 dark:text-stone-100"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-medium"
          >
            <option value="ALL">{t.admin.audit.actionFilter}</option>
            {availableActions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{t.admin.audit.exportCsvBtn}</span>
          </button>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="bg-stone-50/80 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800"
                >
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-[11px] font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider select-none"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody ref={tableBodyRef} className="divide-y divide-stone-100 dark:divide-stone-800">
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-stone-50/60 dark:hover:bg-stone-800/30 transition-colors text-xs"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="py-12 text-center text-stone-400 text-xs italic"
                  >
                    No audit records matching current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500">
          <div>
            Showing{' '}
            <strong className="text-stone-800 dark:text-stone-200">
              {table.getRowModel().rows.length}
            </strong>{' '}
            of{' '}
            <strong className="text-stone-800 dark:text-stone-200">
              {filteredData.length}
            </strong>{' '}
            audit entries
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
              className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors font-medium"
            >
              Previous
            </button>
            <span className="font-mono text-stone-700 dark:text-stone-300">
              {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
            </span>
            <button
              type="button"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
              className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors font-medium"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Inspect Metadata Modal */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  {inspectLog.action}
                </span>
                <span className="text-xs text-stone-500 font-mono">
                  {new Date(inspectLog.at).toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setInspectLog(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="text-xs text-stone-600 dark:text-stone-300 space-y-1">
              <div>
                Actor:{' '}
                <strong className="text-stone-900 dark:text-stone-100">
                  {inspectLog.actorName} ({inspectLog.role || 'GUEST'})
                </strong>
              </div>
              <div>
                Entity:{' '}
                <span className="font-mono text-stone-800 dark:text-stone-200">
                  {inspectLog.entity} {inspectLog.entityId ? `(${inspectLog.entityId})` : ''}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Metadata Payload:
              </label>
              <pre className="p-4 rounded-xl bg-stone-950 text-emerald-400 font-mono text-xs overflow-x-auto max-h-60 border border-stone-800">
                {JSON.stringify(inspectLog.meta, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setInspectLog(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
