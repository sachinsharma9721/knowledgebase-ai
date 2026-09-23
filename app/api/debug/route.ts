import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/debug — Check if env vars and services are working
export async function GET() {
  const checks: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    node_version: process.version,
    deployment_id: process.env.VERCEL_DEPLOYMENT_ID || "local",
    code_version: "v3-inline-processing", // Change this to verify deployments
  };

  // 1. Check environment variables
  checks.env = {
    SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    JINA_API_KEY: !!process.env.JINA_API_KEY,
    JINA_API_KEY_PREFIX: process.env.JINA_API_KEY?.substring(0, 8) || "NOT SET",
    GROQ_API_KEY: !!process.env.GROQ_API_KEY,
  };

  // 2. Test Supabase Admin connection
  try {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from("knowledge_bases")
      .select("*", { count: "exact", head: true });

    checks.supabase = error
      ? { ok: false, error: error.message }
      : { ok: true, kb_count: count };
  } catch (err) {
    checks.supabase = { ok: false, error: String(err) };
  }

  // 3. Test Jina API connection
  try {
    const jinaRes = await fetch("https://api.jina.ai/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.JINA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: ["test"],
        model: "jina-embeddings-v2-base-en",
      }),
    });

    if (jinaRes.ok) {
      const data = await jinaRes.json();
      checks.jina = {
        ok: true,
        embedding_length: data.data?.[0]?.embedding?.length || 0,
      };
    } else {
      const errorText = await jinaRes.text();
      checks.jina = { ok: false, status: jinaRes.status, error: errorText };
    }
  } catch (err) {
    checks.jina = { ok: false, error: String(err) };
  }

  // 4. Test mammoth (DOCX parsing)
  try {
    const mammoth = await import("mammoth");
    checks.mammoth = { ok: true, loaded: !!mammoth };
  } catch (err) {
    checks.mammoth = { ok: false, error: String(err) };
  }

  return NextResponse.json(checks, { status: 200 });
}
