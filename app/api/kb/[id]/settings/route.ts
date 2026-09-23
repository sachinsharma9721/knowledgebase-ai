import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// PATCH /api/kb/[id]/settings — Update KB settings
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const allowedFields = ["system_prompt", "greeting_message", "widget_theme_json", "name"];
  const updates: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("knowledge_bases")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/kb/[id]/settings — Regenerate widget public key
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

  const body = await request.json();

  if (body.action !== "regenerate_key") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // Generate new key via raw SQL since we need gen_random_bytes
  const { data } = await supabase.rpc("gen_random_uuid");
  const newKey = data ? String(data).replace(/-/g, "").slice(0, 32) : crypto.randomUUID().replace(/-/g, "");

  const { data: updated, error: updateError } = await supabase
    .from("knowledge_bases")
    .update({ widget_public_key: newKey })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(updated);
}
