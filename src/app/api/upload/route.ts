// src/app/api/upload/route.ts
import { NextResponse } from 'next/server';
import uploadDocument from '@/lib/services/upload.service';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    const result = await uploadDocument(file);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to process file' }, { status: 500 });
  }
}