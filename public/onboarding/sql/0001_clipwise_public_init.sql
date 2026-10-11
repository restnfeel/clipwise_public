-- clipwise_public 초기 스키마 (초안)
-- 빈 Supabase 프로젝트에 한 번 적용한다. 공개판 레포에서는 supabase/migrations/0001_clipwise_public_init.sql 로 둔다.
-- 원본 sqls/* 의 아래 파일을 합치고 공개 범위 밖 테이블·컬럼·레거시 참조를 걷어냈다.
--   supabase_setup.sql(users), add_google_id.sql, add_user_deleted_status.sql, add_user_withdrawal_history.sql,
--   create_cw_connector_core.sql, create_cw_tiro_notes.sql, create_cw_sot.sql, create_cw_source_credential_events.sql,
--   create_cw_knowledge.sql, create_cw_knowledge_hub.sql, create_cw_blog_tables.sql, alter_cw_blog_posts_slugid.sql,
--   alter_cw_blog_posts_knowledge_source.sql, create_cw_agent_observability.sql,
--   create_cw_mcp_access_keys.sql, create_cw_mcp_oauth.sql
--
-- 접근 원칙: 앱은 서버에서 service_role 키로만 접근한다(next-auth 세션, Supabase Auth 미사용).
-- 모든 테이블에 RLS를 켜고 정책을 두지 않으며 anon/authenticated 권한을 회수한다.

begin;

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- 1. 사용자
-- ─────────────────────────────────────────────────────────────
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  google_id text unique,
  kakao_id text unique,
  profile_image text,
  status text not null default 'active' check (status in ('active', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_withdrawal_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text,
  email text,
  withdrawn_at timestamptz not null default now()
);

create index if not exists user_withdrawal_history_user_idx on public.user_withdrawal_history(user_id);

-- ─────────────────────────────────────────────────────────────
-- 2. workspace (사용자마다 personal-<userId> 1개, 역할 owner)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.cw_workspaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  kind text not null default 'team' check (kind in ('team', 'company', 'nonprofit')),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cw_workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.cw_workspaces(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member' check (role in ('owner', 'admin', 'editor', 'member')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index if not exists cw_workspace_memberships_user_idx on public.cw_workspace_memberships(user_id, workspace_id);

-- ─────────────────────────────────────────────────────────────
-- 3. 원본(SOT) 연결·문서
-- ─────────────────────────────────────────────────────────────
create table if not exists public.cw_source_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.cw_workspaces(id) on delete cascade,
  user_id uuid,
  provider text not null check (provider in ('tiro')),
  display_name text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'revoked', 'error')),
  scopes text[] not null default '{}',
  credentials_encrypted text,
  cursor text,
  last_synced_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, provider, user_id)
);

create table if not exists public.cw_source_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.cw_workspaces(id) on delete cascade,
  source_system text not null,
  source_connection_id uuid references public.cw_source_connections(id) on delete set null,
  source_id text not null,
  source_workspace_id text,
  source_url text,
  title text not null,
  body text not null default '',
  mime_type text not null default 'text/plain',
  captured_at timestamptz,
  source_updated_at timestamptz,
  source_revision text,
  checksum text not null,
  language text,
  status text not null default 'active' check (status in ('active', 'deleted', 'unavailable')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, source_system, source_id)
);

create table if not exists public.cw_source_revisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.cw_workspaces(id) on delete cascade,
  source_document_id uuid not null references public.cw_source_documents(id) on delete cascade,
  source_revision text,
  checksum text not null,
  title text not null,
  body text not null default '',
  raw_payload jsonb not null default '{}'::jsonb,
  captured_at timestamptz,
  created_at timestamptz not null default now(),
  unique (source_document_id, checksum)
);

create table if not exists public.cw_sync_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.cw_workspaces(id) on delete cascade,
  source_connection_id uuid references public.cw_source_connections(id) on delete set null,
  provider text not null,
  status text not null check (status in ('running', 'completed', 'partial', 'failed')),
  cursor text,
  fetched_count integer not null default 0,
  changed_count integer not null default 0,
  failed_count integer not null default 0,
  error_code text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

-- 비밀값은 저장하지 않고 SHA-256 지문만 남긴다.
create table if not exists public.cw_source_credential_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.cw_workspaces(id) on delete cascade,
  source_connection_id uuid references public.cw_source_connections(id) on delete set null,
  provider text not null,
  action text not null check (action in ('create', 'rotate', 'update_public', 'delete', 'test')),
  actor_user_id uuid,
  result text not null default 'ok' check (result in ('ok', 'failed')),
  fingerprint text,
  created_at timestamptz not null default now()
);

create index if not exists cw_source_documents_workspace_idx on public.cw_source_documents(workspace_id, source_updated_at desc nulls last);
create index if not exists cw_source_documents_provider_idx on public.cw_source_documents(workspace_id, source_system, updated_at desc);
create index if not exists cw_source_revisions_document_idx on public.cw_source_revisions(source_document_id, created_at desc);
create index if not exists cw_sync_runs_workspace_idx on public.cw_sync_runs(workspace_id, started_at desc);
create index if not exists cw_source_credential_events_ws_created_idx on public.cw_source_credential_events(workspace_id, provider, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- 4. Tiro 노트 (workspace별 원장)
--    원본은 unique(source_system, source_id, source_workspace_id)라 두 사용자가 같은 Tiro workspace를
--    동기화하면 서로 덮어쓴다. 공개판은 workspace_id를 키에 넣는다.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.cw_tiro_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.cw_workspaces(id) on delete cascade,
  source_system text not null default 'tiro',
  source_id text not null,
  source_workspace_id text not null,
  title text not null,
  content text not null default '',
  summary text,
  source_updated_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cw_tiro_notes_source_key unique (workspace_id, source_system, source_id, source_workspace_id)
);

create index if not exists cw_tiro_notes_workspace_id_idx on public.cw_tiro_notes(workspace_id, source_updated_at desc nulls last);

-- ─────────────────────────────────────────────────────────────
-- 5. 지식함
-- ─────────────────────────────────────────────────────────────
create table if not exists public.cw_knowledge_categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.cw_workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  name_key text not null,
  description text check (description is null or char_length(description) <= 300),
  color text not null,
  origin text not null check (origin in ('user', 'ai')),
  sort_order int not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name_key)
);

create table if not exists public.cw_knowledge_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.cw_workspaces(id) on delete cascade,
  source_system text not null default 'tiro',
  source_id text not null,
  source_note_id uuid references public.cw_tiro_notes(id) on delete set null,
  source_document_id uuid references public.cw_source_documents(id) on delete set null,
  source_revision text,
  type text not null default 'meeting' check (type in ('meeting', 'document', 'transcript', 'insight', 'blog')),
  title text not null,
  body text not null default '',
  summary text,
  topics text[] not null default '{}',
  entities jsonb not null default '[]'::jsonb,
  decisions text[] not null default '{}',
  action_items jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('processing', 'draft', 'reviewed', 'published', 'failed')),
  visibility text not null default 'private' check (visibility in ('private', 'workspace', 'public')),
  source_updated_at timestamptz,
  created_by uuid,
  model text,
  prompt_version text,
  generated_at timestamptz,
  category_id uuid references public.cw_knowledge_categories(id) on delete set null,
  category_source text check (category_source in ('user', 'ai')),
  category_confidence numeric,
  topics_source text check (topics_source in ('user', 'ai')),
  ai_enriched_at timestamptz,
  ai_model text,
  ai_prompt_version text,
  ai_signals jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, source_system, source_id, type)
);

create table if not exists public.cw_knowledge_item_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.cw_workspaces(id) on delete cascade,
  knowledge_item_id uuid not null references public.cw_knowledge_items(id) on delete cascade,
  action text not null,
  actor_user_id uuid,
  source text not null default 'web',
  from_status text,
  to_status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.cw_knowledge_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.cw_workspaces(id) on delete cascade,
  from_item_id uuid not null references public.cw_knowledge_items(id) on delete cascade,
  to_item_id uuid not null references public.cw_knowledge_items(id) on delete cascade,
  origin text not null check (origin in ('user', 'ai')),
  status text not null check (status in ('suggested', 'accepted', 'rejected')),
  reason text check (reason is null or char_length(reason) <= 300),
  confidence numeric,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, from_item_id, to_item_id),
  check (from_item_id < to_item_id)
);

create index if not exists cw_knowledge_items_workspace_status_idx on public.cw_knowledge_items(workspace_id, status, updated_at desc);
create index if not exists cw_knowledge_items_source_note_idx on public.cw_knowledge_items(source_note_id);
create index if not exists cw_knowledge_items_source_document_idx on public.cw_knowledge_items(source_document_id);
create index if not exists cw_knowledge_items_category_idx on public.cw_knowledge_items(workspace_id, category_id);
create index if not exists cw_knowledge_items_topics_idx on public.cw_knowledge_items using gin (topics);
create index if not exists cw_knowledge_item_events_item_idx on public.cw_knowledge_item_events(knowledge_item_id, created_at desc);
create index if not exists cw_knowledge_links_status_idx on public.cw_knowledge_links(workspace_id, status);
create index if not exists cw_knowledge_links_to_idx on public.cw_knowledge_links(to_item_id);

-- ─────────────────────────────────────────────────────────────
-- 6. 지식 아카이브 (지식 1건 ↔ 글 1건)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.cw_blog_posts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.cw_workspaces(id) on delete cascade,
  source_knowledge_item_id uuid references public.cw_knowledge_items(id) on delete set null,
  title text not null,
  slug text not null unique,
  slugid text not null unique default (gen_random_uuid()::text),
  content text not null,
  excerpt text,
  category text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists cw_blog_posts_source_knowledge_item_idx on public.cw_blog_posts(source_knowledge_item_id) where source_knowledge_item_id is not null;
create index if not exists cw_blog_posts_workspace_id_idx on public.cw_blog_posts(workspace_id, created_at desc);
create index if not exists cw_blog_posts_status_published_idx on public.cw_blog_posts(status, published_at desc);

-- ─────────────────────────────────────────────────────────────
-- 7. 에이전트 활동 (원문 대화·비밀값 저장 금지, 메타데이터만)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.cw_agent_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.cw_workspaces(id) on delete cascade,
  user_id uuid,
  agent_name text not null default 'customer-agent',
  task_type text not null default 'question',
  input_summary text,
  tool_names text[] not null default '{}',
  source_ids uuid[] not null default '{}',
  status text not null default 'started' check (status in ('started', 'completed', 'failed', 'cancelled')),
  result_summary text,
  error_code text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_ms integer,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.cw_agent_feedback (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.cw_workspaces(id) on delete cascade,
  run_id uuid references public.cw_agent_runs(id) on delete set null,
  user_id uuid,
  rating text not null check (rating in ('good', 'needs_improvement', 'incorrect', 'missing_source')),
  comment text,
  source_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.cw_agent_improvement_candidates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.cw_workspaces(id) on delete cascade,
  run_id uuid references public.cw_agent_runs(id) on delete set null,
  feedback_id uuid references public.cw_agent_feedback(id) on delete set null,
  instruction text not null,
  reason text,
  source_ids uuid[] not null default '{}',
  status text not null default 'proposed' check (status in ('proposed', 'approved', 'rejected', 'archived')),
  created_by uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists cw_agent_runs_workspace_idx on public.cw_agent_runs(workspace_id, started_at desc);
create index if not exists cw_agent_feedback_workspace_idx on public.cw_agent_feedback(workspace_id, created_at desc);
create index if not exists cw_agent_improvement_candidates_workspace_idx on public.cw_agent_improvement_candidates(workspace_id, status, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- 8. MCP 인증키·OAuth (토큰은 해시만 저장)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.cw_mcp_access_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  key_hash text not null unique,
  key_prefix text not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create table if not exists public.cw_mcp_oauth_clients (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  redirect_uris text[] not null,
  expires_at timestamptz not null default (now() + interval '1 year'),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.cw_mcp_oauth_codes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  client_id uuid not null references public.cw_mcp_oauth_clients(id) on delete cascade,
  code_hash text not null unique,
  redirect_uri text not null,
  code_challenge text not null,
  resource text not null,
  scopes text[] not null default array['mcp:read']::text[],
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.cw_mcp_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  client_id uuid not null references public.cw_mcp_oauth_clients(id) on delete cascade,
  access_token_hash text not null unique,
  refresh_token_hash text not null unique,
  resource text not null,
  scopes text[] not null default array['mcp:read']::text[],
  access_expires_at timestamptz not null,
  refresh_expires_at timestamptz not null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists cw_mcp_access_keys_user_idx on public.cw_mcp_access_keys(user_id, created_at desc);
create index if not exists cw_mcp_sessions_user_idx on public.cw_mcp_sessions(user_id, created_at desc);

create or replace function public.consume_cw_mcp_oauth_code(p_code_hash text)
returns table(user_id text, client_id uuid, redirect_uri text, code_challenge text, resource text, scopes text[])
language sql security definer set search_path = public
as $$
  update public.cw_mcp_oauth_codes
     set consumed_at = now()
   where code_hash = p_code_hash
     and consumed_at is null
     and expires_at > now()
  returning user_id, client_id, redirect_uri, code_challenge, resource, scopes;
$$;

create or replace function public.rotate_cw_mcp_refresh_token(
  p_client_id uuid,
  p_refresh_hash text,
  p_access_hash text,
  p_next_refresh_hash text,
  p_access_expires_at timestamptz,
  p_refresh_expires_at timestamptz
)
returns table(id uuid, user_id text, client_id uuid, resource text, scopes text[])
language sql security definer set search_path = public
as $$
  update public.cw_mcp_sessions
     set access_token_hash = p_access_hash,
         refresh_token_hash = p_next_refresh_hash,
         access_expires_at = p_access_expires_at,
         refresh_expires_at = p_refresh_expires_at,
         last_used_at = now()
   where client_id = p_client_id
     and refresh_token_hash = p_refresh_hash
     and revoked_at is null
     and refresh_expires_at > now()
  returning id, user_id, client_id, resource, scopes;
$$;

revoke all on function public.consume_cw_mcp_oauth_code(text) from public, anon, authenticated;
revoke all on function public.rotate_cw_mcp_refresh_token(uuid, text, text, text, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.consume_cw_mcp_oauth_code(text) to service_role;
grant execute on function public.rotate_cw_mcp_refresh_token(uuid, text, text, text, timestamptz, timestamptz) to service_role;

-- ─────────────────────────────────────────────────────────────
-- 9. RLS·권한: service_role 전용
-- ─────────────────────────────────────────────────────────────
do $$
declare
  t text;
begin
  foreach t in array array[
    'users', 'user_withdrawal_history',
    'cw_workspaces', 'cw_workspace_memberships',
    'cw_source_connections', 'cw_source_documents', 'cw_source_revisions', 'cw_sync_runs', 'cw_source_credential_events',
    'cw_tiro_notes',
    'cw_knowledge_categories', 'cw_knowledge_items', 'cw_knowledge_item_events', 'cw_knowledge_links',
    'cw_blog_posts',
    'cw_agent_runs', 'cw_agent_feedback', 'cw_agent_improvement_candidates',
    'cw_mcp_access_keys', 'cw_mcp_oauth_clients', 'cw_mcp_oauth_codes', 'cw_mcp_sessions'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;

commit;
