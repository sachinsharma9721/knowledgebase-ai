import { createAdminClient } from "@/lib/supabase/admin";
import { parseDocument, parseUrl } from "@/lib/ingestion/parser";
import { chunkText } from "@/lib/ingestion/chunker";
import { generateEmbeddings } from "@/lib/ingestion/embedder";

export async function processDocumentJob({
  kbId,
  docId,
  fileBuffer,
  sourceType,
  sourceUrl,
}: {
  kbId: string;
  docId: string;
  fileBuffer?: Buffer | null;
  sourceType: string;
  sourceUrl?: string | null;
}) {
  const supabase = createAdminClient();

  // Helper: update document with current progress so we can see where it stops
  async function updateProgress(step: string) {
    await supabase
      .from("documents")
      .update({ error_message: `[PROGRESS] ${step}` })
      .eq("id", docId);
  }

  try {
    await updateProgress(`Step 0: Started. type=${sourceType}, bufferSize=${fileBuffer?.length ?? 0}`);

    // 1. Parse the document
    let text: string;
    await updateProgress("Step 1: Parsing document...");

    if (sourceType === "url" && sourceUrl) {
      text = await parseUrl(sourceUrl);
    } else if (fileBuffer) {
      text = await parseDocument(fileBuffer, sourceType);
    } else {
      throw new Error("No file data or URL provided");
    }

    await updateProgress(`Step 1 done: Parsed ${text.length} chars`);

    if (!text || text.trim().length === 0) {
      throw new Error("Document contains no extractable text");
    }

    // 2. Chunk the text
    await updateProgress("Step 2: Chunking text...");
    const chunks = chunkText(text);
    await updateProgress(`Step 2 done: ${chunks.length} chunks created`);

    if (chunks.length === 0) {
      throw new Error("Document produced no chunks after splitting");
    }

    // 3. Generate embeddings
    await updateProgress(`Step 3: Generating embeddings (JINA_API_KEY present: ${!!process.env.JINA_API_KEY})...`);
    const embeddingResults = await generateEmbeddings(chunks);
    await updateProgress(`Step 3 done: ${embeddingResults.length} embeddings generated`);

    // 4. Store chunks with embeddings in batches
    await updateProgress("Step 4: Storing chunks in Supabase...");
    const STORE_BATCH_SIZE = 50;
    for (let i = 0; i < embeddingResults.length; i += STORE_BATCH_SIZE) {
      const batch = embeddingResults.slice(i, i + STORE_BATCH_SIZE);

      const rows = batch.map((result) => ({
        document_id: docId,
        kb_id: kbId,
        content: result.content,
        embedding: JSON.stringify(result.embedding),
        chunk_index: result.chunkIndex,
      }));

      const { error: insertError } = await supabase.from("chunks").insert(rows);

      if (insertError) {
        throw new Error(`Failed to store chunks: ${insertError.message}`);
      }
    }
    await updateProgress("Step 4 done: All chunks stored");

    // 5. Update document status to 'ready'
    await supabase
      .from("documents")
      .update({
        status: "ready",
        chunk_count: embeddingResults.length,
        error_message: null, // Clear progress messages on success
      })
      .eq("id", docId);

    return { success: true, chunkCount: embeddingResults.length };
  } catch (err) {
    console.error(`[PROCESS] FAILED for doc ${docId}:`, err);

    // Update document status to 'failed'
    try {
      await supabase
        .from("documents")
        .update({
          status: "failed",
          error_message: err instanceof Error ? err.message : "Unknown error",
        })
        .eq("id", docId);
    } catch (updateErr) {
      console.error(`[PROCESS] Failed to update doc status:`, updateErr);
    }

    throw err;
  }
}


