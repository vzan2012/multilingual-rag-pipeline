import { readFile } from "fs/promises";
import type { DocumentMetadata, LoadedDocument } from "../types";
import path from "path";
import mammoth from "mammoth";

const pdfParse = require("pdf-parse");
/**
 * DocumentLoader is a utility class for loading and parsing documents of various types (e.g., .txt, .pdf, .docx).
 *
 * @export
 * @class DocumentLoader
 * @typedef {DocumentLoader}
 */
export class DocumentLoader {
  /**
   * Loads a document from the specified file path and returns its content along with metadata.
   *
   * @async
   * @param {string} filePath
   * @returns {Promise<LoadedDocument>}
   */
  async loadFile(filePath: string): Promise<LoadedDocument> {
    const fileBuffer = await readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const filename = path.basename(filePath);

    let content = "";
    let metadata: DocumentMetadata = {
      filename,
      fileType: extension.slice(1), // Remove the dot from the extension
    };

    switch (extension) {
      case ".txt":
        content = fileBuffer.toString("utf-8");
        metadata.wordCount = content.split(/\s+/).length;
        break;
      case ".pdf":
        const pdfData = await pdfParse(fileBuffer);
        content = pdfData.text;
        metadata.pageCount = pdfData.numpages;
        metadata.wordCount = content.split(/\s+/).length;
        break;
      case ".docx":
        const docxResult = await mammoth.extractRawText({ buffer: fileBuffer });
        content = docxResult.value;
        metadata.wordCount = content.split(/\s+/).length;
        if (docxResult.messages.length > 0)
          console.warn("Mammoth messages:", docxResult.messages);
        break;

      default:
        throw new Error(`Unsupported file type: ${extension}`);
    }

    return { content, metadata };
  }

  async loadMultipleFiles(filePaths: string[]): Promise<LoadedDocument[]> {
    const loadedDocuments: LoadedDocument[] = [];
    for (const filePath of filePaths) {
      try {
        const loadedDoc = await this.loadFile(filePath);
        loadedDocuments.push(loadedDoc);
        console.log(`✅ Loaded file: ${path.basename(filePath)}`);
      } catch (error) {
        console.error(`❌Error loading file ${filePath}:`, error);
      }
    }
    return loadedDocuments;
  }
}
