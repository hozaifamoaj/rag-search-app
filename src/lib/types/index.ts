// src/lib/types/index.ts
export interface DocumentMetadata {
  id?: string;
  document_id?: string;
  file_name: string;
  file_type: string;
  file_size: number;
  upload_date: string;
  total_chunks: number;
  file_url?: string;
  file_path?: string;
}

export interface DocumentSummary extends DocumentMetadata {}

export interface SearchResult {
  answer: string;
  sources: DocumentMetadata[];
}

export interface UploadResult {
  document: DocumentMetadata;
  chunksInserted: number;
}

// Re-export Document type used in UI
export type Document = DocumentMetadata;
