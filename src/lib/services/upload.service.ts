import { downloadFile, getPublicUrl } from '@/lib/repositories/storage.repository';
import { insertChunk } from '@/lib/repositories/document.repository';
import { extractTextFromBuffer } from '@/lib/utils/file-parser';
import { generateEmbedding } from '@/lib/utils/embedding';
import { AppError } from '@/lib/api/errors';
import {
  mapProcessStepPercent,
  processStepLabel,
  type ProcessStep,
} from '@/lib/utils/upload-progress';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import type { DocumentMetadata, UploadResult } from '@/lib/types';

export type ProcessProgressCallback = (update: {
  step: ProcessStep;
  percent: number;
  message: string;
  chunk?: number;
  totalChunks?: number;
}) => void;

export interface ProcessUploadInput {
  documentId: string;
  filePath: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

function emitProgress(
  onProgress: ProcessProgressCallback | undefined,
  step: ProcessStep,
  chunk = 0,
  totalChunks = 1
) {
  onProgress?.({
    step,
    percent: mapProcessStepPercent(step, chunk, totalChunks),
    message: processStepLabel(step, chunk, totalChunks),
    chunk: step === 'embedding' ? chunk + 1 : undefined,
    totalChunks: step === 'embedding' ? totalChunks : undefined,
  });
}

export default async function processUploadedDocument(
  input: ProcessUploadInput,
  onProgress?: ProcessProgressCallback
): Promise<UploadResult> {
  const { documentId, filePath, fileName, fileType, fileSize } = input;
  const uploadDate = new Date().toISOString();

  emitProgress(onProgress, 'download');
  const { data: fileData, error: downloadError } = await downloadFile(filePath);
  if (downloadError || !fileData) {
    throw new AppError('STORAGE_ERROR', downloadError?.message || 'File not found in storage', 500);
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());
  const fileUrl = getPublicUrl(filePath);

  emitProgress(onProgress, 'extract');
  const text = await extractTextFromBuffer(buffer, fileName);
  if (!text || text.trim().length === 0) {
    throw new AppError('PARSE_ERROR', 'Could not extract text from file', 422);
  }

  emitProgress(onProgress, 'split');
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 800, chunkOverlap: 100 });
  const chunks = await splitter.splitText(text);

  for (let i = 0; i < chunks.length; i++) {
    emitProgress(onProgress, 'embedding', i, chunks.length);
    const embedding = await generateEmbedding(chunks[i]);
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
    const { error } = await insertChunk(chunks[i], metadata, embedding);
    if (error) throw new AppError('DB_ERROR', error.message, 500);
  }

  emitProgress(onProgress, 'done', chunks.length - 1, chunks.length);

  return {
    documentId,
    fileName,
    fileUrl: fileUrl || '',
    chunksInserted: chunks.length,
    textLength: text.length,
  };
}
