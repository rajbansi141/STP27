import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import prisma from '@/lib/prisma';
import { getAscPassPdfBuffer, AscPassPdfData } from '@/lib/pdf/ascPassGenerator';
import { DEFAULT_ASC_CONFIG, AscBooking } from '@/lib/constants/applicationReview';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const { id } = await params;
    const application = await prisma.application.findUnique({
      where: { id },
      include: { applicant: true },
    });

    if (!application) {
      return NextResponse.json({ error: 'Application record not found.' }, { status: 404 });
    }

    const isOwner = application.applicantId === user.id;
    let hasAccess = isOwner || user.role === 'ADMIN';

    // If reviewer, strictly enforce reviewer assignment ownership
    if (!hasAccess && user.role === 'REVIEWER') {
      const isAssigned = await prisma.reviewerAssignment.findFirst({
        where: { applicationId: application.id, reviewerId: user.id },
      });
      const hasReview = isAssigned
        ? true
        : await prisma.review.findFirst({
            where: { applicationId: application.id, reviewerId: user.id },
          });

      if (isAssigned || hasReview) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to view or download this pass.' },
        { status: 403 }
      );
    }

    const appData = application.data
      ? typeof application.data === 'string'
        ? JSON.parse(application.data)
        : application.data
      : {};

    const booking: AscBooking = appData?.ascBooking || {
      bookedDate: DEFAULT_ASC_CONFIG.startDate,
      bookedAt: new Date().toISOString(),
      venue: DEFAULT_ASC_CONFIG.venue,
      reportingTime: DEFAULT_ASC_CONFIG.reportingTime,
      status: 'CONFIRMED',
    };

    const resolvedSubject = appData?.teachingSubject
      ? appData.teachingSubject.charAt(0).toUpperCase() + appData.teachingSubject.slice(1)
      : appData?.subject || 'Grade Teaching';

    const resolvedAddress = appData?.permanentMunicipality
      ? `${appData.permanentMunicipality}, ${appData.permanentProvince || ''}`
      : appData?.currentMunicipality
      ? `${appData.currentMunicipality}, ${appData.currentProvince || ''}`
      : appData?.address || 'Nepal';

    const passData: AscPassPdfData = {
      refNo: application.refNo,
      candidateName: appData?.fullName || application.applicant.name,
      email: application.applicant.email,
      phone: appData?.contactNumber || appData?.mobileNumber || appData?.phone || '—',
      subject: resolvedSubject,
      address: resolvedAddress,
      degree: appData?.highestLevel || appData?.highestDegree || "Bachelor's Degree",
      booking,
    };

    const pdfBuffer = getAscPassPdfBuffer(passData);
    const isInline = req.nextUrl.searchParams.get('inline') === 'true';
    const safeRef = application.refNo.replace(/[^a-zA-Z0-9_-]/g, '_');
    const disposition = isInline
      ? `inline; filename="ASC_Admit_Pass_${safeRef}.pdf"`
      : `attachment; filename="ASC_Admit_Pass_${safeRef}.pdf"`;

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': disposition,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Error generating ASC admit pass PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate ASC admit pass PDF document.' },
      { status: 500 }
    );
  }
}
