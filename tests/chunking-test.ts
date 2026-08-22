import { DocumentLoader } from "../src/loaders/DocumentLoader";
import { TextChunker } from "../src/loaders/TextChunker";

const chunker = new TextChunker();
const loader = new DocumentLoader();

const testChunking = async () => {
  console.log(`Starting TextChunker test...`);

  const sampleContent = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`;

  await Bun.write("sample.txt", sampleContent);
  console.log(`✅ Created sample.txt`);

  const loadedDocument = await loader.loadFile("sample.txt");
  console.log(`✅ Loaded document: ${loadedDocument.metadata.filename}`);
  console.log(`Word Count: ${loadedDocument.metadata.wordCount}`);

  const chunks = chunker.chunkDocument({
    content: loadedDocument.content,
    documentId: "doc-1",
    language: "en",
    metadata: loadedDocument.metadata,
    options: {
      chunkSize: 100,
      chunkOverlap: 20,
    },
  });

  console.log(`✅ Chunking Results:`);
  console.log(`Total Chunks: ${chunks.length}`);

  if (chunks.length > 0) {
    const avgSize = Math.round(
      chunks.reduce((sum, c) => sum + c.content.length, 0) / chunks.length,
    );
    console.log(`Average Chunk Size: ${avgSize} characters`);
    console.log(`Chunks: `);

    chunks.map((chunk, index) => {
      const preview =
        chunk.content.substring(0, 100) +
        (chunk.content.length > 100 ? "..." : "");

      console.log(`Chunk ${index + 1} - ${chunk.content.length} chars`);
      console.log(preview);
    });

    console.log(`✅ Sample Chunk Metadata`);
    console.log(`ID: ${chunks[0]?.id}`);
    console.log(`Language: ${chunks[0]?.language}`);
    console.log(`Index: ${chunks[0]?.chunkIndex}`);
  }

  await Bun.write("sample.txt", "");
  console.log(`✅ Cleaned up sample file`);
  console.log(`✅ Chunking test passed!`);
};

testChunking();
