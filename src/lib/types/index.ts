export interface DocumentMetadata {
  /** Canonical document identifier (UUID). Legacy rows may only have document_id — resolved by the repository layer. */
  id: string;
  document_id?: string;
  file_name: string;
  file_type: string;
  file_size: number;
  upload_date: string;
  total_chunks: number;
  file_url?: string;
  file_path?: string;
}

export type Document = DocumentMetadata;

export interface SearchResult {
  answer: string;
  sources: DocumentMetadata[];
}

export interface UploadResult {
  documentId: string;
  fileName: string;
  fileUrl: string;
  chunksInserted: number;
  textLength: number;
}
