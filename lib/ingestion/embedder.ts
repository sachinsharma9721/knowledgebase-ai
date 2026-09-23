// Embedding generation using Jina AI (jina-embeddings-v2-base-en)
// 768-dimensional embeddings, 1M free tokens.

const JINA_EMBEDDING_MODEL = "jina-embeddings-v2-base-en";
const BATCH_SIZE = 10;

export interface EmbeddingResult {
  content: string;
  embedding: number[];
  chunkIndex: number;
}

export async function generateEmbeddings(
  chunks: { content: string; chunkIndex: number }[]
): Promise<EmbeddingResult[]> {
  console.log(`[EMBEDDER] Starting embedding generation for ${chunks.length} chunks`);
  console.log(`[EMBEDDER] JINA_API_KEY present: ${!!process.env.JINA_API_KEY}, prefix: ${process.env.JINA_API_KEY?.substring(0, 8) || "NOT SET"}`);
  
  const results: EmbeddingResult[] = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map((c) => c.content);

    console.log(`[EMBEDDER] Sending batch ${Math.floor(i / BATCH_SIZE) + 1}, ${batch.length} chunks to Jina...`);

    const response = await fetch("https://api.jina.ai/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.JINA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: texts,
        model: JINA_EMBEDDING_MODEL,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[EMBEDDER] Jina API error: ${response.status} ${errorText}`);
      throw new Error(`Jina API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log(`[EMBEDDER] Batch ${Math.floor(i / BATCH_SIZE) + 1} done, got ${data.data?.length || 0} embeddings`);

    for (let j = 0; j < batch.length; j++) {
      results.push({
        content: batch[j].content,
        embedding: data.data[j].embedding,
        chunkIndex: batch[j].chunkIndex,
      });
    }
  }

  console.log(`[EMBEDDER] All embeddings generated: ${results.length} total`);
  return results;
}

// Generate a single embedding for a query
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  console.log(`[EMBEDDER] Generating query embedding...`);
  const response = await fetch("https://api.jina.ai/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.JINA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: [query],
      model: JINA_EMBEDDING_MODEL,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[EMBEDDER] Jina API error: ${response.status} ${errorText}`);
    throw new Error(`Jina API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  console.log(`[EMBEDDER] Query embedding generated`);
  return data.data[0].embedding;
}

