export interface ChromaDBConfig {
  host: string;
  port: number;
  collectionName: string;
}

export interface ChromaQueryResult {
  ids: string[][];
  distances: number[][];
  documents: string[][];
  metadatas: Record<string, any>[][];
  embeddings?: number[][][];
}
