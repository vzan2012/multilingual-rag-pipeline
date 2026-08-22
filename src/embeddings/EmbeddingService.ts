import { pipeline } from "@xenova/transformers";
import type { EmbeddingOptions } from "../types/EmbeddingOptions";
import { normalize } from "node:path";

export class EmbeddingService {
  private model: string;
  private batchSize: number;
  private extractor: any = null;
  private isInitialized: boolean = false;

  constructor(options: EmbeddingOptions) {
    this.model =
      options.model || "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
    this.batchSize = options.batchSize || 32;

    if (options.autoInitialize !== false)
      this.initialize().catch(console.error);
  }

  initialize = async (): Promise<void> => {
    if (!this.extractor) {
      console.log(`⌛ Loading Embedding Model: ${this.model} ...`);

      this.extractor = await pipeline("feature-extraction", this.model);
      this.isInitialized = true;

      console.log(`✅ Embedding model loaded successfully`);
    }
  };

  private ensureInitialized = async (): Promise<void> => {
    if (!this.isInitialized) await this.initialize();
  };

  embedText = async (text: string): Promise<number[]> => {
    await this.initialize();

    const result = await this.extractor(text, {
      pooling: "mean",
      normalize: true,
    });

    return Array.from(result.data);
  };

  getEmbeddingDimension = async (): Promise<number> => {
    await this.ensureInitialized();
    const testEmbedding = await this.embedText("test");
    return testEmbedding.length;
  };

  embedBatch = async (texts: string[]): Promise<number[][]> => {
    await this.ensureInitialized();
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      const batchCalculation = `${Math.floor(i / this.batchSize) + 1} / ${Math.ceil(texts.length / this.batchSize)}`;
      console.log(`⌛ Processing Batch ${batchCalculation}`);

      const result = await this.extractor(batch, {
        pooling: "mean",
        normalize: true,
      });

      const embeddings = Array.from(result.data) as number[];
      const dim = embeddings.length / batch.length;

      const batchEmbeddings = Array.from({ length: batch.length }, (_, j) => {
        const start = j * dim;
        return Array.from(embeddings.slice(start, start + dim));
      });

      allEmbeddings.push(...batchEmbeddings);
    }
    return allEmbeddings;
  };

  isReady = (): boolean => this.isInitialized;
}
