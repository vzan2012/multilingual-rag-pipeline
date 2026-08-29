import { EmbeddingService } from "../src/embeddings/EmbeddingService";

const singleText = "This test sentence is in English";
const multiLangTexts = [
  "This 1st test sentence is in English",
  "This 2nd test sentence is in English",
  "Este es un texto de prueba en español.",
];

const testEmbeddingService = async () => {
  console.log(`📦 Testing Embedding Service`);

  const embeddingService = new EmbeddingService({
    model: "Xenova/paraphrase-multilingual-MiniLM-L12-v2",
    batchSize: 2,
    autoInitialize: false,
  });

  console.log(`📦 Initializing Embedding Model ...`);

  await embeddingService.initialize();

  console.log(`✅ Model Initialized ...`);

  await singleTextEmbedding(embeddingService, singleText);

  await multiLangTextEmbedding(embeddingService, multiLangTexts);

  await getEmbeddingDimension(embeddingService);

  console.log("📝 Test 4: Service status");
  console.log(`✅ Service ready: ${embeddingService.isReady()}\n`);
  console.log(`✅ All Embedding Service tests passed`);
};

const singleTextEmbedding = async (
  embeddingService: EmbeddingService,
  sentence: string,
) => {
  console.log(`📝 Single Text Embedding`);
  const singleEmbedding = await embeddingService.embedText(sentence);
  console.log(`✅ Embedding generated ...`);
  console.log(`Dimension: ${singleEmbedding.length}`);
  console.log(
    `First 5 values: ${singleEmbedding
      .slice(0, 5)
      .map((d) => d.toFixed(4))
      .join(",")}...`,
  );
};

const multiLangTextEmbedding = async (
  embeddingService: EmbeddingService,
  sentences: string[],
) => {
  console.log(`📝 Multi-Lang Text Batch Embedding`);
  console.log(`⌛ Processing ${sentences.length} texts in mulitple languages`);
  const batchEmbeddings = await embeddingService.embedBatch(sentences);
  console.log(`✅ Embedding generated ...`);
  console.log(`Total Embeddings: ${batchEmbeddings.length}`);
  console.log(`Each Dimension: ${batchEmbeddings[0]?.length || 0}`);
};

const getEmbeddingDimension = async (embeddingService: EmbeddingService) => {
  console.log(`📝 Get Embedding Dimension`);
  const dimension = await embeddingService.getEmbeddingDimension();

  console.log(`✅ Model Embedding Dimension: ${dimension}`);
};

testEmbeddingService().catch(console.error);
