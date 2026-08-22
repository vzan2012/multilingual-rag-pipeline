import { ChromaClient, type Collection } from "chromadb";
import type { VectorStoreConfig } from "../types/VectorStore";
import type { DocumentChunk } from "../types";

/**
 * Vector Store Service
 *
 * @export
 * @class VectorStoreService
 * @typedef {VectorStoreService}
 */
export class VectorStoreService {
  private client: ChromaClient;
  private collection: Collection | null = null;
  private collectionName: string;
  private readonly BATCH_SIZE = 100;

  constructor(config: VectorStoreConfig) {
    this.client = new ChromaClient({
      host: config.host,
      port: config.port,
    });

    this.collectionName = config.collectionName;
  }

  initialize = async () => {
    try {
      this.collection = await this.client.getCollection({
        name: this.collectionName,
      });
      console.log(
        `✅ Connected to existing collection: ${this.collectionName}`,
      );
    } catch (error) {
      this.collection = await this.client.createCollection({
        name: this.collectionName,
      });
      console.log(
        `✅ Connected to existing collection: ${this.collectionName}`,
      );
    }
  };

  prepareChunkData = (chunks: DocumentChunk[]) => ({
    ids: chunks.map(({ id }) => id),
    documents: chunks.map(({ content }) => content),
    metadata: chunks.map(({ id, chunkIndex, language, metadata }) => ({
      documentId: metadata.documentId || id,
      chunkIndex,
      language,
      filename: metadata.filename || "unknown",
      fileType: metadata.fileType || "unknown",
      ...metadata,
    })),
  });

  addChunks = async (chunks: DocumentChunk[], embeddings: number[][]) => {
    if (!this.collection) throw new Error("Collection not initialized !!!");

    if (chunks.length !== embeddings.length)
      throw new Error("Number of chunks and embeddings must match");

    const totalBatches = Math.ceil(chunks.length / this.BATCH_SIZE);

    for (let i = 0; i < chunks.length; i += this.BATCH_SIZE) {
      const end = Math.min(i + this.BATCH_SIZE, chunks.length);
      const batchNumber = Math.floor(i / this.BATCH_SIZE) + 1;

      console.log(`✅ Adding Batch: ${batchNumber / totalBatches}`);

      const batchChunks = chunks.slice(i, end);
      const batchEmbeddings = embeddings.slice(i, end);

      await this.collection.add({
        ...this.prepareChunkData(batchChunks),
        embeddings: batchEmbeddings,
      });
    }

    console.log(`✅ Added: ${chunks.length} chunks to the vector store`);
  };

  search = async (
    queryEmbedding: number[],
    topK: number = 5,
    filters?: Record<string, any>,
  ) => {
    if (!this.collection)
      throw new Error(`⌛ Collection not initialized. Call initialize() first`);

    return await this.collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: topK,
      where: filters,
    });
  };

  deleteCollection = async () => {
    if (this.collection) throw new Error(`⌛ Collection not initialized`);

    await this.client.deleteCollection({ name: this.collectionName });

    this.collection = null;

    console.log(`⚡ Deleted Collection: ${this.collectionName}`);
  };

  getStats = async (): Promise<{
    collectionName: string;
    documentCount: number;
  }> => {
    if (!this.collection) throw new Error(`⌛ Collection not initialized`);

    const count = await this.collection.count();

    return {
      collectionName: this.collectionName,
      documentCount: count,
    };
  };
}
