import { z } from 'zod';

export const SearchInputSchema = z.object({
  query: z.string().min(1, 'Query is required').max(2000, 'Query must be under 2000 characters').trim(),
});

export type SearchInput = z.infer<typeof SearchInputSchema>;
