// src/lib/services/upload.service.ts
import { uploadFile, getPublicUrl } from '@/lib/repositories/storage.repository';
import { insertChunk } from '@/lib/repositories/document.repository';
import { extractTextFromFile } from '@/lib/utils/file-parser';
import { generateEmbedding } from '@/lib/utils/embedding';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { DocumentMetadata } from '@/lib/types';

export interface UploadResult {
  documentId: string;
  fileName: string;
  fileUrl: string;
  chunksInserted: number;
  textLength: number;
}

export default async function uploadDocument(file: File): Promise<UploadResult> {
  const documentId = crypto.randomUUID();
  const uploadDate = new Date().toISOString();
  const filePath = `${documentId}.${file.name.split('.').pop() || 'bin'}`;

  // 1. Upload to Supabase Storage
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: storageError } = await uploadFile(filePath, buffer, file.type || 'application/octet-stream');
  if (storageError) {
    const msg = storageError.message || 'Unknown storage error';
    throw new Error(msg);
  }

  // 2. Get public URL
  const fileUrl = getPublicUrl(filePath);

  // 3. Extract text
  const text = await extractTextFromFile(file);
  if (!text || text.trim().length === 0) {
    throw new Error('Could not extract text from file');
  }

  // 4. Chunk the text
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 800,
    chunkOverlap: 100,
  });
  const chunks = await splitter.splitText(text);

  // 5. Process each chunk
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await generateEmbedding(chunk);
    const metadata: DocumentMetadata = {
      id: documentId,
      document_id: documentId,
      file_name: file.name,
      file_type: file.type || file.name.split('.').pop() || 'unknown',
      file_size: file.size,
      upload_date: uploadDate,
      total_chunks: chunks.length,
      file_url: fileUrl,
      file_path: filePath,
    };
    const { error } = await insertChunk(chunk, metadata, embedding);
    if (error) {
      throw new Error(error.message);
    }
  }

  return {
    documentId,
    fileName: file.name,
    fileUrl,
    chunksInserted: chunks.length,
    textLength: text.length,
  };
}
