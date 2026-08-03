console.log(`Starting ping test...`);

const url = "http://localhost:8000/api/v2/heartbeat";

try {
  const response = await fetch(url);
  const data = await response.json();
  console.log(`✅ ChromaDB heartbeat:`, data);
  console.log(`ChromaDB is running at ${url}`);
} catch (error) {
  console.error("❌Cannot reach ChromaDB:", error);
}
