-- KnowledgeBase AI — Initial Schema
-- Run this SQL in your Supabase SQL Editor to set up the database

-- Enable pgvector extension
create extension if not exists vector;

-- ============================================================
-- TABLES
-- ============================================================

-- Knowledge Bases
create table knowledge_bases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  system_prompt text default '',
  greeting_message text default 'Hello! How can I help you today?',
  widget_public_key text unique default encode(gen_random_bytes(16), 'hex'),
  widget_theme_json jsonb default '{"primaryColor":"#6366f1","position":"bottom-right","logoUrl":""}',
  created_at timestamptz default now()
);

-- Documents
create table documents (
  id uuid primary key default gen_random_uuid(),
  kb_id uuid references knowledge_bases(id) on delete cascade not null,
  filename text not null,
  source_type text not null check (source_type in ('pdf','docx','txt','url')),
  status text not null default 'processing' check (status in ('processing','ready','failed')),
  file_size integer,
  chunk_count integer default 0,
  error_message text,
  uploaded_at timestamptz default now()
);

-- Chunks (with vector embeddings)
create table chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade not null,
  kb_id uuid not null,
  content text not null,
  embedding vector(768),
  chunk_index integer not null,
  created_at timestamptz default now()
);

-- Messages (chat history)
create table messages (
  id uuid primary key default gen_random_uuid(),
  kb_id uuid references knowledge_bases(id) on delete cascade not null,
  role text not null check (role in ('user','assistant')),
  content text not null,
  cited_document_ids uuid[] default '{}',
  feedback text check (feedback in ('up','down') or feedback is null),
  created_at timestamptz default now()
);

-- Widget events (analytics)
create table widget_events (
  id uuid primary key default gen_random_uuid(),
  kb_id uuid references knowledge_bases(id) on delete cascade not null,
  question text not null,
  was_answered boolean not null default true,
  created_at timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- HNSW index for vector similarity search
create index chunks_embedding_idx on chunks
  using hnsw (embedding vector_cosine_ops);

-- Fast lookup by kb_id for retrieval isolation
create index chunks_kb_id_idx on chunks (kb_id);

-- Fast lookup for documents per KB
create index documents_kb_id_idx on documents (kb_id);

-- Fast lookup for messages per KB
create index messages_kb_id_idx on messages (kb_id);
create index messages_created_at_idx on messages (created_at);

-- Fast lookup for widget events per KB
create index widget_events_kb_id_idx on widget_events (kb_id);
create index widget_events_created_at_idx on widget_events (created_at);

-- Fast lookup for KB by public key (widget access)
create index knowledge_bases_public_key_idx on knowledge_bases (widget_public_key);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table knowledge_bases enable row level security;
alter table documents enable row level security;
alter table chunks enable row level security;
alter table messages enable row level security;
alter table widget_events enable row level security;

-- Knowledge Bases: owners can CRUD their own
create policy "Users manage own KBs"
  on knowledge_bases for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Documents: owners can CRUD docs in their own KBs
create policy "Users manage own documents"
  on documents for all
  using (kb_id in (select id from knowledge_bases where user_id = auth.uid()))
  with check (kb_id in (select id from knowledge_bases where user_id = auth.uid()));

-- Chunks: owners can read/write chunks in their own KBs
create policy "Users manage own chunks"
  on chunks for all
  using (kb_id in (select id from knowledge_bases where user_id = auth.uid()))
  with check (kb_id in (select id from knowledge_bases where user_id = auth.uid()));

-- Messages: owners can CRUD messages in their own KBs
create policy "Users manage own messages"
  on messages for all
  using (kb_id in (select id from knowledge_bases where user_id = auth.uid()))
  with check (kb_id in (select id from knowledge_bases where user_id = auth.uid()));

-- Widget events: owners can read events for their own KBs
create policy "Users view own analytics"
  on widget_events for select
  using (kb_id in (select id from knowledge_bases where user_id = auth.uid()));

-- Widget events: service role inserts (from public widget endpoint)
-- This is handled via the admin/service-role client, which bypasses RLS

-- ============================================================
-- RPC: SIMILARITY SEARCH (always filtered by kb_id)
-- ============================================================

create or replace function match_chunks(
  query_embedding vector(768),
  target_kb_id uuid,
  match_threshold float default 0.3,
  match_count int default 5
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  chunk_index int,
  similarity float
)
language sql stable
as $$
  select
    chunks.id,
    chunks.document_id,
    chunks.content,
    chunks.chunk_index,
    1 - (chunks.embedding <=> query_embedding) as similarity
  from chunks
  where chunks.kb_id = target_kb_id
    and 1 - (chunks.embedding <=> query_embedding) > match_threshold
  order by chunks.embedding <=> query_embedding
  limit match_count;
$$;
