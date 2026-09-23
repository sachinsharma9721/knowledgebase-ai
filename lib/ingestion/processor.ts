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
  console.log(`[PROCESS] Starting processing for doc ${docId}, type: ${sourceType}, buffer size: ${fileBuffer?.length ?? 0}`);
  
  const supabase = createAdminClient();

  try {
    // 1. Parse the document
    console.log(`[PROCESS] Step 1: Parsing document...`);
    let text: string;

    if (sourceType === "url" && sourceUrl) {
      text = await parseUrl(sourceUrl);
    } else if (fileBuffer) {
      text = await parseDocument(fileBuffer, sourceType);
    } else {
      throw new Error("No file data or URL provided");
    }

    console.log(`[PROCESS] Step 1 done: Parsed ${text.length} characters`);

    if (!text || text.trim().length === 0) {
      throw new Error("Document contains no extractable text");
    }

    // 2. Chunk the text
    console.log(`[PROCESS] Step 2: Chunking text...`);
    const chunks = chunkText(text);
    console.log(`[PROCESS] Step 2 done: Created ${chunks.length} chunks`);

    if (chunks.length === 0) {
      throw new Error("Document produced no chunks after splitting");
    }

    // 3. Generate embeddings
    console.log(`[PROCESS] Step 3: Generating embeddings via Jina...`);
    console.log(`[PROCESS] JINA_API_KEY present: ${!!process.env.JINA_API_KEY}`);
    const embeddingResults = await generateEmbeddings(chunks);
    console.log(`[PROCESS] Step 3 done: Generated ${embeddingResults.length} embeddings`);

    // 4. Store chunks with embeddings in batches
    console.log(`[PROCESS] Step 4: Storing chunks in Supabase...`);
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
    console.log(`[PROCESS] Step 4 done: Stored all chunks`);

    // 5. Update document status to 'ready'
    console.log(`[PROCESS] Step 5: Updating document status to ready...`);
    await supabase
      .from("documents")
      .update({
        status: "ready",
        chunk_count: embeddingResults.length,
      })
      .eq("id", docId);
      
    console.log(`[PROCESS] COMPLETE: Doc ${docId} processed successfully with ${embeddingResults.length} chunks`);
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
      console.log(`[PROCESS] Updated doc ${docId} status to failed`);
    } catch (updateErr) {
      console.error(`[PROCESS] Failed to update doc status:`, updateErr);
    }
      
    throw err;
  }
}

