import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// DELETE /api/kb/[id]/documents/[docId] — Delete a document and its chunks
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { id, docId } = await params;
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

  // Delete the document (chunks will cascade-delete)
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", docId)
    .eq("kb_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
