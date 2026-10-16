import prisma from '@/lib/prisma';

export interface DeadlineStatus {
  isOpen: boolean;
  deadline: Date;
  deadlineIso: string;
  cohortYear: number;
  cycleLabel: string;
  cohortId?: string;
  cohortCode?: string;
  serverTime: string;
}

/**
 * Server-authoritative check for recruitment cycle deadline.
 * Server time is the sole authority (client cannot spoof).
 * Automatically reads from the currently active Cohort if defined,
 * with graceful fallback to Settings.
 */
export async function getApplicationDeadlineStatus(): Promise<DeadlineStatus> {
  const now = new Date();

  try {
    const currentCohort = await prisma.cohort.findFirst({
      where: { isCurrent: true },
    });

    if (currentCohort) {
      const deadline =
        currentCohort.applicationClose ||
        new Date(`${currentCohort.year}-04-30T23:59:59.000Z`);
      const isPastOpen = !currentCohort.applicationOpen || now >= currentCohort.applicationOpen;
      const isBeforeClose = !currentCohort.applicationClose || now <= currentCohort.applicationClose;
      const isOpen = currentCohort.status === 'ACTIVE' && isPastOpen && isBeforeClose;

      return {
        isOpen,
        deadline,
        deadlineIso: deadline.toISOString(),
        cohortYear: currentCohort.year,
        cycleLabel: currentCohort.nameEn,
        cohortId: currentCohort.id,
        cohortCode: currentCohort.code,
        serverTime: now.toISOString(),
      };
    }
  } catch {
    // Graceful fallback if Cohort table is not yet populated
  }

  const settings = await prisma.settings.findUnique({
    where: { id: 'default' },
  });

  const deadline = settings?.deadline || new Date('2027-04-30T23:59:59.000Z');
  const isOpen = now <= deadline;

  return {
    isOpen,
    deadline,
    deadlineIso: deadline.toISOString(),
    cohortYear: settings?.cohortYear || 2027,
    cycleLabel: settings?.cycleLabel || 'Saathi Teachers Programme (STP) Application 2027',
    serverTime: now.toISOString(),
  };
}
