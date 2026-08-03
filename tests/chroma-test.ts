import { ChromaClient } from "chromadb";

console.log(`🚀 Starting ChromaDB test...`);

const client = new ChromaClient({ host: "localhost", port: 8000 });

const testConnection = async () => {
  try {
    // Check ChromaDB is responsive
    const collections = await client.listCollections();
    console.log(`✅ ChromaDB is running !!!`);
    console.log("Collections found:", collections.length);

    // Create a test collection and add a document
    const collection = await client.createCollection({
      name: "test_collection",
      metadata: {
        "hnsw:space": "cosine",
      },
    });
    console.log("Test Collection created:", collection.name);

    // Add a test document to the collection
    await collection.add({
      ids: ["test1"],
      embeddings: [[0.1, 0.2, 0.3]],
      metadatas: [{ test: "hello" }],
      documents: ["This is a test document."],
    });
    console.log("Test document added to the collection.");

    // Query the collection to verify the document was added
    const results = await collection.query({
      queryEmbeddings: [[0.1, 0.2, 0.3]],
      nResults: 1,
    });
    console.log("Query results:", results);

    // Clean up: delete the test collection
    await client.deleteCollection({ name: "test_collection" });
    console.log("✅ Test Collection deleted.");
  } catch (error) {
    console.error("Error connecting to Chroma DB:", error);
  }
};

testConnection();
