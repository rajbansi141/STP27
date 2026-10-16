import prisma from './prisma';

export async function ensureDefaultCohort() {
  try {
    // 1. Ensure 2027 cohort exists
    let cohort2027 = await prisma.cohort.findUnique({
      where: { year: 2027 },
    });

    if (!cohort2027) {
      cohort2027 = await prisma.cohort.create({
        data: {
          code: 'STP27',
          nameEn: 'Saathi Teachers Programme 2027',
          nameNe: 'साथी शिक्षक कार्यक्रम २०२७',
          year: 2027,
          status: 'ACTIVE',
          isCurrent: true,
          description: 'Official cohort for the 2027 Saathi Teachers fellowship cycle.',
        },
      });
    }

    // 2. Link any unlinked applications to the 2027 cohort
    await prisma.application.updateMany({
      where: { cohortId: null },
      data: { cohortId: cohort2027.id },
    });

    return cohort2027;
  } catch (err) {
    console.error('Error ensuring default cohort:', err);
    return null;
  }
}
