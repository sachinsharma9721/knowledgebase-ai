import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/kb/[id]/analytics — Analytics for a KB
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

  // Get top questions (most frequently asked)
  const { data: topQuestions } = await supabase
    .from("widget_events")
    .select("question, was_answered, created_at")
    .eq("kb_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Get unanswered questions
  const { data: unansweredQuestions } = await supabase
    .from("widget_events")
    .select("question, created_at")
    .eq("kb_id", id)
    .eq("was_answered", false)
    .order("created_at", { ascending: false })
    .limit(20);

  // Get message count by day (last 30 days)
  const { data: messages } = await supabase
    .from("messages")
    .select("created_at")
    .eq("kb_id", id)
    .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: true });

  // Group messages by day
  const dailyCounts: Record<string, number> = {};
  messages?.forEach((msg) => {
    const day = new Date(msg.created_at).toISOString().split("T")[0];
    dailyCounts[day] = (dailyCounts[day] || 0) + 1;
  });

  // Deduplicate top questions by text similarity (simple approach)
  const questionCounts: Record<string, number> = {};
  topQuestions?.forEach((q) => {
    const normalized = q.question.toLowerCase().trim();
    questionCounts[normalized] = (questionCounts[normalized] || 0) + 1;
  });

  const sortedQuestions = Object.entries(questionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([question, count]) => ({ question, count }));

  return NextResponse.json({
    topQuestions: sortedQuestions,
    unansweredQuestions: unansweredQuestions || [],
    dailyVolume: dailyCounts,
    totalMessages: messages?.length || 0,
    totalEvents: topQuestions?.length || 0,
  });
}
