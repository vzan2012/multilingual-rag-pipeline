import { RAGPipeline } from "../src/pipeline/RAGPipeline";
import { EmbeddingService } from "../src/embeddings/EmbeddingService";
import { VectorStoreService } from "../src/vectorstore/VectorStoreService";

const TEST_COLLECTION = "rag_pipeline_test";

const englishContent = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.`;

const spanishContent = `Este es un documento de prueba en español. Contiene varias oraciones para verificar que el sistema de recuperación aumentada por generación funciona correctamente con contenido multilingüe.`;

const testRagPipeline = async () => {
  console.log(`🚀 Starting RAGPipeline test...`);
  let vectorStoreService: VectorStoreService | null = null;

  try {
    // Step 1: Create sample files
    console.log(`\n📝 Step 1: Creating sample files`);
    await Bun.write("sample-en.txt", englishContent);
    await Bun.write("sample-es.txt", spanishContent);
    console.log(`✅ Created sample-en.txt and sample-es.txt`);

    // Step 2: Initialize services and construct the pipeline
    console.log(`\n📝 Step 2: Initializing services`);
    const embeddingService = new EmbeddingService({
      model: "Xenova/paraphrase-multilingual-MiniLM-L12-v2",
      batchSize: 2,
      autoInitialize: false,
    });
    await embeddingService.initialize();
    console.log(`✅ Embedding service ready: ${embeddingService.isReady()}`);

    vectorStoreService = new VectorStoreService({
      host: "localhost",
      port: 8000,
      collectionName: TEST_COLLECTION,
    });
    await vectorStoreService.initialize();
    console.log(`✅ Connected to ChromaDB collection: ${TEST_COLLECTION}`);

    const pipeline = new RAGPipeline(embeddingService, vectorStoreService, {
      topK: 3,
    });
    console.log(`✅ RAGPipeline constructed`);

    // Step 3: Index a single document
    console.log(`\n📝 Step 3: Indexing a single document (indexDocument)`);
    const chunks = await pipeline.indexDocument("sample-en.txt", "en");
    console.log(`✅ Indexed ${chunks.length} chunk(s) from sample-en.txt`);
    console.log(`First chunk id: ${chunks[0]?.id}`);

    // Step 4: Index multiple documents
    console.log(
      `\n📝 Step 4: Indexing multiple documents (indexMultipleDocuments)`,
    );
    const allChunks = await pipeline.indexMultipleDocuments(
      ["sample-es.txt"],
      "es",
    );
    console.log(`✅ Indexed ${allChunks.length} chunk(s) from sample-es.txt`);

    // Step 5: Query the pipeline
    console.log(`\n📝 Step 5: Querying the pipeline (query)`);
    const { results, queryTime } = await pipeline.query(
      "documento de prueba multilingüe",
      2,
    );
    console.log(`✅ Query completed in ${queryTime}ms`);
    console.log(`Results returned: ${results.length}`);
    results.forEach((r, i) => {
      console.log(
        `  ${i + 1}. score=${r.score.toFixed(4)} relevance=${r.relevance} documentId="${r.documentId}"`,
      );
      console.log(`     content: "${r.content.slice(0, 70)}..."`);
    });

    // Step 6: Check stats
    console.log(`\n📝 Step 6: Checking stats (getStats)`);
    const stats = await pipeline.getStats();
    console.log(
      `✅ Collection: ${stats.collectionName}, documents: ${stats.documentCount}`,
    );

    console.log(`\n✅ All RAGPipeline tests passed`);
  } catch (error) {
    console.error(`❌ RAGPipeline test failed:`, error);
  } finally {
    // Step 7: Cleanup
    console.log(`\n📝 Step 7: Cleaning up`);
    if (vectorStoreService) {
      try {
        await vectorStoreService.deleteCollection();
        console.log(`✅ Deleted test collection: ${TEST_COLLECTION}`);
      } catch (cleanupError) {
        console.warn(
          `⚠️ Could not delete test collection "${TEST_COLLECTION}" - it may need manual cleanup:`,
          cleanupError,
        );
      }
    }
    await Bun.write("sample-en.txt", "");
    await Bun.write("sample-es.txt", "");
    console.log(`✅ Cleared sample files`);
  }
};

testRagPipeline();