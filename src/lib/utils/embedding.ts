const HF_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
const HF_API_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) throw new Error('HUGGINGFACE_API_KEY is not set');

  // Retry up to 3 times to handle cold-start 503s
  for (let attempt = 1; attempt <= 3; attempt++) {
    let res: Response;
    try {
      res = await fetch(HF_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt === 3) throw new Error(`HuggingFace fetch failed: ${msg}`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
      continue;
    }

    if (res.status === 503) {
      // Model still loading — wait and retry
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 5000 * attempt));
        continue;
      }
      throw new Error('HuggingFace model timed out warming up. Please retry.');
    }

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      throw new Error(`HuggingFace embedding failed (${res.status}): ${err}`);
    }

    const data = await res.json();
    // API returns [[...embedding]] for a single string input
    return Array.isArray(data[0]) ? data[0] : data;
  }

  throw new Error('HuggingFace embedding failed after retries');
}
