# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

This project uses **Bun** (not npm/node) as the runtime and package manager. There are no `scripts` defined in package.json — everything is invoked directly.

```bash
# Install dependencies
bun install

# Run the entrypoint
bun run index.ts

# Start ChromaDB (required before anything that embeds/searches vectors)
docker-compose up -d          # exposes ChromaDB on localhost:8000, persists to ./chroma-data

# Prisma (schema at prisma/schema.prisma, sqlite db at seed/dev.db via DATABASE_URL in .env)
bunx prisma generate           # outputs client to ./generated/prisma (gitignored)
bunx prisma migrate dev
```

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

This is a local, in-process multilingual RAG (Retrieval-Augmented Generation) indexing/query pipeline. There is no HTTP server or API layer yet — `index.ts` is still the unmodified `bun init` placeholder and is not wired to the pipeline.

See the Mermaid diagram in [README.md](README.md) for a visual of the flow described below.

### Pipeline data flow

`RAGPipeline` (`src/pipeline/RAGPipeline.ts`) orchestrates four stages, each a separate service class:

1. **`DocumentLoader`** (`src/loaders/DocumentLoader.ts`) — reads `.txt`/`.pdf`/`.docx` files (`pdf-parse`, `mammoth`) into raw text + `DocumentMetadata` (filename, fileType, wordCount, pageCount).
2. **`TextChunker`** (`src/loaders/TextChunker.ts`) — splits text into overlapping chunks: sentence-boundary splitting (regex-based, falls back to paragraph splitting), packs sentences up to `chunkSize`, and carries a trailing `chunkOverlap` window of text into the next chunk.
3. **`EmbeddingService`** (`src/embeddings/EmbeddingService.ts`) — generates embeddings **locally in-process** via `@xenova/transformers` (default model `Xenova/paraphrase-multilingual-MiniLM-L12-v2`), no external API call. Lazily/async-initializes the pipeline on construction unless `autoInitialize: false`; batches requests (`embedBatch`) at `batchSize` (default 32).
4. **`VectorStoreService`** (`src/vectorstore/VectorStoreService.ts`) — wraps a `ChromaClient` connection to the ChromaDB container, batches `addChunks` at 100 items/batch, and exposes `search`/`getStats`/`deleteCollection`. Must call `initialize()` before use (get-or-create the named collection).

`RAGPipeline.indexDocument` chains load → chunk → `embedBatch` → `addChunks`. `RAGPipeline.query` embeds the query text, calls `VectorStoreService.search`, and reshapes Chroma's parallel-array result format (`ids`/`documents`/`metadatas`/`distances`) into `SearchResult[]` (score = `1 - distance`).

### Two separate, currently disconnected persistence layers

- **ChromaDB** (via `chromadb` client, `docker-compose.yml`) is the actual vector store used by `VectorStoreService` — the only persistence the pipeline touches today.
- **Prisma/SQLite** (`prisma/schema.prisma`, `Document`/`DocumentChunk` models, `seed/dev.db`) defines a relational schema clearly intended to track document/chunk metadata, but no code currently imports `@prisma/client` or calls it — it's unused by the pipeline as it stands. Don't assume document metadata is persisted anywhere relational unless you wire this up yourself.

### Types

All shared types live under `src/types/*.ts`. `src/types/index.ts` only re-exports `Search`, `Document`, and `ChromaDB` — `ChunkingOptions`, `EmbeddingOptions`, `VectorStore`, and `RAGPipeline` (config) types are **not** re-exported and must be imported from their individual files directly (see how `RAGPipeline.ts` and `TextChunker.ts` import them).
