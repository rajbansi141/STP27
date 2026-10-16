'use server';

import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export interface CohortItem {
  id: string;
  code: string;
  nameEn: string;
  nameNe: string;
  year: number;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  isCurrent: boolean;
  description: string | null;
  applicationOpen: string | null;
  applicationClose: string | null;
  createdAt: string;
  applicationCount: number;
  finalSelectedCount: number;
}

export interface CohortActionState {
  success: boolean;
  message?: string;
  data?: unknown;
}

const createCohortSchema = z.object({
  year: z.coerce.number().min(2020).max(2050),
  code: z.string().min(2).max(10).toUpperCase(),
  nameEn: z.string().min(3),
  nameNe: z.string().min(3),
  description: z.string().optional(),
  applicationOpen: z.string().optional(),
  applicationClose: z.string().optional(),
  setAsCurrent: z.boolean().default(false),
});

/**
 * Retrieves all cohorts with aggregated statistics.
 * RBAC: ADMIN only.
 */
export async function getCohortsAction(): Promise<{ success: boolean; cohorts: CohortItem[] }> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return { success: false, cohorts: [] };
    }

    const cohorts = await prisma.cohort.findMany({
      orderBy: { year: 'desc' },
      include: {
        _count: {
          select: {
            applications: true,
          },
        },
        applications: {
          where: { status: 'FINAL_SELECTED' },
          select: { id: true },
        },
      },
    });

    const formatted: CohortItem[] = cohorts.map((c) => ({
      id: c.id,
      code: c.code,
      nameEn: c.nameEn,
      nameNe: c.nameNe,
      year: c.year,
      status: c.status as CohortItem['status'],
      isCurrent: c.isCurrent,
      description: c.description,
      applicationOpen: c.applicationOpen ? c.applicationOpen.toISOString() : null,
      applicationClose: c.applicationClose ? c.applicationClose.toISOString() : null,
      createdAt: c.createdAt.toISOString(),
      applicationCount: c._count.applications,
      finalSelectedCount: c.applications.length,
    }));

    return { success: true, cohorts: formatted };
  } catch (err) {
    console.error('Failed to get cohorts:', err);
    return { success: false, cohorts: [] };
  }
}

/**
 * Launches / Creates a new fellowship cohort.
 * RBAC: ADMIN only.
 */
export async function createCohortAction(rawData: z.infer<typeof createCohortSchema>): Promise<CohortActionState> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized. Admin credentials required.' };
    }

    const validated = createCohortSchema.safeParse(rawData);
    if (!validated.success) {
      return { success: false, message: 'Invalid cohort details provided.' };
    }

    const { year, code, nameEn, nameNe, description, applicationOpen, applicationClose, setAsCurrent } = validated.data;

    // Check duplicate year or code
    const existing = await prisma.cohort.findFirst({
      where: {
        OR: [{ year }, { code }],
      },
    });

    if (existing) {
      return {
        success: false,
        message: existing.year === year
          ? `Cohort for year ${year} already exists.`
          : `Cohort with code "${code}" already exists.`,
      };
    }

    await prisma.$transaction(async (tx) => {
      if (setAsCurrent) {
        await tx.cohort.updateMany({
          data: { isCurrent: false },
        });
      }

      const newCohort = await tx.cohort.create({
        data: {
          year,
          code,
          nameEn,
          nameNe,
          description: description || null,
          applicationOpen: applicationOpen ? new Date(applicationOpen) : null,
          applicationClose: applicationClose ? new Date(applicationClose) : null,
          isCurrent: setAsCurrent,
          status: setAsCurrent ? 'ACTIVE' : 'DRAFT',
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          role: user.role,
          action: 'CREATE_COHORT',
          entity: 'Cohort',
          entityId: newCohort.id,
          meta: JSON.stringify({ year, code, nameEn, setAsCurrent }),
        },
      });
    });

    revalidatePath('/admin');
    revalidatePath('/admin/cohorts');
    revalidatePath('/admin/candidates');

    return { success: true, message: `Cohort ${code} (${year}) created successfully!` };
  } catch (err) {
    console.error('Failed to create cohort:', err);
    return { success: false, message: 'Failed to create cohort.' };
  }
}

/**
 * Switches the active / current cohort in the system.
 * RBAC: ADMIN only.
 */
export async function switchActiveCohortAction(cohortId: string): Promise<CohortActionState> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized.' };
    }

    const targetCohort = await prisma.cohort.findUnique({
      where: { id: cohortId },
    });

    if (!targetCohort) {
      return { success: false, message: 'Target cohort not found.' };
    }

    await prisma.$transaction(async (tx) => {
      // Unset current on all
      await tx.cohort.updateMany({
        data: { isCurrent: false },
      });

      // Set target cohort as active and current
      await tx.cohort.update({
        where: { id: cohortId },
        data: {
          isCurrent: true,
          status: targetCohort.status === 'ARCHIVED' ? 'ACTIVE' : targetCohort.status,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          role: user.role,
          action: 'SWITCH_ACTIVE_COHORT',
          entity: 'Cohort',
          entityId: cohortId,
          meta: JSON.stringify({ year: targetCohort.year, code: targetCohort.code }),
        },
      });
    });

    revalidatePath('/admin');
    revalidatePath('/admin/cohorts');
    revalidatePath('/admin/candidates');
    revalidatePath('/reviewer');

    return { success: true, message: `Active cohort switched to ${targetCohort.nameEn}.` };
  } catch (err) {
    console.error('Failed to switch cohort:', err);
    return { success: false, message: 'Server error switching active cohort.' };
  }
}

/**
 * Updates the lifecycle status of a cohort (DRAFT, ACTIVE, COMPLETED, ARCHIVED).
 * RBAC: ADMIN only.
 */
export async function updateCohortStatusAction(
  cohortId: string,
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
): Promise<CohortActionState> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized.' };
    }

    const updated = await prisma.cohort.update({
      where: { id: cohortId },
      data: {
        status,
        ...(status === 'ARCHIVED' ? { isCurrent: false } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        role: user.role,
        action: 'UPDATE_COHORT_STATUS',
        entity: 'Cohort',
        entityId: cohortId,
        meta: JSON.stringify({ status, code: updated.code }),
      },
    });

    revalidatePath('/admin/cohorts');
    revalidatePath('/admin/candidates');

    return { success: true, message: `Cohort status updated to ${status}.` };
  } catch (err) {
    console.error('Failed to update cohort status:', err);
    return { success: false, message: 'Error updating cohort status.' };
  }
}

/**
 * Updates the application timeline / deadlines for a cohort.
 * RBAC: ADMIN only.
 */
export async function updateCohortDatesAction(
  cohortId: string,
  applicationOpen?: string,
  applicationClose?: string
): Promise<CohortActionState> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return { success: false, message: 'Unauthorized.' };
    }

    await prisma.cohort.update({
      where: { id: cohortId },
      data: {
        applicationOpen: applicationOpen ? new Date(applicationOpen) : null,
        applicationClose: applicationClose ? new Date(applicationClose) : null,
      },
    });

    revalidatePath('/admin/cohorts');
    return { success: true, message: 'Cohort application dates updated successfully.' };
  } catch (err) {
    console.error('Failed to update cohort dates:', err);
    return { success: false, message: 'Error saving cohort dates.' };
  }
}
