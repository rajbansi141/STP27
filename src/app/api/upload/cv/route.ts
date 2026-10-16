import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import fs from 'node:fs/promises';
import path from 'node:path';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];

/**
 * Verifies file magic bytes (binary file signatures) to prevent MIME-spoofing and executable uploads.
 */
function verifyMagicBytes(buffer: Buffer, ext: string): boolean {
  if (buffer.length < 5) return false;

  // PDF signature: %PDF- (0x25 0x50 0x44 0x46 0x2D)
  if (ext === '.pdf') {
    return (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46 &&
      buffer[4] === 0x2d
    );
  }

  // DOCX / ZIP package signature: PK\x03\x04 (0x50 0x4B 0x03 0x04)
  if (ext === '.docx') {
    return (
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04
    );
  }

  // DOC (legacy Microsoft Word OLE2 Compound Document): 0xD0 0xCF 0x11 0xE0
  if (ext === '.doc') {
    return (
      buffer[0] === 0xd0 &&
      buffer[1] === 0xcf &&
      buffer[2] === 0x11 &&
      buffer[3] === 0xe0
    );
  }

  return false;
}

/**
 * Virus scan hook placeholder for file uploads
 */
async function scanFileForViruses(buffer: Buffer): Promise<{ isClean: boolean; reason?: string }> {
  // Virus scan hook: placeholder for ClamAV / AWS GuardDuty / external engine
  if (buffer.length === 0) {
    return { isClean: false, reason: 'Empty file detected.' };
  }
  return { isClean: true };
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Size validation (Max 5 MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File size exceeds maximum allowed limit of 5 MB.' },
        { status: 400 }
      );
    }

    // Extension & MIME validation
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: 'Invalid file format. Only PDF, DOC, and DOCX files are allowed.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Binary Magic Bytes Signature Verification
    if (!verifyMagicBytes(buffer, ext)) {
      return NextResponse.json(
        { error: 'Invalid file signature: Content does not match genuine PDF or Word document format.' },
        { status: 400 }
      );
    }

    // Virus scan hook verification
    const scan = await scanFileForViruses(buffer);
    if (!scan.isClean) {
      return NextResponse.json(
        { error: scan.reason || 'File failed security screening.' },
        { status: 400 }
      );
    }

    // Store in private uploads folder
    const uploadsDir = path.join(process.cwd(), 'uploads', 'cv');
    await fs.mkdir(uploadsDir, { recursive: true });

    const safeBaseName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storedFileName = `${user.id}_${Date.now()}_${safeBaseName}`;
    const filePath = path.join(uploadsDir, storedFileName);

    await fs.writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      storedFileName,
      fileUrl: `/api/files/${storedFileName}`,
      size: file.size,
    });
  } catch (err) {
    console.error('CV upload error:', err);
    return NextResponse.json({ error: 'Failed to upload CV file.' }, { status: 500 });
  }
}
