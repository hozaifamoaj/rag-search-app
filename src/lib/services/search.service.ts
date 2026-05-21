// src/lib/services/search.service.ts
import groq from '@/lib/config/groq';
import { generateEmbedding } from '@/lib/utils/embedding';
import { matchDocuments } from '@/lib/repositories/document.repository';

export interface SearchResult {
  answer: string;
  sources: any[];
}

export async function search(query: string): Promise<SearchResult> {
  // 1. Generate embedding for the query
  const embedding = await generateEmbedding(query);

  // 2. Retrieve similar chunks
  const { data: results, error } = await matchDocuments(embedding, 0.0, 5);
  if (error) {
    throw new Error(error.message);
  }

  // 3. Build context string
  const context = results?.map((r: any) => r.content).join('\n---\n') ?? '';

  // 4. Call Groq LLM with context
  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant. Use the provided context to answer questions. If the answer is not in the context, say you do not know.'
      },
      {
        role: 'user',
        content: `Context: ${context}\n\nQuestion: ${query}`
      }
    ]
  });

  return {
    answer: completion.choices[0].message.content ?? '',
    sources: results ?? []
  };
}
