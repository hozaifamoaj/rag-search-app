// Issues a signed upload URL so the browser uploads directly to Supabase (not through Vercel).
import { NextResponse } from 'next/server';
import { createSignedUploadUrl } from '@/lib/repositories/storage.repository';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const fileName = typeof body?.fileName === 'string' ? body.fileName : '';
    if (!fileName) {
      return NextResponse.json({ error: 'fileName is required' }, { status: 400 });
    }

    const documentId = crypto.randomUUID();
    const ext = fileName.split('.').pop() || 'bin';
    const filePath = `${documentId}.${ext}`;

    const { data, error } = await createSignedUploadUrl(filePath);
    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'Could not create signed upload URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      documentId,
      filePath,
      token: data.token,
      signedUrl: data.signedUrl,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to prepare upload';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
