import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

/** Browser-only Supabase client (public anon key). Use for direct storage uploads from the client. */
export function getSupabaseBrowser(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  if (!key) throw new Error('Supabase anon key is not set; provide NEXT_PUBLIC_SUPABASE_ANON_KEY');

  browserClient = createClient(url, key);
  return browserClient;
}
