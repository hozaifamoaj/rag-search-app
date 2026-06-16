import { z } from 'zod';

export const PrepareInputSchema = z.object({
  fileName: z.string().min(1, 'fileName is required').max(255),
});

export const ProcessInputSchema = z.object({
  documentId: z.string().uuid('documentId must be a valid UUID'),
  filePath: z.string().min(1, 'filePath is required'),
  fileName: z.string().min(1, 'fileName is required').max(255),
  fileType: z.string().default(''),
  fileSize: z.number().nonnegative().default(0),
});

export type PrepareInput = z.infer<typeof PrepareInputSchema>;
export type ProcessInput = z.infer<typeof ProcessInputSchema>;
