// src/lib/config/supabase.ts
import { createClient } from "@supabase/supabase-js";

// Validate required environment variables. Use fallback for anon key.
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set in environment variables");
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY) {
  throw new Error("Supabase anon key is not set; provide NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set in environment variables");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Browser / public reads only — subject to RLS */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** Server-side API routes — bypasses RLS; never expose to the client */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
