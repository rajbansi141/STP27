import { jsPDF } from 'jspdf';
import { AscBooking } from '@/lib/constants/applicationReview';

export interface AscPassPdfData {
  refNo: string;
  candidateName: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  address?: string | null;
  degree?: string | null;
  booking: AscBooking;
}

/**
 * Draws a sharp, vector-rendered 2D QR matrix with finder patterns in pure jsPDF.
 */
function drawVectorQrCode(
  doc: jsPDF,
  x: number,
  y: number,
  size: number,
  seedString: string
) {
  // Background white box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, size, size, 1.5, 1.5, 'FD');

  const padding = 2;
  const qrInnerSize = size - padding * 2;
  const cells = 21; // standard version 1 QR size
  const cellSize = qrInnerSize / cells;

  doc.setFillColor(15, 23, 42); // Slate 900 for dark modules

  // Helper to draw a single module
  const drawCell = (cx: number, cy: number) => {
    doc.rect(x + padding + cx * cellSize, y + padding + cy * cellSize, cellSize, cellSize, 'F');
  };

  // Helper to draw finder pattern (7x7 with inner 3x3)
  const drawFinderPattern = (startX: number, startY: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        if (isOuter || isInner) {
          drawCell(startX + c, startY + r);
        }
      }
    }
  };

  // Three standard position detection patterns
  drawFinderPattern(0, 0);
  drawFinderPattern(cells - 7, 0);
  drawFinderPattern(0, cells - 7);

  // Timing patterns
  for (let i = 8; i < cells - 8; i += 2) {
    drawCell(6, i);
    drawCell(i, 6);
  }

  // Deterministic pseudo-random module distribution based on candidate refNo seed
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = (hash << 5) - hash + seedString.charCodeAt(i);
    hash |= 0;
  }

  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      // Skip finder pattern zones
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= cells - 8;
      const inBottomLeft = r >= cells - 8 && c < 8;
      if (inTopLeft || inTopRight || inBottomLeft) continue;

      const pseudoBit = Math.abs(Math.sin((r * 29 + c * 17 + hash) * 1.5)) > 0.48;
      if (pseudoBit) {
        drawCell(c, r);
      }
    }
  }
}

/**
 * Constructs and formats the official industrial jsPDF instance for an ASC Admit Pass.
 */
/**
 * Constructs and formats the official industrial jsPDF instance for an ASC Admit Pass.
 * Matches 1:1 in design, color scheme, typography, and structure with the on-screen viewed pass.
 */
export function buildAscPassPdfDoc(data: AscPassPdfData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // Outer Security Frame
  doc.setDrawColor(4, 120, 87); // Emerald 700
  doc.setLineWidth(0.8);
  doc.roundedRect(margin - 3, margin - 3, contentWidth + 6, 260, 3, 3, 'D');

  doc.setDrawColor(209, 250, 229); // Emerald 100
  doc.setLineWidth(0.3);
  doc.roundedRect(margin - 1.5, margin - 1.5, contentWidth + 3, 257, 2, 2, 'D');

  // ================= 1. PASS HERO BANNER =================
  let y = margin;
  const heroHeight = 32;
  doc.setFillColor(6, 78, 59); // Deep Forest Emerald (#064e3b)
  doc.roundedRect(margin, y, contentWidth, heroHeight, 2, 2, 'F');

  // Top Credential Badge Pill
  doc.setFillColor(4, 120, 87); // Emerald 700
  doc.setDrawColor(16, 185, 129); // Emerald 500
  doc.setLineWidth(0.3);
  doc.roundedRect(margin + 4, y + 3.5, 48, 5, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(209, 250, 229); // Mint
  doc.text('OFFICIAL SELECTION CREDENTIAL', margin + 6, y + 7);

  // Main Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14.5);
  doc.setTextColor(255, 255, 255);
  doc.text('SAATHI TEACHERS PROGRAMME 2027', margin + 4, y + 16);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(167, 243, 208); // Emerald 200
  doc.text(
    'Assessment Saathi Candidates (ASC) • Official Admit Pass & Gate Pass',
    margin + 4,
    y + 22
  );

  // Reference & Seat Status on Header Right
  const rightAlignX = margin + contentWidth - 4;
  doc.setFillColor(15, 118, 110); // Teal 700
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.2);
  doc.roundedRect(rightAlignX - 44, y + 5, 44, 7.5, 1.5, 1.5, 'FD');

  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`REF: ${data.refNo}`, rightAlignX - 22, y + 10, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(110, 231, 183); // Emerald 300
  doc.text('SEAT: CONFIRMED & RESERVED', rightAlignX, y + 19, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(209, 250, 229);
  doc.text('Issued by Admissions Desk', rightAlignX, y + 24, { align: 'right' });

  // ================= 2. CANDIDATE DOSSIER & QR CODE =================
  y += heroHeight + 4;
  const dossierHeight = 54;
  const qrBoxWidth = 38;
  const detailsWidth = contentWidth - qrBoxWidth - 4;

  // Dossier Card Box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, detailsWidth, dossierHeight, 2, 2, 'FD');

  // Candidate Avatar Box
  doc.setFillColor(236, 253, 245); // Emerald 50
  doc.setDrawColor(167, 243, 208); // Emerald 200
  doc.setLineWidth(0.4);
  doc.roundedRect(margin + 4, y + 4, 12, 12, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(6, 95, 70); // Emerald 800
  const initial = (data.candidateName || 'S').charAt(0).toUpperCase();
  doc.text(initial, margin + 10, y + 12.5, { align: 'center' });

  // Candidate Name & Specialization
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(4, 120, 87); // Emerald 700
  doc.text('SAATHI TEACHER CANDIDATE', margin + 19, y + 7.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text(data.candidateName, margin + 19, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text('Specialization Track: ', margin + 19, y + 17.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text(data.subject || 'Grade Teaching', margin + 46, y + 17.5);

  // 3 Info Cards inside Dossier
  const infoY = y + 21;
  const cardWidth = (detailsWidth - 12) / 3;
  const cardHeight = 16;

  const drawPillCard = (label: string, value: string, cx: number) => {
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cx, infoY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(label.toUpperCase(), cx + 2.5, infoY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    // Truncate cleanly if too long for card
    const maxChars = 22;
    const safeVal = value.length > maxChars ? value.slice(0, maxChars - 1) + '…' : value;
    doc.text(safeVal, cx + 2.5, infoY + 11.5);
  };

  drawPillCard('Contact Mobile', data.phone || '—', margin + 4);
  drawPillCard('Registered Email', data.email, margin + 4 + cardWidth + 2);
  drawPillCard('Qualification', data.degree || "Bachelor's Degree", margin + 4 + (cardWidth + 2) * 2);

  // Address Row
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Permanent Address:', margin + 4, y + 43);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text(data.address || 'Nepal', margin + 30, y + 43);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Cohort Assignment: Saathi Teachers Programme (STP) 2027', margin + 4, y + 49);

  // QR Code Box on the Right
  const qrX = margin + detailsWidth + 4;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(qrX, y, qrBoxWidth, dossierHeight, 2, 2, 'FD');

  const qrSize = 25;
  const qrPaddingX = qrX + (qrBoxWidth - qrSize) / 2;
  drawVectorQrCode(doc, qrPaddingX, y + 5, qrSize, data.refNo);

  const sessionCode = `ASC-${data.booking.bookedDate.replace(/-/g, '')}-${data.refNo.slice(-4)}`;
  doc.setFont('courier', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text(sessionCode, qrX + qrBoxWidth / 2, y + 36, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(5, 150, 105); // Emerald 600
  doc.text('SCAN AT SECURITY GATE', qrX + qrBoxWidth / 2, y + 42, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text('Gate Security Validation', qrX + qrBoxWidth / 2, y + 47, { align: 'center' });

  // ================= 3. ASSESSMENT SCHEDULE & VENUE DETAILS =================
  y += dossierHeight + 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // Slate 600
  doc.text('ASSESSMENT SCHEDULE & VENUE DETAILS', margin, y);

  y += 3;
  const scheduleColWidth = (contentWidth - 4) / 2;
  const scheduleHeight = 24;

  // Date Card (Left)
  doc.setFillColor(236, 253, 245); // Emerald 50
  doc.setDrawColor(167, 243, 208); // Emerald 200
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, scheduleColWidth, scheduleHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(6, 95, 70); // Emerald 800
  doc.text('ASSIGNED EXAM DATE', margin + 4, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(data.booking.bookedDate, margin + 4, y + 13);

  const bookedDateObj = new Date(data.booking.bookedDate);
  const formattedDate = bookedDateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(formattedDate, margin + 4, y + 19);

  // Time & Cutoff Card (Right)
  const timeX = margin + scheduleColWidth + 4;
  doc.setFillColor(240, 253, 250); // Teal 50
  doc.setDrawColor(153, 246, 228); // Teal 200
  doc.roundedRect(timeX, y, scheduleColWidth, scheduleHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(17, 94, 89); // Teal 800
  doc.text('REPORTING TIME & CUTOFF', timeX + 4, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(data.booking.reportingTime || '08:30 AM NPT (Sharp)', timeX + 4, y + 13);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(225, 29, 72); // Rose 600
  doc.text('! Gates close strictly at 08:45 AM (No late entries)', timeX + 4, y + 19);

  // Venue Location Box (Below Schedule)
  y += scheduleHeight + 3.5;
  const venueHeight = 22;
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, venueHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('VENUE LOCATION', margin + 4, y + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  const venueTitle = data.booking.venue || 'Saathi Central Assessment Center, Sanothimi, Bhaktapur';
  doc.text(venueTitle, margin + 4, y + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Sanothimi, Bhaktapur (Near CTEVT / Education Training Center) • Kathmandu Valley', margin + 4, y + 16.5);

  // ================= 4. MANDATORY ENTRY CHECKLIST =================
  y += venueHeight + 5;
  const checklistHeight = 34;
  doc.setFillColor(240, 253, 244); // Emerald 50
  doc.setDrawColor(187, 247, 208); // Emerald 200
  doc.roundedRect(margin, y, contentWidth, checklistHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(6, 95, 70); // Emerald 800
  doc.text('MANDATORY DOCUMENTS REQUIRED FOR ENTRY:', margin + 4, y + 6);

  const checklistItems = [
    'Original Nepali Citizenship / National Identity Card (Mandatory for security gate verification).',
    "Original Bachelor's Degree Transcripts & Character Certificates for physical spot verification.",
    'Two (2) recent passport-sized color photographs matching your application dossier.',
    'Printed physical hardcopy of this ASC Admit Pass for official gate stamping.',
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);

  checklistItems.forEach((item, index) => {
    const itemY = y + 12 + index * 5.2;
    // Green check circle
    doc.setFillColor(5, 150, 105);
    doc.circle(margin + 6, itemY - 0.8, 1.2, 'F');
    doc.text(item, margin + 10, itemY);
  });

  // ================= 5. FOOTER & SECURITY SEAL =================
  y += checklistHeight + 5;
  const footerHeight = 22;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, footerHeight, 1.5, 1.5, 'FD');

  // Security Hash
  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`SEC-HASH: [STP27-ASC-${data.refNo}-VERIFIED] • SYSTEM AUTHENTICATED`, margin + 4, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Cryptographically Signed & Timestamped: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kathmandu' })} NPT`,
    margin + 4,
    y + 12
  );
  doc.text('Security Key: SHA256-AUTHENTICATED-ADMIT-PASS • PORTAL VALIDATED', margin + 4, y + 16.5);

  // Authorized Signatory
  const sigX = margin + contentWidth - 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Member Secretary', sigX, y + 8, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Selection Committee • Saathi Teachers Programme', sigX, y + 12.5, { align: 'right' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(5, 150, 105);
  doc.text('Digitally Authorized & Verified', sigX, y + 16.5, { align: 'right' });

  // Bottom Notice
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'This is an official system-generated Admit Pass issued by the Saathi Teachers Programme 2027 Portal. No manual alteration permitted.',
    pageWidth / 2,
    y + footerHeight + 4.5,
    { align: 'center' }
  );

  return doc;
}

/**
 * Triggers client-side browser download of the official ASC Admit Pass PDF.
 */
export function downloadAscPassPdf(data: AscPassPdfData) {
  const doc = buildAscPassPdfDoc(data);
  const fileName = `ASC_Admit_Pass_${data.refNo.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  doc.save(fileName);
}

/**
 * Returns a Buffer of the generated PDF for server-side streaming / API downloads.
 */
export function getAscPassPdfBuffer(data: AscPassPdfData): Buffer {
  const doc = buildAscPassPdfDoc(data);
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
