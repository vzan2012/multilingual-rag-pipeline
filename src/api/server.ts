import { Elysia, t } from "elysia";
import { GroqService } from "../llm/GroqService";
import { EmbeddingService } from "../embeddings/EmbeddingService";
import { RAGPipeline } from "../pipeline/RAGPipeline";
import { VectorStoreService } from "../vectorstore/VectorStoreService";

/**
 * Builds and returns a configured Elysia app. Construction is async because the
 * embedding model and the ChromaDB connection both need to be ready before any
 * request is handled.
 *
 * @async
 * @returns {Promise<Elysia>}
 */
export const createServer = async () => {
  const embeddingService = new EmbeddingService({ autoInitialize: false });
  await embeddingService.initialize();

  const vectorStoreService = new VectorStoreService({
    host: process.env.CHROMA_HOST || "localhost",
    port: Number(process.env.CHROMA_PORT) || 8000,
    collectionName: process.env.CHROMA_COLLECTION || "documents",
  });
  await vectorStoreService.initialize();

  // GroqService is optional: without a GROQ_API_KEY, indexing and plain search
  // still work - only answer generation on /query is unavailable.
  let groqService: GroqService | undefined;
  try {
    groqService = new GroqService();
  } catch (error) {
    console.warn(`⚠️ ${(error as Error).message}`);
    console.warn(`⚠️ /query will return retrieved chunks without a generated answer.`);
  }

  const pipeline = new RAGPipeline(
    embeddingService,
    vectorStoreService,
    { topK: 5 },
    groqService,
  );

  const app = new Elysia()
    .get("/health", async () => {
      try {
        const stats = await pipeline.getStats();
        return { status: "ok", ...stats, answerGeneration: Boolean(groqService) };
      } catch (error) {
        return { status: "error", message: (error as Error).message };
      }
    })
    .post("/documents", async ({ body, set }) => {
      const { filePath, language } = body as {
        filePath: string;
        language?: string;
      };

      if (!filePath) {
        set.status = 400;
        return { error: "filePath is required" };
      }

      const chunks = await pipeline.indexDocument(filePath, language);
      return { indexed: chunks.length, chunks };
    })
    .post(
      "/documents/upload",
      async ({ body }) => {
        const { file, language } = body;

        // Bun.write creates any missing parent directories, so "uploads/"
        // doesn't need to exist beforehand.
        const destPath = `uploads/${Date.now()}-${file.name}`;
        await Bun.write(destPath, file);

        const chunks = await pipeline.indexDocument(destPath, language);
        return { indexed: chunks.length, filename: file.name, chunks };
      },
      {
        body: t.Object({
          file: t.File(),
          language: t.Optional(t.String()),
        }),
      },
    )
    .post("/query", async ({ body, set }) => {
      const { query, topK } = body as { query: string; topK?: number };

      if (!query) {
        set.status = 400;
        return { error: "query is required" };
      }

      if (!groqService) {
        const { results, queryTime } = await pipeline.query(query, topK);
        return { answer: null, sources: results, queryTime };
      }

      return await pipeline.queryWithAnswer(query, topK);
    });

  return app;
};