import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { processDocumentJob } from "@/lib/ingestion/processor";

// Extend timeout so the background processing in after() doesn't get killed
export const maxDuration = 300;

// GET /api/kb/[id]/documents — List documents for a KB
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify KB ownership
  const { data: kb } = await supabase
    .from("knowledge_bases")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!kb) {
    return NextResponse.json({ error: "Knowledge Base not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("kb_id", id)
    .order("uploaded_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/kb/[id]/documents — Upload a document or URL
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify KB ownership
  const { data: kb } = await supabase
    .from("knowledge_bases")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!kb) {
    return NextResponse.json({ error: "Knowledge Base not found" }, { status: 404 });
  }

  const contentType = request.headers.get("content-type") || "";

  let filename: string;
  let sourceType: string;
  let fileBuffer: Buffer | null = null;
  let sourceUrl: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    // File upload
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    filename = file.name;
    const ext = filename.split(".").pop()?.toLowerCase();

    if (!ext || !["pdf", "docx", "txt"].includes(ext)) {
      return NextResponse.json(
        { error: "Unsupported file type. Supported: PDF, DOCX, TXT" },
        { status: 400 }
      );
    }

    sourceType = ext;
    const arrayBuffer = await file.arrayBuffer();
    fileBuffer = Buffer.from(arrayBuffer);
  } else {
    // URL submission
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    filename = url;
    sourceType = "url";
    sourceUrl = url;
  }

  // Create document record with 'processing' status
  const { data: doc, error: insertError } = await supabase
    .from("documents")
    .insert({
      kb_id: id,
      filename,
      source_type: sourceType,
      status: "processing",
      file_size: fileBuffer?.length ?? 0,
    })
    .select()
    .single();

  if (insertError || !doc) {
    return NextResponse.json({ error: insertError?.message || "Failed to create document" }, { status: 500 });
  }

  console.log(`[UPLOAD] Doc ${doc.id} created, starting processing inline...`);

  // Process inline so the full maxDuration (300s) applies.
  // Vercel's after() has its own short timeout and won't work for heavy processing.
  try {
    const result = await processDocumentJob({
      kbId: id,
      docId: doc.id,
      fileBuffer,
      sourceType,
      sourceUrl,
    });

    console.log(`[UPLOAD] Doc ${doc.id} processing complete, chunks: ${result.chunkCount}`);
    return NextResponse.json({ ...doc, status: "ready", chunk_count: result.chunkCount }, { status: 201 });
  } catch (err) {
    console.error(`[UPLOAD] Doc ${doc.id} processing failed:`, err);
    // processDocumentJob already marks the doc as 'failed' in the DB
    return NextResponse.json(
      { ...doc, status: "failed", error_message: err instanceof Error ? err.message : "Processing failed" },
      { status: 201 }
    );
  }
}

