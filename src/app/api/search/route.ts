import { search } from '@/lib/services/search.service';
import { SearchInputSchema } from '@/lib/validators/search';
import { ok, fail, handleError } from '@/lib/api/response';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = SearchInputSchema.safeParse(body);
    if (!parsed.success) {
      return fail('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
    }

    const result = await search(parsed.data.query);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
