// src/lib/repositories/storage.repository.ts
import { getSupabaseAdmin } from '@/lib/config/supabase';

export async function createSignedUploadUrl(filePath: string) {
  return getSupabaseAdmin().storage.from('documents').createSignedUploadUrl(filePath);
}

export async function uploadFile(filePath: string, buffer: Buffer, contentType: string) {
  const { error } = await getSupabaseAdmin().storage
    .from('documents')
    .upload(filePath, buffer, { contentType, upsert: false });
  return { error };
}

export async function downloadFile(filePath: string) {
  const { data, error } = await getSupabaseAdmin().storage.from('documents').download(filePath);
  return { data, error };
}

export async function deleteFile(filePath: string) {
  const { error } = await getSupabaseAdmin().storage.from('documents').remove([filePath]);
  return { error };
}

// Returns the public URL for a stored file
export function getPublicUrl(filePath: string) {
  const { data } = getSupabaseAdmin().storage.from('documents').getPublicUrl(filePath);
  return data?.publicUrl;
}
