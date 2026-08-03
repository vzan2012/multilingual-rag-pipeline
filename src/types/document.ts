export interface LoadedDocument {
  content: string;
  metadata: DocumentMetadata;
}

export interface DocumentMetadata {
  filename: string;
  fileType: string;
  pageCount?: number;
  wordCount?: number;
  language?: string;
  [key: string]: any;
}

export interface DocumentChunk {
  id: string;
  content: string;
  chunkIndex: number;
  language: string;
  metadata: Record<string, any>;
  embedding?: number[]; // Optional embedding field
}
