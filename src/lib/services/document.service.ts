// src/lib/services/document.service.ts
import { listAllDocuments, deleteByDocumentId, getChunksByDocumentId } from '@/lib/repositories/document.repository';
import { DocumentMetadata } from '@/lib/types';

export interface DocumentSummary extends DocumentMetadata {}

/** Resolve document id from metadata (handles legacy rows missing metadata.id) */
function isValidId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value !== 'undefined' &&
    value !== 'null'
  );
}

function resolveDocumentId(meta: Record<string, unknown>): string | undefined {
  const direct = meta.id ?? meta.document_id ?? meta.documentId;
  if (typeof direct === 'number' && !Number.isNaN(direct)) return String(direct);
  if (isValidId(direct)) return direct;

  const filePath = meta.file_path;
  if (typeof filePath === 'string' && filePath) {
    const base = filePath.split('/').pop()?.split('.')[0];
    if (isValidId(base)) return base;
    if (isValidId(filePath)) return filePath;
  }
  return undefined;
}

function parseMetadata(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  return null;
}

/** List distinct document summaries */
export async function listDocuments(): Promise<DocumentSummary[]> {
  const { data, error } = await listAllDocuments();
  if (error) throw new Error(error.message);

  const docsMap = new Map<string, DocumentSummary>();
  data?.forEach((row: any) => {
    const parsed = parseMetadata(row.metadata);
    if (!parsed) return;

    const id = resolveDocumentId(parsed);
    if (!id || docsMap.has(id)) return;

    docsMap.set(id, { ...(parsed as unknown as DocumentMetadata), id });
  });
  return Array.from(docsMap.values());
}

/** Get full document (concatenated chunks and metadata) */
export async function getDocument(id: string): Promise<{ metadata: DocumentMetadata; fullText: string }> {
  const { data, error } = await getChunksByDocumentId(id);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('Document not found');
  const chunks = data as any[];
  const rawMeta = chunks[0].metadata as DocumentMetadata;
  const resolvedId = resolveDocumentId(rawMeta as unknown as Record<string, unknown>) ?? id;
  const metadata: DocumentMetadata = { ...rawMeta, id: resolvedId };
  const fullText = chunks.map((c) => c.content).join('\n\n');
  return { metadata, fullText };
}

/** Delete document and its storage file */
export async function deleteDocument(id: string, deleteFileCallback: (filePath: string) => Promise<void>): Promise<void> {
  // Get metadata to know file path
  const { data, error } = await getChunksByDocumentId(id);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('Document not found');
  const filePath = (data[0] as any).metadata?.file_path;
  if (filePath) {
    await deleteFileCallback(filePath);
  }
  const { error: delErr } = await deleteByDocumentId(id);
  if (delErr) throw new Error(delErr.message);
}
