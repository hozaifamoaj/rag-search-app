import { NextResponse } from 'next/server';
import { listDocuments, getDocument, deleteDocument } from '@/lib/services/document.service';
import { downloadFile, getPublicUrl, deleteFile } from '@/lib/repositories/storage.repository';
import { DocumentIdSchema } from '@/lib/validators/document';
import { ok, fail, handleError } from '@/lib/api/response';

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
    const rawId = url.searchParams.get('id') || url.searchParams.get('document_id');
    const serveFile = url.searchParams.get('file') === 'true';
    const inline = url.searchParams.get('view') === 'true';

    if (rawId && serveFile) {
      const parsed = DocumentIdSchema.safeParse({ id: rawId });
      if (!parsed.success) return fail('VALIDATION_ERROR', parsed.error.issues[0].message, 400);

      const { metadata } = await getDocument(parsed.data.id);
      const filePath = metadata.file_path ?? `${parsed.data.id}.${metadata.file_name.split('.').pop() ?? 'bin'}`;
      const mime = metadata.file_type || 'application/octet-stream';

      const { data: fileData, error } = await downloadFile(filePath);
      if (error || !fileData) return fail('NOT_FOUND', error?.message || 'File not found', 404);

      const buffer = Buffer.from(await fileData.arrayBuffer());
      const disposition =
        inline && mime === 'application/pdf'
          ? `inline; filename="${metadata.file_name}"`
          : `attachment; filename="${metadata.file_name}"`;
      return streamFile(buffer, mime, disposition);
    }

    if (rawId) {
      const parsed = DocumentIdSchema.safeParse({ id: rawId });
      if (!parsed.success) return fail('VALIDATION_ERROR', parsed.error.issues[0].message, 400);

      const { metadata, fullText } = await getDocument(parsed.data.id);
      return ok({ ...metadata, fullText });
    }

    const docs = await listDocuments();
    return ok({ documents: docs });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    let rawId = url.searchParams.get('id') || url.searchParams.get('document_id');

    if (!rawId) {
      const body = await req.json().catch(() => null);
      rawId = (typeof body?.id === 'string' ? body.id : null) ??
              (typeof body?.document_id === 'string' ? body.document_id : null);
    }

    const parsed = DocumentIdSchema.safeParse({ id: rawId ?? '' });
    if (!parsed.success) return fail('VALIDATION_ERROR', 'Document ID is required', 400);

    await deleteDocument(parsed.data.id, async (filePath) => {
      const { error } = await deleteFile(filePath);
      if (error) throw error;
    });

    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
