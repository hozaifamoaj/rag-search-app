// src/lib/repositories/storage.repository.ts
import { supabaseAdmin } from '@/lib/config/supabase';

export async function uploadFile(filePath: string, buffer: Buffer, contentType: string) {
  const { error } = await supabaseAdmin.storage
    .from('documents')
    .upload(filePath, buffer, { contentType, upsert: false });
  return { error };
}

export async function downloadFile(filePath: string) {
  const { data, error } = await supabaseAdmin.storage.from('documents').download(filePath);
  return { data, error };
}

export async function deleteFile(filePath: string) {
  const { error } = await supabaseAdmin.storage.from('documents').remove([filePath]);
  return { error };
}

// Returns the public URL for a stored file
export function getPublicUrl(filePath: string) {
  const { data } = supabaseAdmin.storage.from('documents').getPublicUrl(filePath);
  return data?.publicUrl;
}
