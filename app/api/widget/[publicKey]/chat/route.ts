import { createAdminClient } from "@/lib/supabase/admin";
import { streamText, convertToCoreMessages, type UIMessage } from "ai";
import { groq } from "@ai-sdk/groq";
import { generateQueryEmbedding } from "@/lib/ingestion/embedder";
import { widgetRateLimit } from "@/lib/ratelimit";
import { NextResponse } from "next/server";

export const maxDuration = 30;

// CORS headers for cross-origin widget requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// OPTIONS — CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// POST /api/widget/[publicKey]/chat — Public, rate-limited chat endpoint
export async function POST(
  request: Request,
  { params }: { params: Promise<{ publicKey: string }> }
) {
  const { publicKey } = await params;

  // 1. Rate limiting
  try {
    const { success, limit, remaining } = await widgetRateLimit.limit(publicKey);

    if (!success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
          },
        }
      );
    }
  } catch (err) {
    // If rate limiting fails (e.g. Redis unavailable), continue but log
    console.error("Rate limiting error:", err);
  }

  const supabase = createAdminClient();

  // 2. Look up KB by public key
  const { data: kb, error: kbError } = await supabase
    .from("knowledge_bases")
    .select("id, name, system_prompt, greeting_message")
    .eq("widget_public_key", publicKey)
    .single();

  if (kbError || !kb) {
    return NextResponse.json(
      { error: "Invalid widget key" },
      { status: 404, headers: corsHeaders }
    );
  }

  const { messages }: { messages: UIMessage[] } = await request.json();
  const lastUserMessage = messages.filter((m) => m.role === "user").pop();

  if (!lastUserMessage) {
    return NextResponse.json(
      { error: "No user message found" },
      { status: 400, headers: corsHeaders }
    );
  }

  // 3. Embed the question
  const queryEmbedding = await generateQueryEmbedding(lastUserMessage.content);

  // 4. Retrieve relevant chunks — STRICTLY filtered by kb_id
  const { data: matchedChunks } = await supabase.rpc("match_chunks", {
    query_embedding: JSON.stringify(queryEmbedding),
    target_kb_id: kb.id,
    match_threshold: 0.3,
    match_count: 5,
  });

  // 5. Get document names for citations
  const documentIds = [...new Set((matchedChunks || []).map((c: { document_id: string }) => c.document_id))];
  let documentMap: Record<string, string> = {};

  if (documentIds.length > 0) {
    const { data: docs } = await supabase
      .from("documents")
      .select("id, filename")
      .in("id", documentIds);

    if (docs) {
      documentMap = Object.fromEntries(docs.map((d) => [d.id, d.filename]));
    }
  }

  // 6. Build context
  const hasContext = matchedChunks && matchedChunks.length > 0;
  const contextString = hasContext
    ? matchedChunks
        .map(
          (chunk: { content: string; document_id: string }, i: number) =>
            `[Source ${i + 1}: ${documentMap[chunk.document_id] || "Unknown"}]\n${chunk.content}`
        )
        .join("\n\n---\n\n")
    : "";

  const customPrompt = kb.system_prompt ? `${kb.system_prompt}\n\n` : "";
  const systemPrompt = `${customPrompt}You are a helpful AI assistant for "${kb.name}".

CRITICAL RULES:
1. Answer ONLY based on the provided context from the knowledge base documents.
2. If the context does not contain enough information to answer the question, respond with: "I don't have that information in my knowledge base."
3. ALWAYS cite your sources at the end of your answer.
4. Be concise, accurate, and helpful.
5. NEVER make up information or use general knowledge.

${hasContext ? `CONTEXT:\n\n${contextString}` : "NO RELEVANT CONTEXT FOUND - Tell the user you don't have information about this."}`;

  // 7. Log the widget event
  const wasAnswered = hasContext;
  supabase.from("widget_events").insert({
    kb_id: kb.id,
    question: lastUserMessage.content,
    was_answered: wasAnswered,
  }).then(() => {}).catch((err) => console.error("Failed to log widget event:", err));

  // 8. Stream the response
  const result = streamText({
    model: groq("openai/gpt-oss-120b"),
    system: systemPrompt,
    messages: convertToCoreMessages(messages),
    abortSignal: request.signal,
    maxTokens: 1024,
  });

  const response = result.toDataStreamResponse();

  // Add CORS headers
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
