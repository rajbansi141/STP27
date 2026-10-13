import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { filename } = await params;

    // Security: sanitize filename to prevent directory traversal
    const safeFilename = path.basename(filename);
    const isOwner = safeFilename.startsWith(user.id);
    const isStaff = user.role === 'ADMIN' || user.role === 'REVIEWER';

    // Access control: only owner or staff can view
    if (!isOwner && !isStaff) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const filePath = path.join(process.cwd(), 'uploads', 'cv', safeFilename);

    try {
      const fileBuffer = await fs.readFile(filePath);
      const ext = path.extname(safeFilename).toLowerCase();
      let contentType = 'application/octet-stream';

      if (ext === '.pdf') contentType = 'application/pdf';
      else if (ext === '.doc') contentType = 'application/msword';
      else if (ext === '.docx')
        contentType =
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="${safeFilename}"`,
        },
      });
    } catch {
      return NextResponse.json({ error: 'File not found.' }, { status: 404 });
    }
  } catch (err) {
    console.error('File download error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
