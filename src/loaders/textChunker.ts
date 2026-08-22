import type { DocumentChunk } from "../types/Document";
import type {
  ChunkingOptions,
  DocumentChunkInput,
  MultipleDocumentChunkInput,
} from "../types/ChunkingOptions";

/**
 * TextChunker is a utility class that provides methods to chunk text documents into smaller segments based on specified options.
 *
 * @export
 * @class TextChunker
 * @typedef {TextChunker}
 */
export class TextChunker {
  private defaultOptions: ChunkingOptions = {
    chunkSize: 1000,
    chunkOverlap: 200,
    minChunkSize: 50,
  };

  /**
   * Chunks a single document into smaller segments based on the specified options.
   *
   * @param {DocumentChunkInput} documentChunk
   * @returns {DocumentChunk[]}
   */
  chunkDocument(documentChunk: DocumentChunkInput): DocumentChunk[] {
    const {
      content,
      documentId,
      language,
      metadata,
      options,
    }: DocumentChunkInput = documentChunk;
    let currentChunk = "";
    let chunkIndex = 0;

    const opts = {
      ...this.defaultOptions,
      ...options,
    };
    const chunks: DocumentChunk[] = [];

    const cleanText = this.cleanText(content);

    if (!cleanText.trim()) {
      return chunks;
    }

    if (cleanText.length <= opts.chunkSize) {
      chunks.push({
        id: `${documentId}-chunk-0`,
        content: cleanText,
        chunkIndex: 0,
        language,
        metadata,
      });
      return chunks;
    }

    const sentences = this.splitIntoSentences(cleanText);

    for (const sentence of sentences) {
      if (
        currentChunk.length + sentence.length > opts.chunkSize &&
        currentChunk.length > 0
      ) {
        chunks.push({
          id: `${documentId}-chunk-${chunkIndex}`,
          content: currentChunk.trim(),
          chunkIndex,
          language,
          metadata: {
            ...metadata,
            chunkIndex,
          },
        });

        chunkIndex++;

        const overlapText = this.getOverlap(currentChunk, opts.chunkOverlap);
        currentChunk = overlapText + sentence;
      } else {
        currentChunk += sentence;
      }
    }

    if (currentChunk.trim().length >= (opts.minChunkSize || 50)) {
      chunks.push({
        id: `${documentId}-chunk-${chunkIndex}`,
        content: currentChunk.trim(),
        chunkIndex,
        language,
        metadata: {
          ...metadata,
          chunkIndex,
        },
      });
    }

    return chunks;
  }

  /**
   * Chunks multiple documents into smaller segments based on the specified options.
   *
   * @param {MultipleDocumentChunkInput} multipleDocuments
   * @returns {DocumentChunk[]}
   */
  chunkMultipleDocuments(
    multipleDocuments: MultipleDocumentChunkInput,
  ): DocumentChunk[] {
    const { documents, documentIdPrefix, language, options } =
      multipleDocuments;
    const allChunks: DocumentChunk[] = [];

    documents.forEach((doc, index) => {
      const docId = `${documentIdPrefix}-${index}`;
      const documentChunks = this.chunkDocument({
        content: doc.content,
        documentId: `${documentIdPrefix}-${index}`,
        language,
        metadata: doc.metadata,
        options,
      });
      allChunks.push(...documentChunks);
    });

    return allChunks;
  }

  /**
   * Cleans the input text by removing excessive whitespace and normalizing line breaks.
   *
   * @private
   * @param {string} text
   * @returns {string}
   */
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, " ")
      .replace(/\n\s*\n/g, "\n")
      .trim();
  }

  /**
   * Get overlap text
   *
   * @private
   * @param {string} text
   * @param {number} overlapSize
   * @returns {string}
   */
  private getOverlap(text: string, overlapSize: number): string {
    if (text.length <= overlapSize) return text + "";

    const startIndex = text.length - overlapSize;
    const lastSpace = text.lastIndexOf(" ", text.length - 1);

    if (lastSpace > startIndex) {
      return text.substring(0, lastSpace + 1);
    }

    return text.substring(startIndex);
  }

  /**
   * Splits the input text into individual sentences.
   *
   * @private
   * @param {string} text
   * @returns {string[]}
   */
  private splitIntoSentences(text: string): string[] {
    const sentenceRegex = /[^.!?]+[.!?]+\s*/g;
    const matches = text.match(sentenceRegex);

    if (!matches) {
      const paragraphs = text.split("\n").filter((p) => p.trim());
      return paragraphs.length > 0 ? paragraphs : [text];
    }
    return matches.map((s) => s.trim()).filter((s) => s.length > 0);
  }
}
