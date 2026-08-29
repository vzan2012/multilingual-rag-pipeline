export interface RAGPipelineConfig {
  chunkSize?: number;
  chunkOverlap?: number;
  topK?: number;
  embeddingModel?: string;
}
