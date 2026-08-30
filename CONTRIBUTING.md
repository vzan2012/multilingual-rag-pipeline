# Contributing to multilingual-rag-pipeline

Thanks for considering a contribution. This is a small project, so the process is intentionally lightweight.

## Getting set up

Follow the [Getting Started](README.md#getting-started) section in the README - it covers cloning, installing dependencies, environment variables, Prisma, and starting ChromaDB (with or without Docker).

## Before you open a PR

This project uses **Bun**, not npm/node. Make sure everything still works:

```bash
bun install
docker-compose up -d          # ChromaDB must be running for anything that embeds/searches
bun run index.ts              # confirm the REST API starts cleanly
```

There's no test framework configured (`bun test`, vitest, jest, etc.) - `tests/*.ts` are standalone smoke-test scripts, run individually:

```bash
bun run tests/ping-test.ts
bun run tests/chroma-test.ts
bun run tests/document-loader-test.ts
bun run tests/chunking-test.ts
bun run tests/embedding-test.ts
bun run tests/rag-pipeline-test.ts
```

If you touch `RAGPipeline`, `VectorStoreService`, `EmbeddingService`, or the REST API in `src/api/server.ts`, run `rag-pipeline-test.ts` and manually exercise the relevant endpoint(s) with `curl` before opening a PR - there's no CI gate catching this yet, so it's on the contributor.

## Code style

- Match the existing style: arrow-function class methods, JSDoc-style comments on public methods, no unnecessary abstraction.
- Keep new files named consistently with what's already there - service classes are `PascalCase.ts` (`EmbeddingService.ts`, `GroqService.ts`), not `camelCase.ts`. A prior casing mismatch (`embeddingService.ts` vs `EmbeddingService.ts`) broke on case-sensitive filesystems, so this isn't just a style nitpick.
- New shared types go under `src/types/`, following the pattern of the existing files there (see `CLAUDE.md` - not everything is re-exported from `src/types/index.ts`, so check whether your new type needs a direct import elsewhere).

## Docs

If your change affects the pipeline's architecture, the REST API, or how to run the project, update `README.md` and `CLAUDE.md` in the same PR - both are kept intentionally current rather than left to drift.

## Reporting issues

Open a GitHub issue with what you expected, what actually happened, and the exact command/request that triggered it. Given this project touches a local ML model, a database container, and an external LLM API, please include which of those three was actually running at the time.