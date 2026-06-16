import { createSignedUploadUrl } from '@/lib/repositories/storage.repository';
import { PrepareInputSchema } from '@/lib/validators/upload';
import { ok, fail, handleError } from '@/lib/api/response';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = PrepareInputSchema.safeParse(body);
    if (!parsed.success) {
      return fail('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
    }

    const { fileName } = parsed.data;
    const documentId = crypto.randomUUID();
    const ext = fileName.split('.').pop() || 'bin';
    const filePath = `${documentId}.${ext}`;

    const { data, error } = await createSignedUploadUrl(filePath);
    if (error || !data) {
      return fail('STORAGE_ERROR', error?.message || 'Could not create signed upload URL', 500);
    }

    return ok({ documentId, filePath, token: data.token, signedUrl: data.signedUrl });
  } catch (err) {
    return handleError(err);
  }
}
