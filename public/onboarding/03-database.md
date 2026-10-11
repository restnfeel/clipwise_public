# 03. 데이터베이스

공개판 스키마는 [sql/0001_clipwise_public_init.sql](./sql/0001_clipwise_public_init.sql) 한 파일이다. 빈 Supabase 프로젝트의 SQL Editor에서 한 번 실행하거나 `supabase db push`로 적용한다.

검증(2026-10-11): PGlite(메모리 Postgres)에 `anon`, `authenticated`, `service_role` 역할을 만든 뒤 적용 → 테이블 22개, RPC 2개, RLS 22개 확인. 같은 파일을 한 번 더 실행해도 오류 없음. PGlite에는 `pgcrypto` 확장이 없어 그 한 줄만 빼고 실행했다(Supabase에는 기본 제공).

## 1. 접근 방식

- 앱은 next-auth 세션으로 사용자를 확인하고, DB는 서버에서 `SUPABASE_SERVICE_ROLE_KEY`로만 접근한다. Supabase Auth와 브라우저 직접 조회는 쓰지 않는다.
- 모든 테이블: RLS 켜기, 정책 없음, `anon`/`authenticated` 권한 회수, `service_role`만 허용.
- 따라서 **범위 필터는 전부 서버 코드 책임**이다. 모든 조회·수정에 `workspace_id in (본인 workspace)` 또는 `user_id = 본인`을 붙인다(05 문서 2절 점검 목록).

## 2. 테이블 목록 (22개, RPC 2개)

| 영역 | 테이블 | 쓰는 기능 | 원본 SQL |
|---|---|---|---|
| 사용자 | `users` | 로그인, 내 정보 | `supabase_setup.sql` + alter 6개 |
| | `user_withdrawal_history` | 탈퇴 | `add_user_withdrawal_history.sql` |
| workspace | `cw_workspaces`, `cw_workspace_memberships` | 전체 | `create_cw_connector_core.sql` |
| 원본 | `cw_source_connections` | Tiro 키 (암호화) | `create_cw_sot.sql` |
| | `cw_source_documents`, `cw_source_revisions`, `cw_sync_runs` | Tiro 동기화 원장 | `create_cw_sot.sql` |
| | `cw_source_credential_events` | 키 변경 감사 로그 | `create_cw_source_credential_events.sql` |
| | `cw_tiro_notes` | Tiro 노트 | `create_cw_tiro_notes.sql` |
| 지식 | `cw_knowledge_items`, `cw_knowledge_item_events` | 지식함 | `create_cw_knowledge.sql` (+ hub, sot alter) |
| | `cw_knowledge_categories`, `cw_knowledge_links` | 분류·연결 | `create_cw_knowledge_hub.sql` |
| 아카이브 | `cw_blog_posts` | 지식 아카이브 | `create_cw_blog_tables.sql` + alter 2개 |
| 에이전트 | `cw_agent_runs`, `cw_agent_feedback`, `cw_agent_improvement_candidates` | 에이전트 활동 | `create_cw_agent_observability.sql` |
| MCP | `cw_mcp_access_keys` | MCP 토큰 관리 | `create_cw_mcp_access_keys.sql` |
| | `cw_mcp_oauth_clients`, `cw_mcp_oauth_codes`, `cw_mcp_sessions` | MCP OAuth | `create_cw_mcp_oauth.sql` |
| RPC | `consume_cw_mcp_oauth_code`, `rotate_cw_mcp_refresh_token` | OAuth 코드 소비, 토큰 회전 | `create_cw_mcp_oauth.sql` |

## 3. 원본 SQL과 다른 점 (반드시 코드도 맞춰야 함)

| 번호 | 대상 | 원본 | 공개판 | 코드 변경 |
|---|---|---|---|---|
| S1 | 적용 순서 | `create_cw_connector_core.sql`이 `cw_tiro_notes`를 `if exists` 없이 alter → 빈 DB에서 실패. `create_cw_sot.sql`이 `cw_knowledge_items`를 alter | 한 파일 안에서 참조 순서대로 생성, alter 없음 | 없음 |
| S2 | `cw_tiro_notes` 고유키 | `(source_system, source_id, source_workspace_id)` — 두 사용자가 같은 Tiro workspace를 동기화하면 서로 덮어씀 | `(workspace_id, source_system, source_id, source_workspace_id)`, `workspace_id not null` | `lib/tiro/clipwise-tiro.ts` upsert `onConflict`를 `"workspace_id,source_system,source_id,source_workspace_id"`로 |
| S3 | `users` 역할 컬럼 | `role`, `user_type`, `app_role` | 없음 (D7) | `auth-options.ts`의 jwt 콜백, `types/next-auth.d.ts`, `workspace-scope.ts`, `workspace-settings.ts`에서 참조 제거 |
| S4 | `users.status` | `pending`(가입 기본), `active`, `paused`, `deleted` | `active`(기본), `deleted` | `auth-options.ts` 신규 가입 insert를 `status: "active"`로. `deleted`면 로그인 거부 |
| S5 | `users.image` | 코드가 `profile_image,image`를 select | `profile_image`만 | `workspace-settings.ts:46` select 수정 |
| S6 | `cw_blog_posts.knowledge_base_id` | 레거시 `knowledge_bases` FK | 컬럼 없음 | 없음 (공개판 코드에 사용처 없음) |
| S7 | `cw_blog_post_status_history` | 관리자·AgentC 상태 이력 | 테이블 없음 | `lib/blog/status-history.ts` 제외 |
| S8 | `cw_blog_posts.workspace_id` | `on delete cascade` (alter로 추가) | 동일, 생성 시 포함 | 없음 |
| S9 | `cw_source_connections.provider` | 제한 없음 | `check (provider in ('tiro'))` | 다른 공급자 추가 시 check 수정 |
| S10 | `cw_knowledge_items.type` | `sermon` 포함 | `sermon` 제거 | 없음 (공개판 코드에 사용처 없음) |
| S11 | `cw_workspaces.kind` | `church` 포함 | `church` 제거 | 없음 (`team`만 생성) |
| S12 | `cw_workspaces.cover_url` | Bunny 표지 | 컬럼 없음 | `workspace/route.ts`, `workspace-settings.ts`, `WorkspaceCover`에서 `cover_url` 제거 |
| S13 | uuid 함수 | `uuid-ossp`의 `uuid_generate_v4()` 혼용 | `pgcrypto`의 `gen_random_uuid()`로 통일 | 없음 |
| S14 | `cw_mcp_sessions` 인덱스 | 해시 인덱스만 | `user_id` 인덱스 추가 (본인 세션 목록·탈퇴 시 폐기) | 없음 |

## 4. 가져가지 않는 테이블

`api_keys`, `service_applications`, `app_settings`, `knowledge_bases`, `knowledge_base_videos`, `youtube_data`, `youtube_channels`, `sermon_items`, `cw_contact_inquiries`, `cw_subscription_requests`, `cw_workspace_branding`, `cw_workspace_settings`, `cw_source_provider_settings`, `cw_user_tiro_credentials`, `cw_user_tiro_notes`, `cw_newsletter_drafts`, `cw_mcp_email_history`, `cw_blog_post_status_history`, `cw_agent_schedules`, `cw_agent_reports`, `cw_agent_report_events`, `cw_public_sites`, `cw_public_pages`, `cw_geo_audits`, ESTC·class·dream 관련 테이블 전부.

## 5. 기능별 주요 쿼리 (공개판 기준)

모든 쿼리는 `supabaseAdmin`(service_role)으로 서버에서만 실행한다. `:ws`는 `workspaceIdsForUser(userId)` 결과다.

```sql
-- 개인 workspace 확인·생성 (lib/connector/workspace-scope.ts)
select workspace_id from cw_workspace_memberships where user_id = :userId;
insert into cw_workspaces (slug, name, kind, created_by) values ('personal-' || :userId, :name, 'team', :userId) returning id;
insert into cw_workspace_memberships (workspace_id, user_id, role) values (:wsId, :userId, 'owner');

-- Tiro 키 조회 (lib/sot/credentials.ts) — 복호화는 서버에서만
select id, credentials_encrypted, metadata from cw_source_connections
 where workspace_id = :wsId and provider = 'tiro' and user_id = :userId;

-- Tiro 노트 저장 (lib/tiro/clipwise-tiro.ts)
insert into cw_tiro_notes (workspace_id, source_system, source_id, source_workspace_id, title, content, summary, source_updated_at, raw_payload, synced_at)
values (...)
on conflict (workspace_id, source_system, source_id, source_workspace_id) do update set ...;

-- 지식 목록 (lib/knowledge/knowledge-service.ts)
select ... from cw_knowledge_items where workspace_id = any(:ws) order by updated_at desc limit :n;

-- 아카이브 공개 목록 (lib/blog/workspace-archive.ts)
select id, slugid, title, excerpt, category, published_at, workspace_id from cw_blog_posts
 where status = 'published' order by published_at desc;

-- 에이전트 활동 (app/api/agent/runs/route.ts)
select ... from cw_agent_runs where workspace_id = any(:ws) order by started_at desc limit 100;

-- MCP 내 인증키 (app/api/mcp/keys/route.ts)
select id, key_prefix, created_at, last_used_at, revoked_at from cw_mcp_access_keys
 where user_id = :userId order by created_at desc;
update cw_mcp_access_keys set revoked_at = now() where id = :id and user_id = :userId;

-- 탈퇴 (app/api/user/withdraw/route.ts) — 순서대로
insert into user_withdrawal_history (user_id, name, email) values (...);
update cw_mcp_access_keys set revoked_at = now() where user_id = :userId and revoked_at is null;
update cw_mcp_sessions set revoked_at = now() where user_id = :userId::text and revoked_at is null;
delete from cw_workspaces where id in (select workspace_id from cw_workspace_memberships where user_id = :userId and role = 'owner');
update users set status = 'deleted', updated_at = now() where id = :userId;
```

주의: `cw_mcp_oauth_codes.user_id`, `cw_mcp_sessions.user_id`는 `text`지만 값은 `users.id` UUID 문자열이다. 원본 `app/api/mcp/oauth/authorize/route.ts`의 `resolveClipwiseUserId`가 세션의 공급자 id(`google_id`/`kakao_id`)를 `users.id`로 바꿔 넣는다. 공개판도 이 규칙을 유지하고, 탈퇴 시 세션 폐기는 `user_id = users.id::text`로 한다.

## 6. 원본 운영 DB에서 데이터를 옮기는 경우

공개판은 새 설치가 기본이다. 원본 Clipwise 데이터를 옮기는 기능은 만들지 않는다. 필요하면 별도 문서로 다룬다.
