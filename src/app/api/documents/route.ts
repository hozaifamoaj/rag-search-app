// src/app/api/documents/route.ts
import { NextResponse } from 'next/server';
import { Buffer } from 'buffer';
import { listDocuments, getDocument, deleteDocument } from '@/lib/services/document.service';
import { downloadFile, getPublicUrl, deleteFile } from '@/lib/repositories/storage.repository';

/** Helper to stream a file buffer */
async function streamFile(buffer: Buffer, mime: string, disposition: string) {
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': mime,
      'Content-Disposition': disposition,
      'Content-Length': buffer.length.toString(),
    },
  });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id') || url.searchParams.get('document_id');
    const file = url.searchParams.get('file') === 'true';
    const view = url.searchParams.get('view') === 'true';

    // Serve file download / preview
    if (id && file) {
      if (!id) {
        return NextResponse.json({ error: 'Document ID required for file download' }, { status: 400 });
      }
      // Retrieve metadata to know file path and type
      const { metadata } = await getDocument(id);
      if (!metadata) {
        return NextResponse.json({ error: 'Document metadata not found' }, { status: 404 });
      }
      const filePath = metadata.file_path || `${id}.${metadata.file_name?.split('.').pop() || 'pdf'}`;
      const mime = metadata.file_type || 'application/octet-stream';
      const publicUrl = getPublicUrl(filePath);

      // Download file from storage
      const { data: fileData, error } = await downloadFile(filePath);
      if (error || !fileData) {
        return NextResponse.json({ error: error?.message || 'File not found' }, { status: 404 });
      }
      const buffer = Buffer.from(await fileData.arrayBuffer());
      const disposition = view && mime === 'application/pdf'
        ? `inline; filename="${metadata.file_name}"`
        : `attachment; filename="${metadata.file_name}"`;
      return await streamFile(buffer, mime, disposition);
    }

    // Single document with full text
    if (id) {
      const { metadata, fullText } = await getDocument(id);
      return NextResponse.json({
        id,
        file_name: metadata.file_name,
        file_type: metadata.file_type,
        file_size: metadata.file_size,
        upload_date: metadata.upload_date,
        total_chunks: metadata.total_chunks,
        fullText,
        file_url: metadata.file_url,
        file_path: metadata.file_path,
      });
    }

    // List all documents (summaries)
    const docs = await listDocuments();
    return NextResponse.json({ documents: docs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** Delete a document by its ID */
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    let id =
      url.searchParams.get('id') ||
      url.searchParams.get('document_id') ||
      null;

    if (!id) {
      try {
        const body = await req.json();
        if (body && typeof body.id === 'string') id = body.id;
        else if (body && typeof body.document_id === 'string') id = body.document_id;
      } catch {
        // No JSON body
      }
    }

    if (!id || id === 'undefined' || id === 'null') {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    // Retrieve document metadata to know the storage file path.
    const docResult = await getDocument(id).catch(() => null);
    if (!docResult || !docResult.metadata) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    await deleteDocument(id, async (filePath) => {
      const { error } = await deleteFile(filePath);
      if (error) throw new Error(error.message);
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


