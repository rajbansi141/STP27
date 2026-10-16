'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ExternalLink,
  FileText,
  FileCheck2,
  Loader2,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export interface CvPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName?: string;
  fileUrl?: string;
  candidateName?: string;
  refNo?: string;
  subject?: string;
}

export function CvPreviewModal({
  isOpen,
  onClose,
  fileName,
  fileUrl,
  candidateName,
  refNo,
  subject,
}: CvPreviewModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const resolvedFileName = fileName || 'Candidate_CV.pdf';
  const ext = resolvedFileName.split('.').pop()?.toLowerCase() || '';
  const isDocx = ext === 'docx' || ext === 'doc';

  // Base API url
  let baseFileUrl = fileUrl || `/api/files/${encodeURIComponent(resolvedFileName)}`;
  if (!baseFileUrl.startsWith('/api/files/')) {
    const rawName = baseFileUrl.split('/').pop() || resolvedFileName;
    baseFileUrl = `/api/files/${encodeURIComponent(rawName)}`;
  }

  // URL for iframe preview: append preview=1 for docx to invoke HTML preview renderer
  const previewUrl = isDocx
    ? `${baseFileUrl}${baseFileUrl.includes('?') ? '&' : '?'}preview=1`
    : baseFileUrl;

  // URL for direct download
  const downloadUrl = `${baseFileUrl}${baseFileUrl.includes('?') ? '&' : '?'}download=1`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`relative flex flex-col bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 w-full ${
          isExpanded ? 'h-[96vh] max-w-[96vw]' : 'h-[88vh] max-w-5xl'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold font-heading text-stone-900 dark:text-stone-50 truncate">
                  {candidateName ? `${candidateName}'s CV` : 'Curriculum Vitae Preview'}
                </h2>
                {refNo && (
                  <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-full bg-stone-200/70 dark:bg-stone-800 text-stone-700 dark:text-stone-300 shrink-0">
                    {refNo}
                  </span>
                )}
                {subject && (
                  <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-full hidden sm:inline-block">
                    {subject}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 truncate mt-0.5" title={resolvedFileName}>
                {resolvedFileName} {isDocx ? '(Word Document Preview)' : '(PDF Document Preview)'}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Download Button */}
            <a
              href={downloadUrl}
              download={resolvedFileName}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Download CV to your device"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Download CV</span>
            </a>

            {/* Open in New Window */}
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors"
              title="Open in new window"
            >
              <ExternalLink className="h-4 w-4" />
            </a>

            {/* Toggle Fullscreen / Expand */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors hidden sm:inline-flex cursor-pointer"
              title={isExpanded ? 'Restore size' : 'Expand full screen'}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors cursor-pointer"
              title="Close preview (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Body / Viewer */}
        <div className="relative flex-1 w-full bg-stone-100 dark:bg-stone-950 overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/80 dark:bg-stone-900/80 z-10">
              <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
              <p className="text-xs text-stone-500 font-medium">
                Loading and preparing document preview...
              </p>
            </div>
          )}

          <iframe
            src={previewUrl}
            title={`CV Document - ${resolvedFileName}`}
            onLoad={() => setIsLoading(false)}
            className="w-full h-full border-0"
          />
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 text-xs text-stone-500 shrink-0">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Saathi Selection Committee Candidate Document Viewer</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline">Having trouble previewing?</span>
            <a
              href={downloadUrl}
              download={resolvedFileName}
              className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              Download direct file ({resolvedFileName})
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
