import { z } from 'zod';

export const DocumentIdSchema = z.object({
  id: z
    .string()
    .min(1)
    .refine((v) => v !== 'undefined' && v !== 'null', { message: 'Invalid document ID' }),
});

export type DocumentIdInput = z.infer<typeof DocumentIdSchema>;
