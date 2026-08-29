# multilingual-rag-pipeline

A local, in-process multilingual RAG (Retrieval-Augmented Generation) indexing/query pipeline. Documents are loaded, chunked, embedded (locally, via `@xenova/transformers`), and stored in ChromaDB for semantic search.

## Architecture

```mermaid
flowchart TB
    subgraph Indexing["Indexing: RAGPipeline.indexDocument"]
        A["Document file<br/>.txt / .pdf / .docx"] --> B["DocumentLoader<br/>src/loaders/DocumentLoader.ts"]
        B -->|"raw text + metadata"| C["TextChunker<br/>src/loaders/TextChunker.ts"]
    end

    subgraph Querying["Querying: RAGPipeline.query"]
        Q["User query string"]
    end

    C -->|"DocumentChunk array<br/>sentence-aware, overlapping"| D
    Q --> D["EmbeddingService<br/>src/embeddings/EmbeddingService.ts<br/>Xenova/paraphrase-multilingual-MiniLM-L12-v2"]

    D -->|"embeddings, local in-process"| E["VectorStoreService<br/>src/vectorstore/VectorStoreService.ts"]
    E <-->|"addChunks / search"| F[("ChromaDB<br/>localhost:8000, docker-compose")]
    F -->|"ids, documents,<br/>metadatas, distances"| G["SearchResult array<br/>score = 1 - distance"]

    P["Prisma / SQLite<br/>prisma/schema.prisma<br/>Document, DocumentChunk"]

    class A,Q input
    class B loader
    class C chunker
    class D embed
    class E store
    class F chroma
    class G result
    class P unused

    classDef input fill:#1e293b,stroke:#94a3b8,color:#e2e8f0
    classDef loader fill:#7c2d12,stroke:#fb923c,color:#fed7aa
    classDef chunker fill:#7c2d12,stroke:#f97316,color:#fed7aa
    classDef embed fill:#4c1d95,stroke:#a78bfa,color:#ede9fe
    classDef store fill:#134e4a,stroke:#2dd4bf,color:#ccfbf1
    classDef chroma fill:#134e4a,stroke:#5eead4,color:#f0fdfa
    classDef result fill:#1e3a8a,stroke:#60a5fa,color:#dbeafe
    classDef unused fill:#3f1d2b,stroke:#e879a3,color:#fbcfe8,stroke-dasharray: 4 4
```

> **Note:** the Prisma/SQLite schema (`Document`/`DocumentChunk`) exists but isn't wired into the pipeline yet — `VectorStoreService`/ChromaDB is the only persistence layer currently in use.

## Setup

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.23. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
