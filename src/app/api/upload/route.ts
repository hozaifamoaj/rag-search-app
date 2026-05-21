// src/app/api/upload/route.ts
import { NextResponse } from 'next/server';
import processUploadedDocument from '@/lib/services/upload.service';

/** Processing large PDFs can exceed the default 10s on Vercel Hobby. */
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { documentId, filePath, fileName, fileType, fileSize } = body;

    if (!documentId || !filePath || !fileName) {
      return NextResponse.json(
        { success: false, error: 'documentId, filePath, and fileName are required' },
        { status: 400 }
      );
    }

    const result = await processUploadedDocument({
      documentId,
      filePath,
      fileName,
      fileType: fileType || '',
      fileSize: typeof fileSize === 'number' ? fileSize : 0,
    });

    return NextResponse.json({
      success: true,
      fileName: result.fileName,
      chunks: result.chunksInserted,
      ...result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process file';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
