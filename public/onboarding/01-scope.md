# 01. 기능 범위와 동작

공개판의 화면, API, 권한 동작을 기능별로 정리한다. 경로는 공개판 기준이고, 괄호 안은 원본 레포의 현재 위치다.

## 1. 공통: 사용자·workspace 모델

- 로그인 = `users` 행 1개. 첫 로그인 때 자동 생성한다(가입 화면 없음).
- 사용자마다 개인 workspace 1개(`cw_workspaces.slug = 'personal-<userId>'`), 멤버십 역할은 `owner`.
  - 생성 시점: 첫 API 호출 때 `workspaceIdsForUser(userId)`가 없으면 만든다(원본 `lib/connector/workspace-scope.ts`의 `ensurePersonalWorkspace`).
- 모든 데이터 테이블은 `workspace_id`로 나뉜다. API는 세션 사용자의 workspace id 목록으로만 필터한다.
- 관리자, 데모 workspace(`clipwise-demo`), `CLIPWISE_DEFAULT_WORKSPACE_ID`, "가장 오래된 workspace" 폴백은 없다.
- `owner`는 검수 역할이므로 지식 상태 변경·분류·아카이브 공개를 본인이 할 수 있다.

## 2. 메뉴 (`components/cw/CwMobileNav.tsx`)

로그인 전: `지식 아카이브`만.
로그인 후 (그룹 순서대로):

```text
[기본]   대시보드 /dashboard
         지식함   /dashboard/knowledge
[서비스] 지식 아카이브 /blog
         내 정보       /dashboard/profile
         에이전트 활동 /dashboard/agent
[연결]   원본 모으기   /dashboard/sources
         MCP 토큰 관리 /dashboard/mcp
──────
로그아웃 (CwAuthNav)
```

제거: `ADMIN_GROUP`, `SYSTEM_ADMIN_GROUP`, `TRIAL_ADMIN_GROUP`, `MEMBER_ADMIN_GROUP`, 구독 요청 CTA, `/api/cw/subscription-requests` 조회, `isAdmin` 판정.
브랜드 이름·로고는 `CwBrandingProvider`의 DB 조회 대신 환경 변수(`NEXT_PUBLIC_BRAND_NAME`, `NEXT_PUBLIC_BRAND_LOGO_URL`)와 기본값을 쓴다.

## 3. 대시보드 `/dashboard`

- 화면: `app/dashboard/page.tsx`
- 데이터: `GET /api/knowledge?limit=100` 하나. 지식 수·상태 통계, 최근 지식, "원본 → 지식 → MCP" 3단계 안내.
- 제거: `GET /api/workspace/onboarding` 호출(관리자 전용, 일반 사용자는 항상 403)과 `/onboarding` 이동 로직.
- 링크 정리: `/dashboard/tiro` → `/dashboard/sources`.

## 4. 지식함 `/dashboard/knowledge`

화면: `app/dashboard/knowledge/page.tsx` → `components/knowledge/KnowledgeHubSection.tsx`, `KnowledgeWorkspaceCard.tsx`, `components/knowledge/hub/*`.

| 기능 | API | 권한 |
|---|---|---|
| 목록·검색·상태·분류·태그 필터 | `GET /api/knowledge` | 로그인 |
| 상세·수정·상태 변경·삭제 | `GET/PATCH/DELETE /api/knowledge/[id]` | owner |
| 분류 관리 (추가·이름 변경·병합·삭제) | `/api/knowledge/categories`, `[id]`, `[id]/merge`, `/api/knowledge/bulk-category` | owner |
| 지식 연결 (제안 수락·거절·직접 연결) | `/api/knowledge/[id]/links`, `/api/knowledge/links`, `[id]` | owner |
| 그래프 보기 | `GET /api/knowledge/graph` | 로그인 |
| 아카이브 공개·내리기 | `POST/DELETE /api/knowledge/[id]/archive` | owner |
| AI 자동 정리 (분류·태그·연결 제안) | `POST /api/knowledge/[id]/enrich`, `/api/knowledge/enrich/batch` | owner, **AI 키가 있을 때만** |
| workspace 이름 변경 | `GET/PATCH /api/workspace` | owner |

제외:
- 메일리·노션 초안 섹션(`KnowledgeDraftSection`, `Newsletter*`, `Notion*`)과 `/api/newsletter-drafts`, `/api/notion-drafts`.
- 표지 이미지 업로드(`/api/workspace/cover`, Bunny CDN). `WorkspaceCover`는 이미지 없이 기본 배경만 그린다.

AI 자동 정리:
- 원본은 `lib/estc/llm-agents.ts`의 `chatCompletion`, `pickNewsletterAgent`, `parseAgentJson`과 JEV를 쓴다.
- 공개판은 `lib/llm/chat.ts` 하나로 바꾼다. `OPENROUTER_API_KEY`가 있으면 OpenRouter, 없고 `OPENAI_API_KEY`가 있으면 OpenAI 규격 엔드포인트, 둘 다 없으면 `null`을 반환하고 정리를 건너뛴다.
- JEV 평가(분류 판정 보조)는 제거하고 모델 응답만으로 판정한다.
- AI 키가 없을 때 화면의 "AI 정리" 버튼은 숨기고, API는 `503 AI_DISABLED`("AI 정리 키가 설정되지 않았습니다.")를 반환한다.

## 5. 지식 아카이브 `/blog`

- 목록 `/blog`: 모든 workspace의 `published` 글을 최신순으로(서버 컴포넌트가 Supabase 직접 조회, `lib/blog/workspace-archive.ts`).
- workspace별 목록 `/blog/workspace/[id]`.
- 상세 `/blog/[slug]`: `slugid`로 조회.
  - 원본은 자기 서버의 `/api/blog/posts/[slug]`를 HTTP로 부르고, `NEXT_PUBLIC_APP_URL`이 없으면 `https://clipwise.kr`로 요청한다. 공개판은 `lib/blog/workspace-archive.ts`에 `getPublishedPost(slugid)`를 추가해 서버 컴포넌트에서 직접 읽고, `/api/blog/posts/[slug]` 라우트는 없앤다.
  - 관리자 미리보기(`?preview=1`)와 비공개 글 열람 분기를 없앤다. 공개판 상세는 `status = 'published'`만 보여 준다.
  - 레거시 영상 메타데이터(`knowledge_base_videos`, `youtube_data`)와 YouTube 저작권 안내 문구를 없앤다.
- 글이 들어오는 경로는 하나다: 지식함 상세 드로워의 "아카이브에 공개" → `POST /api/knowledge/[id]/archive` → `lib/knowledge/archive/archive-server.ts`가 `cw_blog_posts`에 `published`로 기록.
  - 지식이 수정되면 연결된 글을 갱신하고, 지식이 삭제되거나 `published`가 아니게 되면 글을 내린다(`syncKnowledgeArchive`).

## 6. 내 정보 `/dashboard/profile`

- 화면: `app/dashboard/profile/page.tsx` → `components/cw/CwProfileSection.tsx`
- API:
  - `GET /api/user/profile`: 본인 `users` 행에서 `id, email, name, profile_image, created_at`만 반환.
  - `PUT /api/user/profile`: `name`만 수정.
  - `POST /api/user/withdraw`: 탈퇴. `user_withdrawal_history` 기록 → `users.status = 'deleted'` → 개인 workspace 데이터 삭제(아래 참고) → `signOut`.
- 제거: `CwLinkedInConnection`, `youtube_channel_id` 처리와 `youtube_channels` 폴백, 관리자 메일 알림(`notifyAdminUserEvent`).
- 탈퇴 시 데이터 처리 (공개판에서 새로 정함):
  - 개인 workspace를 삭제하면 `on delete cascade`로 지식·원본·연결·실행 기록·아카이브 글 연결이 함께 지워진다.
  - MCP 접근 키·세션을 모두 폐기(`revoked_at = now()`)한다.
  - 탈퇴한 사용자는 다시 로그인할 수 없다(`signIn` 콜백에서 `status = 'deleted'` 차단). 원본에는 이 차단이 없다.

## 7. 에이전트 활동 `/dashboard/agent`

- 화면: `app/dashboard/agent/page.tsx` → `components/dashboard/AgentActivitySection.tsx` (AG Grid, 첫 컬럼 클릭 → 우측 드로워)
- API: `GET /api/agent/runs`(본인 workspace 실행 기록), `POST /api/agent/runs`(평가: good / needs_improvement / incorrect / missing_source)
- 데이터를 만드는 곳: MCP 서버만.
  - 명시 기록 도구: `agent_run_start`, `agent_run_complete`, `agent_feedback`, `agent_improvement_candidates`, `context_pack`
  - 자동 기록: MCP 도구 호출 후 `after()`에서 규칙으로 판정해 쓰기 도구·오류 호출만 `cw_agent_runs`에 남긴다(D5). JEV 판정, 개인정보 판정, JEV 속도 제한 코드는 없앤다.
- 개선 후보(`cw_agent_improvement_candidates`)는 평가가 `good`이 아니면 `proposed`로 쌓인다. 승인·반려 화면(관리자 "에이전트 품질")은 없으므로 `context_pack`은 후보를 쓰지 않는다. 승인 기능이 생기기 전까지 후보는 기록만 한다.

## 8. 원본 모으기 `/dashboard/sources` (Tiro만)

원본의 `/dashboard/sources`(공급자 카드 목록)와 `/dashboard/tiro`(Tiro 관리)를 한 화면으로 합친다. `/dashboard/tiro`는 `/dashboard/sources`로 리디렉트한다.

화면 구성 (위에서 아래로):
1. Tiro 연결 카드: 연결 상태, API 키·Workspace GUID 입력/교체/삭제, 연결 테스트.
2. Tiro 노트 목록: 동기화 버튼(사람이 누를 때만), 노트 목록(AG Grid), 첫 컬럼 클릭 → 우측 드로워(원문·요약), 드로워 하단 "지식으로 만들기".
3. 선택 노트 일괄 지식화.

| 기능 | 공개판 API | 원본 위치 | 변경 |
|---|---|---|---|
| 연결 상태 | `GET /api/sot/credentials` | 동일 | Tiro만 반환 |
| 키 저장·교체·삭제 | `PUT/DELETE /api/sot/credentials/tiro` | `/api/sot/credentials/[provider]` | Tiro를 사용자 범위(`credentialScope: "user"`)로 변경 |
| 연결 테스트 | `POST /api/sot/credentials/tiro/test` | `/api/sot/credentials/[provider]/test` | 동일 |
| 노트 목록·동기화 | `GET/POST /api/tiro/notes` | `/api/admin/tiro/notes` (`requireAdmin`) | 사용자 범위로 이동 |
| 노트 1건 지식화 | `POST /api/tiro/notes/knowledgeize?noteId=` | `/api/admin/tiro/notes/knowledgeize` (`requireAdmin`) | 사용자 범위로 이동 |
| 일괄 지식화 | `POST /api/knowledge/batch` | 동일 | 그대로 |
| 원본 문서 목록·제외 | `GET/PATCH /api/sot/documents` | 동일 | 관리자 판정 제거 |

동작 규칙:
- 키는 본인 개인 workspace의 `cw_source_connections`(`provider='tiro'`, `user_id=본인`)에 AES-256-GCM으로 암호화 저장한다. 응답에는 비밀값을 넣지 않는다(공개 값·지문만).
- 동기화는 본인 키로 본인 workspace에만 쓴다(`cw_tiro_notes.workspace_id`, `cw_source_documents`).
- Tiro는 읽기 전용이다. Tiro로 쓰는 호출은 없다.
- 지식화는 규칙 기반 추출(`extractKnowledge`) 후 `draft` 상태로 저장하고, AI 키가 있으면 자동 정리를 예약한다.

제거:
- 체험 경로: `TiroTrialCredentialSection`, `/api/user/tiro/credential`, `/api/user/tiro/test`, `lib/tiro/personal-tiro.ts`, 테이블 `cw_user_tiro_credentials`, `cw_user_tiro_notes`.
- 관리자 경로: `/api/admin/sot/credentials/**`, `/api/admin/source-providers`, 공급자 활성/비활성 토글(`provider-visibility*`, `cw_source_provider_settings`), Coming Soon 카드.
- 다른 공급자: Plaud, Notion, Slack, Telegram, Maily와 OAuth 연결, Telegram 웹훅, 범용 동기화(`registry.ts`, `sync-runner.ts`, `/api/sot/providers/[provider]/sync`), `/dashboard/sources/[provider]`.
- 환경 변수 폴백(`TIRO_API_KEY`, `TIRO_WORKSPACE_GUID`, `SOT_ENV_FALLBACK`).

## 9. MCP 토큰 관리 `/dashboard/mcp` (본인만)

화면: `app/dashboard/mcp/page.tsx` → `components/dashboard/McpTokenSection.tsx` (원본 `McpTokenAdminSection.tsx`에서 관리자 UI 제거).

화면 구성:
1. MCP 주소: `${MCP_PUBLIC_BASE_URL}/api/mcp` 표시·복사.
2. 설정 JSON 붙여 넣기 양식: 원격 MCP(URL만) / Claude Desktop(`npx mcp-remote <URL>`) 탭, 복사 버튼. 토큰은 파일에 넣지 않고 인증 화면에서 입력한다는 안내.
3. 내 인증키 목록: 접두사, 만든 날, 마지막 사용, 상태. 행마다 폐기(ConfirmDialog).
4. 새 인증키 발급: 발급 직후 "방금 발급한 토큰" 상자에 원문 1회 표시 + 복사. 다시 볼 수 없다.
5. 연결된 MCP 세션 목록(선택): 클라이언트 이름, 마지막 사용, 세션 폐기.

| 기능 | 공개판 API | 원본 | 변경 |
|---|---|---|---|
| 내 키 목록 | `GET /api/mcp/keys` | `GET /api/admin/mcp/keys` | 항상 `user_id = 본인` 필터, `users` 전체·메일 이력 조회 제거 |
| 발급 | `POST /api/mcp/keys` | `POST /api/admin/mcp/keys` | `body.userId` 무시, 본인 고정, 메일 발송 제거 |
| 폐기 | `DELETE /api/mcp/keys?id=` | `DELETE /api/admin/mcp/keys` | `user_id = 본인` 조건 추가 |
| 인증키 확인 (인가 화면) | `POST /api/mcp/key/verify` | 동일 | 그대로 |

MCP 서버(`/api/mcp`)와 OAuth:
- 인증은 OAuth 2.1 + PKCE 액세스 토큰만 받는다. 고정 토큰(`AGENTC_WEB_CONNECTOR_TOKEN`) 분기는 없앤다(05 문서 2.1).
- 인증키(`cw_mcp_...`)는 `/mcp-auth` 화면에서 OAuth 인가를 승인하는 데만 쓴다. `/api/mcp`에 Bearer로 보내도 통과하지 않는다.
- 공개 URL은 `MCP_PUBLIC_BASE_URL`(필수)로만 만든다. 원본의 `https://clipwise.kr` 강제 값은 없앤다.
- 남기는 도구:

| 분류 | 도구 |
|---|---|
| Tiro | `tiro_context`, `tiro_search`, `tiro_connection_status`, `tiro_sync`(approved 필수) |
| 지식 | `knowledge_context`, `knowledge_search`, `knowledge_categories`, `knowledge_preview`, `knowledge_apply`(approved 필수), `document_analysis_save` |
| 에이전트 | `context_pack`, `agent_run_start`, `agent_run_complete`, `agent_feedback`, `agent_improvement_candidates` |

- 없애는 도구: `tiro_personal_sync`(`tiro_sync`로 통합), `estc_world`, `estc_context`, `briefing_*` 6개, `geo_audit`, `draft_page`, `draft_faq`, `refresh_stale`.
- Tiro 도구는 모두 OAuth 사용자의 개인 workspace `cw_tiro_notes`만 읽는다. `personal_tiro`/`workspace` 두 갈래를 하나로 합친다.

## 10. 로그인·로그아웃

- `/login`: Google 버튼(필수), Kakao 버튼(`KAKAO_CLIENT_ID`가 있을 때만).
- 로그인 후 `/dashboard`로 이동. 미로그인 상태로 `/dashboard*` 접근 시 `/login`(`proxy.ts`의 `withAuth`).
- 로그아웃: `CwAuthNav`의 `signOut({ callbackUrl: "/" })`.
- `ALLOWED_EMAILS`가 있으면 목록 밖 이메일은 로그인 거부(D2).

## 11. 랜딩·정적 화면

- `/`: 원본 `app/page.tsx`를 공개판 소개로 다시 쓴다. Tiro 원본 → 지식함 → MCP 공유 흐름, 설치 안내 링크. `canonical`은 `NEXT_PUBLIC_APP_URL` 기준.
- `components/landing/LandingHeader.tsx`: `/class` 링크 제거.
- `/terms`, `/privacy`: 운영자가 채우는 템플릿으로 바꾼다(디지로그랩스 사업자 정보 제거).
- `Footer`: 사업자 정보 하드코딩 제거, `NEXT_PUBLIC_BRAND_NAME`과 레포 링크만.
- `app/robots.ts`, `app/sitemap.ts`: `NEXT_PUBLIC_APP_URL` 기준으로. `llms.txt`, `llms-full.txt`는 제외(원본 서비스 소개 문서).
