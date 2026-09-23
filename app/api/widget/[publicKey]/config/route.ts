import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// GET /api/widget/[publicKey]/config — Returns widget config (greeting, theme, name)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ publicKey: string }> }
) {
  const { publicKey } = await params;
  const supabase = createAdminClient();

  const { data: kb, error } = await supabase
    .from("knowledge_bases")
    .select("name, greeting_message, widget_theme_json")
    .eq("widget_public_key", publicKey)
    .single();

  if (error || !kb) {
    return NextResponse.json(
      { error: "Invalid widget key" },
      { status: 404, headers: corsHeaders }
    );
  }

  return NextResponse.json(
    {
      name: kb.name,
      greeting: kb.greeting_message,
      theme: kb.widget_theme_json,
    },
    { headers: corsHeaders }
  );
}
