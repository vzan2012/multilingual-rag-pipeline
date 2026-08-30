import { createServer } from "./src/api/server";

const PORT = Number(process.env.PORT) || 3000;

const app = await createServer();

app.listen(PORT, () => {
  console.log(`🚀 RAG pipeline API listening on http://localhost:${PORT}`);
});