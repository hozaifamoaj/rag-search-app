import {deleteByDocumentId, getChunksByDocumentId, listAllDocuments} from '@/lib/repositories/document.repository';
import {AppError} from '@/lib/api/errors';
import type {DocumentMetadata} from '@/lib/types';

function isValidId(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0 && value !== 'undefined' && value !== 'null';
}

export function resolveDocumentId(meta: Record<string, unknown>): string | undefined {
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

export async function listDocuments(): Promise<DocumentMetadata[]> {
    const {data, error} = await listAllDocuments();
    if (error) throw new AppError('DB_ERROR', error.message, 500);

    const docsMap = new Map<string, DocumentMetadata>();
    data?.forEach((row: { metadata: unknown }) => {
        const parsed = parseMetadata(row.metadata);
        if (!parsed) return;
        const id = resolveDocumentId(parsed);
        if (!id || docsMap.has(id)) return;
        docsMap.set(id, {...(parsed as unknown as DocumentMetadata), id});
    });
    return Array.from(docsMap.values());
}

export async function getDocument(id: string): Promise<{ metadata: DocumentMetadata; fullText: string }> {
    const {data, error} = await getChunksByDocumentId(id);
    if (error) throw new AppError('DB_ERROR', error.message, 500);
    if (!data || data.length === 0) throw new AppError('NOT_FOUND', 'Document not found', 404);

    const chunks = data as Array<{ content: string; metadata: DocumentMetadata }>;
    const rawMeta = chunks[0].metadata;
    const resolvedId = resolveDocumentId(rawMeta as unknown as Record<string, unknown>) ?? id;
    const metadata: DocumentMetadata = {...rawMeta, id: resolvedId};
    const fullText = chunks.map((c) => c.content).join('\n\n');
    return {metadata, fullText};
}

export async function deleteDocument(
    id: string,
    deleteFileCallback: (filePath: string) => Promise<void>
): Promise<void> {
    const {data, error} = await getChunksByDocumentId(id);
    if (error) throw new AppError('DB_ERROR', error.message, 500);
    if (!data || data.length === 0) throw new AppError('NOT_FOUND', 'Document not found', 404);

    const filePath = (data[0] as { metadata: { file_path?: string } }).metadata?.file_path;
    if (filePath) await deleteFileCallback(filePath);

    const {error: delErr} = await deleteByDocumentId(id);
    if (delErr) throw new AppError('DB_ERROR', delErr.message, 500);
}
