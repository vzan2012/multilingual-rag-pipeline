# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

This project uses **Bun** (not npm/node) as the runtime and package manager. There are no `scripts` defined in package.json — everything is invoked directly.

```bash
# Install dependencies
bun install

# Start ChromaDB (required before anything that embeds/searches vectors)
docker-compose up -d          # exposes ChromaDB on localhost:8000, persists to ./chroma-data

# Start the REST API (Elysia) - GET /health, POST /documents, POST /query
bun run index.ts              # listens on PORT (default 3000)

# Prisma (schema at prisma/schema.prisma, sqlite db at seed/dev.db via DATABASE_URL in .env)
bunx prisma generate           # outputs client to ./generated/prisma (gitignored)
bunx prisma migrate dev
```

Environment variables are documented in `.env.sample` — copy it to `.env` before running. Only `DATABASE_URL` is required out of the box; `GROQ_API_KEY` is optional (get a free key at console.groq.com) — without it, `POST /query` still returns retrieved chunks, just with `answer: null` instead of a generated answer.

### Running a single test

There is no test framework (`bun test`, vitest, jest, etc.) configured. `tests/*.ts` are standalone smoke-test scripts that log their own output and throw/console.error on failure — there are no assertions to check against. Run one directly with Bun:

```bash
bun run tests/ping-test.ts             # checks ChromaDB heartbeat at localhost:8000
bun run tests/chroma-test.ts           # create/query/delete a Chroma collection end-to-end
bun run tests/document-loader-test.ts  # DocumentLoader against a generated sample.txt
bun run tests/chunking-test.ts         # TextChunker against a generated sample.txt
bun run tests/embedding-test.ts        # EmbeddingService: single + multilingual batch embedding
```

`ping-test.ts` and `chroma-test.ts` require the ChromaDB container from `docker-compose.yml` to be running. `embedding-test.ts` downloads/loads the transformer model on first run and can be slow.

**Known gotcha:** `tests/embedding-test.ts` imports from `../src/embeddings/embeddingService` (lowercase), but the actual file is `src/embeddings/EmbeddingService.ts`. This only resolves on case-insensitive filesystems (Windows/macOS default) — it will fail on a case-sensitive filesystem (Linux, most CI).

## Architecture

This is a local, in-process multilingual RAG (Retrieval-Augmented Generation) indexing/query pipeline, exposed over HTTP by an Elysia REST API (`index.ts` → `src/api/server.ts`).

See the Mermaid diagram in [README.md](README.md) for a visual of the flow described below.

### Pipeline data flow

`RAGPipeline` (`src/pipeline/RAGPipeline.ts`) orchestrates the following, each a separate service class:

1. **`DocumentLoader`** (`src/loaders/DocumentLoader.ts`) — reads `.txt`/`.pdf`/`.docx` files (`pdf-parse`, `mammoth`) into raw text + `DocumentMetadata` (filename, fileType, wordCount, pageCount).
2. **`TextChunker`** (`src/loaders/TextChunker.ts`) — splits text into overlapping chunks: sentence-boundary splitting (regex-based, falls back to paragraph splitting), packs sentences up to `chunkSize`, and carries a trailing `chunkOverlap` window of text into the next chunk.
3. **`EmbeddingService`** (`src/embeddings/EmbeddingService.ts`) — generates embeddings **locally in-process** via `@xenova/transformers` (default model `Xenova/paraphrase-multilingual-MiniLM-L12-v2`), no external API call. Lazily/async-initializes the pipeline on construction unless `autoInitialize: false`; batches requests (`embedBatch`) at `batchSize` (default 32).
4. **`VectorStoreService`** (`src/vectorstore/VectorStoreService.ts`) — wraps a `ChromaClient` connection to the ChromaDB container, batches `addChunks` at 100 items/batch, and exposes `search`/`getStats`/`deleteCollection`. Must call `initialize()` before use (get-or-create the named collection).
5. **`GroqService`** (`src/llm/GroqService.ts`) — optional; a `fetch`-based client for GroqCloud's OpenAI-compatible chat completion API (no SDK dependency added). Reads `GROQ_API_KEY`/`GROQ_MODEL` from env, defaults to `openai/gpt-oss-120b`. Model lineup shifts over time and access varies per key — hit `https://api.groq.com/openai/v1/models` with your key to see what's actually available before assuming a model ID still works.

`RAGPipeline.indexDocument` chains load → chunk → `embedBatch` → `addChunks`. `RAGPipeline.query` embeds the query text, calls `VectorStoreService.search`, and reshapes Chroma's parallel-array result format (`ids`/`documents`/`metadatas`/`distances`) into `SearchResult[]` (score = `1 - distance`). `RAGPipeline.queryWithAnswer` composes `query()` with `GroqService.generateAnswer()` to produce a natural-language answer grounded in the retrieved chunks; it throws if the pipeline was constructed without a `GroqService` (an optional 4th constructor arg, appended after `config` so existing 3-arg call sites are unaffected).

### REST API

`src/api/server.ts` exports `createServer()`, an async factory (async because the embedding model and Chroma connection must be ready before any request is handled). `index.ts` calls it and starts listening — this is what actually runs when you `bun run index.ts`.

- `GET /health` — pipeline stats plus whether answer generation is available.
- `POST /documents` — JSON body `{ filePath, language? }`, indexes a file that **already exists on the server's filesystem**. It does not accept file bytes — there's no upload here, just a path reference.
- `POST /documents/upload` — actual file upload: multipart form-data with a `file` field (`t.File()`) and optional `language`. Saves the upload to `uploads/<timestamp>-<original-filename>` (gitignored; `Bun.write` creates the directory if missing) before indexing it the same way as `/documents`.
- `POST /query` — body `{ query, topK? }`. If no `GroqService` was constructed (missing `GROQ_API_KEY`), falls back to plain `query()` and returns `{ answer: null, sources, queryTime }` instead of erroring.

### Two separate, currently disconnected persistence layers

- **ChromaDB** (via `chromadb` client, `docker-compose.yml`) is the actual vector store used by `VectorStoreService` — the only persistence the pipeline touches today.
- **Prisma/SQLite** (`prisma/schema.prisma`, `Document`/`DocumentChunk` models, `seed/dev.db`) defines a relational schema clearly intended to track document/chunk metadata, but no code currently imports `@prisma/client` or calls it — it's unused by the pipeline as it stands. Don't assume document metadata is persisted anywhere relational unless you wire this up yourself.

### Types

All shared types live under `src/types/*.ts`. `src/types/index.ts` only re-exports `Search`, `Document`, and `ChromaDB` — `ChunkingOptions`, `EmbeddingOptions`, `VectorStore`, `RAGPipeline` (config), and `Groq` types are **not** re-exported and must be imported from their individual files directly (see how `RAGPipeline.ts` and `TextChunker.ts` import them).

### Known gotchas

- `tests/embedding-test.ts` previously imported `../src/embeddings/embeddingService` (lowercase) instead of `EmbeddingService.ts` — this has been fixed, but watch for the same casing trap if new files reference it.
- `VectorStoreService` always passes an explicit `embeddingFunction` stub to `getCollection`/`createCollection` — don't remove it. Without it, the `chromadb` client tries to instantiate Chroma's `DefaultEmbeddingFunction` (which needs the optional `@chroma-core/default-embed` package) even though this service always supplies embeddings itself via `EmbeddingService`. It's a `generate()` that throws if ever actually called, since it never should be.
