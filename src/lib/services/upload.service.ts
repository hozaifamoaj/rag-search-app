// src/lib/services/upload.service.ts
import { downloadFile, getPublicUrl } from '@/lib/repositories/storage.repository';
import { insertChunk } from '@/lib/repositories/document.repository';
import { extractTextFromBuffer } from '@/lib/utils/file-parser';
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

export interface ProcessUploadInput {
  documentId: string;
  filePath: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

/** Process a file already stored in Supabase (avoids large API request bodies on Vercel). */
export default async function processUploadedDocument(
  input: ProcessUploadInput
): Promise<UploadResult> {
  const { documentId, filePath, fileName, fileType, fileSize } = input;
  const uploadDate = new Date().toISOString();

  const { data: fileData, error: downloadError } = await downloadFile(filePath);
  if (downloadError || !fileData) {
    throw new Error(downloadError?.message || 'File not found in storage');
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());
  const fileUrl = getPublicUrl(filePath);

  const text = await extractTextFromBuffer(buffer, fileName);
  if (!text || text.trim().length === 0) {
    throw new Error('Could not extract text from file');
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 800,
    chunkOverlap: 100,
  });
  const chunks = await splitter.splitText(text);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await generateEmbedding(chunk);
    const metadata: DocumentMetadata = {
      id: documentId,
      document_id: documentId,
      file_name: fileName,
      file_type: fileType || fileName.split('.').pop() || 'unknown',
      file_size: fileSize,
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
    fileName,
    fileUrl: fileUrl || '',
    chunksInserted: chunks.length,
    textLength: text.length,
  };
}
