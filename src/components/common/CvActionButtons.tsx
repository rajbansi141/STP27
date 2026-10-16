'use client';

import React, { useState } from 'react';
import { Eye, Download, FileText } from 'lucide-react';
import { CvPreviewModal } from './CvPreviewModal';

export interface CvActionButtonsProps {
  fileName?: string;
  fileUrl?: string;
  candidateName?: string;
  refNo?: string;
  subject?: string;
  variant?: 'compact' | 'full' | 'inline' | 'icon';
  className?: string;
}

export function CvActionButtons({
  fileName,
  fileUrl,
  candidateName,
  refNo,
  subject,
  variant = 'compact',
  className = '',
}: CvActionButtonsProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const resolvedFileName = fileName || 'Candidate_CV.pdf';
  let baseFileUrl = fileUrl || `/api/files/${encodeURIComponent(resolvedFileName)}`;
  if (!baseFileUrl.startsWith('/api/files/')) {
    const rawName = baseFileUrl.split('/').pop() || resolvedFileName;
    baseFileUrl = `/api/files/${encodeURIComponent(rawName)}`;
  }
  const downloadUrl = `${baseFileUrl}${baseFileUrl.includes('?') ? '&' : '?'}download=1`;

  return (
    <>
      <div className={`flex items-center gap-1.5 ${className}`}>
        {/* Preview Button */}
        <button
          type="button"
          onClick={() => setIsPreviewOpen(true)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-600/30 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-semibold text-xs transition-colors cursor-pointer"
          title="Preview CV in modal"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>{variant === 'icon' ? '' : 'Preview'}</span>
        </button>

        {/* Download Button */}
        <a
          href={downloadUrl}
          download={resolvedFileName}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
          title={`Download ${resolvedFileName}`}
        >
          <Download className="h-3.5 w-3.5" />
          <span>{variant === 'icon' ? '' : 'Download'}</span>
        </a>
      </div>

      {/* CV Preview Modal */}
      <CvPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        fileName={resolvedFileName}
        fileUrl={baseFileUrl}
        candidateName={candidateName}
        refNo={refNo}
        subject={subject}
      />
    </>
  );
}
