import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { streamText, convertToCoreMessages, type UIMessage } from "ai";
import { groq } from "@ai-sdk/groq";
import { generateQueryEmbedding } from "@/lib/ingestion/embedder";
import { NextResponse } from "next/server";

export const maxDuration = 30;

// POST /api/kb/[id]/chat — Authenticated chat endpoint (owner testing their KB)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: kbId } = await params;
  let currentStep = "Initializing";
  try {
    currentStep = "Creating Supabase Clients";
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Verify auth
    currentStep = "Verifying Auth";
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify KB ownership
    currentStep = "Verifying KB Ownership";
    const { data: kb } = await supabase
      .from("knowledge_bases")
      .select("id, name, system_prompt, greeting_message")
      .eq("id", kbId)
      .eq("user_id", user.id)
      .single();

    if (!kb) {
      return NextResponse.json({ error: "Knowledge Base not found" }, { status: 404 });
    }

    const { messages }: { messages: UIMessage[] } = await request.json();
    const lastUserMessage = messages.filter((m) => m.role === "user").pop();

    if (!lastUserMessage) {
      return NextResponse.json({ error: "No user message found" }, { status: 400 });
    }

    // 1. Embed the user's question
    currentStep = "Generating Query Embedding";
    const queryEmbedding = await generateQueryEmbedding(lastUserMessage.content);

    // 2. Retrieve relevant chunks — STRICTLY filtered by kb_id
    currentStep = "Retrieving Chunks (Supabase RPC)";
    const { data: matchedChunks, error: matchError } = await adminSupabase.rpc(
      "match_chunks",
      {
        query_embedding: JSON.stringify(queryEmbedding),
        target_kb_id: kbId,
        match_threshold: 0.3,
        match_count: 5,
      }
    );

    if (matchError) {
      console.error("Chunk matching error:", matchError);
      return NextResponse.json({ error: "Failed to search knowledge base" }, { status: 500 });
    }

    // 3. Get document filenames for citations
    currentStep = "Getting Document Names (Supabase)";
    const documentIds = [...new Set((matchedChunks || []).map((c: { document_id: string }) => c.document_id))];
    let documentMap: Record<string, string> = {};

    if (documentIds.length > 0) {
      const { data: docs } = await adminSupabase
        .from("documents")
        .select("id, filename")
        .in("id", documentIds);

      if (docs) {
        documentMap = Object.fromEntries(docs.map((d) => [d.id, d.filename]));
      }
    }

    // 4. Build context with source information
    const hasContext = matchedChunks && matchedChunks.length > 0;
    const contextString = hasContext
      ? matchedChunks
        .map(
          (chunk: { content: string; document_id: string; similarity: number }, i: number) =>
            `[Source ${i + 1}: ${documentMap[chunk.document_id] || "Unknown"}]\n${chunk.content}`
        )
        .join("\n\n---\n\n")
      : "";

    // 5. Build system prompt with grounding instructions
    const customPrompt = kb.system_prompt ? `${kb.system_prompt}\n\n` : "";
    const systemPrompt = `${customPrompt}You are a helpful AI assistant for the knowledge base "${kb.name}".

CRITICAL RULES:
1. Answer ONLY based on the provided context from the knowledge base documents.
2. If the context does not contain enough information to answer the question, respond with: "I don't have that information in my knowledge base. The uploaded documents don't cover this topic."
3. ALWAYS cite your sources. At the end of your answer, include a "Sources:" section listing the document names you referenced.
4. Be concise, accurate, and helpful.
5. NEVER make up information or use general knowledge outside the provided context.
6. Format your responses using Markdown for readability.

${hasContext ? `CONTEXT FROM KNOWLEDGE BASE DOCUMENTS:\n\n${contextString}` : "NO RELEVANT CONTEXT FOUND - You must tell the user you don't have information about their question."}`;

    // 6. Stream the response
    currentStep = "Streaming LLM Response (Groq)";
    const result = streamText({
      model: groq("openai/gpt-oss-120b"),
      system: systemPrompt,
      messages: convertToCoreMessages(messages),
      abortSignal: request.signal,
      maxTokens: 2048,
      async onFinish({ text }) {
        // Persist messages to database
        try {
          const citedDocIds = documentIds.length > 0 ? documentIds : [];

          // Save user message
          await adminSupabase.from("messages").insert({
            kb_id: kbId,
            role: "user",
            content: lastUserMessage.content,
            cited_document_ids: [],
          });

          // Save assistant message
          await adminSupabase.from("messages").insert({
            kb_id: kbId,
            role: "assistant",
            content: text,
            cited_document_ids: citedDocIds,
          });
        } catch (err) {
          console.error("Failed to persist chat messages:", err);
        }
      },
      onError: ({ error }) => {
        console.error("Stream Error from Groq:", error);
      }
    });

    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error(`Chat API Error at step [${currentStep}]:`, error);
    return NextResponse.json(
      {
        error: error.message || "An unexpected error occurred",
        failedAt: currentStep,
        cause: error.cause?.message || undefined
      },
      { status: 500 }
    );
  }
}
