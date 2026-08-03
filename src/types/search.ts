export interface SearchQuery {
  query: string;
  topK?: number;
  language?: string;
  filters?: Record<string, any>;
}

export interface SearchResult {
  chunkId: string;
  documentId: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
  relevance: "high" | "medium" | "low";
}

export interface HybridSearchResult {
  results: SearchResult[];
  queryTime: number;
  totaMatches: number;
}
