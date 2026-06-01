# RAG Search App

A Retrieval-Augmented Generation (RAG) search application built with Next.js. Upload documents and ask questions — the app finds the most relevant passages and generates an answer using an LLM.

## Features

- Upload documents (PDF and more) via a progress-tracked upload flow
- Semantic search powered by vector embeddings
- AI-generated answers with cited sources
- Dark mode support

## Tech Stack

- **Framework:** Next.js (App Router)
- **Database & Storage:** Supabase
- **Embeddings:** `@xenova/transformers` (local inference)
- **LLM:** Groq
- **Language:** TypeScript

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.local.example` to `.env.local` and fill in your Supabase and Groq credentials.

3. Run the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Go to **Documents** and upload your files.
2. Return to the home page, type a question, and press **Search** (or `Cmd/Ctrl + Enter`).
3. The app returns an AI-generated answer along with the source passages it used.
