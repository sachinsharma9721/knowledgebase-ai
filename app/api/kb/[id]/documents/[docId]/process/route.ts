import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseDocument, parseUrl } from "@/lib/ingestion/parser";
import { chunkText } from "@/lib/ingestion/chunker";
import { generateEmbeddings } from "@/lib/ingestion/embedder";

// Extend serverless timeout for large document processing
export const maxDuration = 300; // 5 minutes

// POST /api/kb/[id]/documents/[docId]/process
// Async document processing: parse → chunk → embed → store
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { id: kbId, docId } = await params;

  const body = await request.json();
  const { fileBase64, sourceType, sourceUrl, serviceKey } = body;

  // Simple auth: verify service key to prevent unauthorized processing
  if (serviceKey !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    // 1. Parse the document
    let text: string;

    if (sourceType === "url" && sourceUrl) {
      text = await parseUrl(sourceUrl);
    } else if (fileBase64) {
      const buffer = Buffer.from(fileBase64, "base64");
      text = await parseDocument(buffer, sourceType);
    } else {
      throw new Error("No file data or URL provided");
    }

    if (!text || text.trim().length === 0) {
      throw new Error("Document contains no extractable text");
    }

    // 2. Chunk the text
    const chunks = chunkText(text);

    if (chunks.length === 0) {
      throw new Error("Document produced no chunks after splitting");
    }

    // 3. Generate embeddings
    const embeddingResults = await generateEmbeddings(chunks);

    // 4. Store chunks with embeddings in batches
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

    // 5. Update document status to 'ready'
    await supabase
      .from("documents")
      .update({
        status: "ready",
        chunk_count: embeddingResults.length,
      })
      .eq("id", docId);

    return NextResponse.json({
      success: true,
      chunkCount: embeddingResults.length,
    });
  } catch (err) {
    console.error(`Document processing failed for ${docId}:`, err);

    // Update document status to 'failed'
    await supabase
      .from("documents")
      .update({
        status: "failed",
        error_message: err instanceof Error ? err.message : "Unknown error",
      })
      .eq("id", docId);

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Processing failed" },
      { status: 500 }
    );
  }
}
