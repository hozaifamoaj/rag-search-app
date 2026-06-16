import groq from '@/lib/config/groq';
import { generateEmbedding } from '@/lib/utils/embedding';
import { matchDocuments } from '@/lib/repositories/document.repository';
import { AppError } from '@/lib/api/errors';
import type { SearchResult } from '@/lib/types';

export async function search(query: string): Promise<SearchResult> {
  const embedding = await generateEmbedding(query);

  const { data: results, error } = await matchDocuments(embedding, 0.0, 5);
  if (error) throw new AppError('DB_ERROR', error.message, 500);

  const context = results?.map((r: { content: string }) => r.content).join('\n---\n') ?? '';

  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      {
        role: 'system',
        content:
          'You are a helpful assistant. Use the provided context to answer questions. If the answer is not in the context, say you do not know.',
      },
      {
        role: 'user',
        content: `Context: ${context}\n\nQuestion: ${query}`,
      },
    ],
  });

  return {
    answer: completion.choices[0].message.content ?? '',
    sources: results ?? [],
  };
}
