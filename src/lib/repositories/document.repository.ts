// src/lib/repositories/document.repository.ts
import { supabaseAdmin } from '@/lib/config/supabase';
import { DocumentMetadata } from '@/lib/types';

export async function matchDocuments(embedding: number[], threshold: number, count: number) {
  const { data, error } = await supabaseAdmin.rpc('match_documents', {
    query_embedding: JSON.stringify(embedding),
    match_threshold: threshold,
    match_count: count,
  });
  return { data, error };
}

export async function insertChunk(content: string, metadata: DocumentMetadata, embedding: number[]) {
  const { error } = await supabaseAdmin.from('documents').insert({
    content,
    metadata,
    embedding: JSON.stringify(embedding),
  });
  return { error };
}

/** Match chunks by any common metadata id field or file_path (uuid or uuid.ext) */
function documentIdOrFilter(documentId: string) {
  const escaped = documentId.replace(/,/g, '');
  return [
    `metadata->>id.eq.${escaped}`,
    `metadata->>document_id.eq.${escaped}`,
    `metadata->>documentId.eq.${escaped}`,
    `metadata->>file_path.eq.${escaped}`,
    `metadata->>file_path.ilike.${escaped}.%`,
  ].join(',');
}

export async function getChunksByDocumentId(documentId: string) {
  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('*')
    .or(documentIdOrFilter(documentId));
  return { data, error };
}

export async function listAllDocuments() {
  const { data, error } = await supabaseAdmin.from('documents').select('metadata');
  return { data, error };
}

export async function deleteByDocumentId(documentId: string) {
  const { error } = await supabaseAdmin.from('documents').delete().or(documentIdOrFilter(documentId));
  return { error };
}
