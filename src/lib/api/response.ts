import { NextResponse } from 'next/server';
import { AppError, getErrorMessage } from './errors';

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function fail(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function handleError(err: unknown): NextResponse {
  if (err instanceof AppError) {
    return fail(err.code, err.message, err.status);
  }
  return fail('INTERNAL_ERROR', getErrorMessage(err), 500);
}
