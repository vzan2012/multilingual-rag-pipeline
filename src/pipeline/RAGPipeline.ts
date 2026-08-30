import type { EmbeddingService } from "../embeddings/EmbeddingService";
import type { GroqService } from "../llm/GroqService";
import { DocumentLoader } from "../loaders/DocumentLoader";
import { TextChunker } from "../loaders/TextChunker";
import type { DocumentChunk, SearchResult } from "../types";
import type { RAGPipelineConfig } from "../types/RAGPipeline";
import type { VectorStoreService } from "../vectorstore/VectorStoreService";

export class RAGPipeline {
  private loader: DocumentLoader;
  private chunker: TextChunker;
  private embeddingService: EmbeddingService;
  private vectorStoreService: VectorStoreService;
  private groqService?: GroqService;
  private topK: number;

  constructor(
    embeddingService: EmbeddingService,
    vectorStoreService: VectorStoreService,
    config: RAGPipelineConfig = {},
    groqService?: GroqService,
  ) {
    this.loader = new DocumentLoader();
    this.chunker = new TextChunker();
    this.embeddingService = embeddingService;
    this.vectorStoreService = vectorStoreService;
    this.groqService = groqService;
    this.topK = config.topK || 5;
  }

  /**
   * Index a document: load, chunk, embed and store
   *
   * @async
   * @param {string} filePath
   * @param {string} [language="en"]
   * @returns {Promise<DocumentChunk[]>}
   */
  indexDocument = async (
    filePath: string,
    language: string = "en",
  ): Promise<DocumentChunk[]> => {
    console.log(`🗒 Indexing Document: ${filePath}`);

    // Load the Document
    const loadedDoc = await this.loader.loadFile(filePath);
    console.log(
      `✅ Loaded: ${loadedDoc.metadata.filename} ${loadedDoc.metadata.wordCount} words`,
    );

    // Chunk the document
    const chunks = this.chunker.chunkDocument({
      content: loadedDoc.content,
      documentId: loadedDoc.metadata.filename,
      language,
      metadata: loadedDoc.metadata,
      options: {
        chunkSize: 1000,
        chunkOverlap: 200,
      },
    });
    console.log(`✅ Created ${chunks.length} chunks`);

    // Generate Embeddings
    const texts = chunks.map((c) => c.content);
    const embeddings = await this.embeddingService.embedBatch(texts);
    console.log(`✅ Generated ${embeddings.length} embeddings`);

    // Store in vector store
    await this.vectorStoreService.addChunks(chunks, embeddings);

    return chunks;
  };

  /**
   * Index Multiple Documents
   *
   * @async
   * @param {string[]} filePaths
   * @param {string} [language="en"]
   * @returns {Promise<DocumentChunk[]>}
   */
  indexMultipleDocuments = async (
    filePaths: string[],
    language: string = "en",
  ): Promise<DocumentChunk[]> => {
    const allChunks: DocumentChunk[] = [];

    for (const filePath of filePaths) {
      const chunks = await this.indexDocument(filePath, language);
      allChunks.push(...chunks);
    }

    return allChunks;
  };

  /**
   * Query the RAG pipeline
   *
   * @async
   * @param {string} query
   * @param {?number} [topK]
   * @returns {Promise<{
   *     results: SearchResult[];
   *     queryTime: number;
   *   }>}
   */
  query = async (
    query: string,
    topK?: number,
  ): Promise<{
    results: SearchResult[];
    queryTime: number;
  }> => {
    const startTime = Date.now();
    const k = topK || this.topK;

    console.log(`🔍 Querying: "${query}"`);

    // Generate query embeddings
    const queryEmbedding = await this.embeddingService.embedText(query);

    // Search vector store
    const results = await this.vectorStoreService.search(queryEmbedding, k);

    // Format the results
    const documents = results.documents?.[0] ?? [];
    const ids = results.ids?.[0] ?? [];
    const metadatas = results.metadatas?.[0] ?? [];
    const distances = results.distances?.[0] ?? [];

    // Format results
    const formattedResults: SearchResult[] = documents
      .filter((doc): doc is string => doc !== null && doc !== undefined)
      .map((doc: string, index: number) => {
        const metadata = metadatas[index] || {};
        const distance = distances[index] || 0;

        return {
          chunkId: String(ids[index] || ""),
          documentId: String(metadata.documentId || ""),
          content: doc,
          score: 1 - distance,
          metadata,
          relevance: "medium" as const,
        };
      });

    const queryTime = Date.now() - startTime;

    return {
      results: formattedResults,
      queryTime,
    };
  };

  /**
   * Get Vector Store Stats
   *
   * @async
   * @returns {unknown}
   */
  getStats = async () => await this.vectorStoreService.getStats();

  /**
   * Query the RAG pipeline and generate a natural-language answer from the
   * retrieved chunks. Requires a GroqService to have been passed to the constructor.
   *
   * @async
   * @param {string} query
   * @param {?number} [topK]
   * @returns {Promise<{
   *     answer: string;
   *     sources: SearchResult[];
   *     queryTime: number;
   *   }>}
   */
  queryWithAnswer = async (
    query: string,
    topK?: number,
  ): Promise<{
    answer: string;
    sources: SearchResult[];
    queryTime: number;
  }> => {
    if (!this.groqService)
      throw new Error(
        "queryWithAnswer requires a GroqService - pass one to the RAGPipeline constructor",
      );

    const startTime = Date.now();
    const { results } = await this.query(query, topK);

    const answer = await this.groqService.generateAnswer(
      query,
      results.map((r) => r.content),
    );

    return {
      answer,
      sources: results,
      queryTime: Date.now() - startTime,
    };
  };
}
