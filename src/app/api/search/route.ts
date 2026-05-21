// src/app/api/search/route.ts
import { NextResponse } from 'next/server';
import { search } from '@/lib/services/search.service';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    if (!query) {
      return NextResponse.json({ error: 'Query parameter missing' }, { status: 400 });
    }
    const result = await search(query);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}