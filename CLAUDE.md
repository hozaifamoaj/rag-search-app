# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
```

No test suite is configured.

## Environment Variables

Create `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
HUGGINGFACE_API_KEY=
GROQ_API_KEY=
```

`getSupabaseAdmin()` (server-only) uses `SUPABASE_SERVICE_ROLE_KEY` and bypasses RLS — never expose it to the client. The browser client in `src/lib/config/supabase-browser.ts` uses the public anon key.

## Architecture

This is a RAG (Retrieval-Augmented Generation) app: users upload documents, which are chunked and embedded, then answered against via vector similarity search.

### Upload pipeline (three-step, browser → Supabase direct)

1. **Prepare** — `POST /api/upload/prepare` generates a signed Supabase Storage URL and a `documentId` (UUID). The browser uploads the file directly to Supabase (bypassing Vercel's 4.5 MB request limit).
2. **Process (streaming)** — `POST /api/upload/stream` downloads the file from Supabase Storage, extracts text (`pdf2json` / `mammoth` / plain UTF-8), splits into 800-char chunks with 100-char overlap (`@langchain/textsplitters`), generates a HuggingFace embedding per chunk, and inserts each chunk into the Supabase `documents` table. Progress is streamed as SSE.
3. A non-streaming fallback exists at `POST /api/upload` for non-SSE contexts.

The browser-side flow lives in `UploadModal.tsx`, which calls `uploadToSignedUrlWithProgress` then `consumeUploadProcessStream`.

### Search pipeline

`POST /api/search` → `search.service.ts`:
1. Embeds the query via HuggingFace (`sentence-transformers/all-MiniLM-L6-v2`, 384-dim).
2. Calls the Supabase `match_documents` RPC (pgvector similarity, threshold `0.0`, top 5).
3. Passes retrieved chunks as context to Groq (`llama-3.1-8b-instant`) and returns the answer + source chunks.

### Layer conventions

| Layer | Path | Responsibility |
|---|---|---|
| API routes | `src/app/api/*/route.ts` | HTTP handling only — delegate to services |
| Services | `src/lib/services/` | Business logic, orchestration |
| Repositories | `src/lib/repositories/` | All Supabase queries |
| Utils | `src/lib/utils/` | Pure helpers (parsing, progress math, upload) |
| Config | `src/lib/config/` | Singleton clients (Groq, Supabase) |

### HuggingFace embedding quirks

`src/lib/utils/embedding.ts` retries up to 3× with exponential backoff to handle cold-start 503s from the Inference API. The API returns `[[...embedding]]` for single-string input — the code normalizes this to a flat array.

### Document identity

Documents lack a dedicated table; they are reconstructed from chunk `metadata` stored as JSONB. `document.service.ts` handles legacy rows where the id may live under `metadata.id`, `metadata.document_id`, `metadata.documentId`, or be derivable from `metadata.file_path`. The `documentIdOrFilter` helper in `document.repository.ts` builds the multi-field OR filter for all lookups.
