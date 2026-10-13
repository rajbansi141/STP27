import prisma from '@/lib/prisma';

export interface DeadlineStatus {
  isOpen: boolean;
  deadline: Date;
  deadlineIso: string;
  cohortYear: number;
  cycleLabel: string;
  serverTime: string;
}

/**
 * Server-authoritative check for recruitment cycle deadline.
 * Server time is the sole authority (client cannot spoof).
 */
export async function getApplicationDeadlineStatus(): Promise<DeadlineStatus> {
  const settings = await prisma.settings.findUnique({
    where: { id: 'default' },
  });

  const deadline = settings?.deadline || new Date('2027-04-30T23:59:59.000Z');
  const now = new Date();
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
