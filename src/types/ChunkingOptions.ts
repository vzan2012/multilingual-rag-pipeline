/**
 * Chunks a given text into smaller segments based on the specified chunk size and overlap.
 *
 * @export
 * @interface ChunkingOptions
 * @typedef {ChunkingOptions}
 */

export interface ChunkingOptions {
  chunkSize: number;
  chunkOverlap: number;
  minChunkSize?: number;
}
/**
 * DocumentChunkInput represents the input required to chunk a document into smaller segments.
 *
 * @export
 * @interface DocumentChunkInput
 * @typedef {DocumentChunkInput}
 */

export interface DocumentChunkInput {
  content: string;
  documentId: string;
  language: string;
  metadata: Record<string, any>;
  options?: Partial<ChunkingOptions>;
}
/**
 * MultipleDocumentChunkInput represents the input required to chunk multiple documents into smaller segments.
 *
 * @export
 * @interface MultipleDocumentChunkInput
 * @typedef {MultipleDocumentChunkInput}
 */

export interface MultipleDocumentChunkInput {
  documents: Array<{
    content: string;
    metadata: Record<string, any>;
  }>;
  documentIdPrefix: string;
  language: string;
  options?: Partial<ChunkingOptions>;
}
