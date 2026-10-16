import React from 'react';
import { Metadata } from 'next';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/auth/rbac';
import { getServerTranslations } from '@/lib/i18n/server';
import { getAscSlotAvailabilityAction } from '@/app/api/asc/actions';
import {
  AscManagementHub,
  AscCandidateRosterItem,
} from '@/components/admin/AscManagementHub';
import { AscBooking } from '@/lib/constants/applicationReview';

export const metadata: Metadata = {
  title: 'ASC Hub | Admin Portal',
  description:
    'Comprehensive management hub for ASC: quota management, slot bookings, printable admit passes, and candidate stage progression.',
};

function normalizeSubject(sub?: string | null): string {
  if (!sub) return 'General';
  const s = sub.trim().toLowerCase();
  if (s === 'english') return 'English';
  if (s === 'math' || s === 'mathematics') return 'Math';
  if (s === 'grade_teaching' || s === 'grade teaching' || s === 'grade') return 'Grade Teaching';
  if (s === 'science') return 'Science';
  return sub.charAt(0).toUpperCase() + sub.slice(1);
}

export default async function AdminAscHubPage() {
  await requireRole(['ADMIN'], '/admin/asc');
  const { locale } = await getServerTranslations();

  // Fetch slot availability and session configuration
  const slotData = await getAscSlotAvailabilityAction();

  // Fetch candidates who are in ASC stage or have booked an ASC slot
  const applications = await prisma.application.findMany({
    include: {
      applicant: true,
      assignments: {
        include: { reviewer: true },
      },
    },
    orderBy: { submittedAt: 'desc' },
  });

  // Filter to candidates in ASC stage or possessing an ASC booking record
  const ascApps = applications.filter((app) => {
    if (app.stage === 'ASC') return true;
    const parsedData = app.data
      ? typeof app.data === 'string'
        ? JSON.parse(app.data)
        : app.data
      : {};
    return Boolean(parsedData.ascBooking);
  });

  const candidates: AscCandidateRosterItem[] = ascApps.map((app) => {
    const parsedData = app.data
      ? typeof app.data === 'string'
        ? JSON.parse(app.data)
        : app.data
      : {};

    return {
      id: app.id,
      refNo: app.refNo,
      applicantName: app.applicant.name,
      applicantEmail: app.applicant.email,
      applicantPhone: parsedData.contactNumber || '—',
      subject: normalizeSubject(parsedData.teachingSubject),
      degree: `${parsedData.highestLevel || "Bachelor's"} (${parsedData.fieldOfStudy || 'Education'})`,
      stage: app.stage,
      status: app.status,
      booking: (parsedData.ascBooking as AscBooking) || null,
      assignedReviewers: app.assignments.map((a) => ({
        id: a.reviewer.id,
        name: a.reviewer.name,
      })),
    };
  });

  return (
    <div className="space-y-6">
      <AscManagementHub
        initialConfig={slotData.config}
        initialSlots={slotData.slots}
        candidates={candidates}
        locale={locale}
      />
    </div>
  );
}
