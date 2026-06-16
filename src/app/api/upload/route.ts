import processUploadedDocument from '@/lib/services/upload.service';
import { ProcessInputSchema } from '@/lib/validators/upload';
import { ok, fail, handleError } from '@/lib/api/response';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = ProcessInputSchema.safeParse(body);
    if (!parsed.success) {
      return fail('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
    }

    const result = await processUploadedDocument(parsed.data);
    return ok({
      documentId: result.documentId,
      fileName: result.fileName,
      fileUrl: result.fileUrl,
      chunks: result.chunksInserted,
    }, 201);
  } catch (err) {
    return handleError(err);
  }
}
