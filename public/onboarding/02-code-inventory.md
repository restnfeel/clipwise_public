# 02. 코드 처리표

원본 레포 기준 파일별 처리 방법이다. 이 표에 없는 파일은 **가져가지 않는다**.

표기:
- **그대로**: 내용 변경 없이 복사
- **수정**: 복사 후 적힌 내용만 고침
- **신규**: 공개판에서 새로 만듦 (원본 파일을 바탕으로 할 때는 출처를 적음)
- **경로 변경**: 위치를 옮기며 수정

조사 기준일: 2026-10-11, 원본 커밋 `4e4a4a0` 이후 작업 트리.

## 1. 루트 설정

| 파일 | 처리 | 내용 |
|---|---|---|
| `package.json` | 수정 | 이름 `clipwise-public`, scripts는 `dev`, `build`, `start`, `lint`, `test`만. 의존성 정리(아래 7절) |
| `yarn.lock` | 신규 | 정리된 `package.json`으로 `yarn install` 후 새로 생성. `pnpm-lock.yaml`은 가져가지 않음 |
| `.yarnrc` | 그대로 | |
| `tsconfig.json` | 그대로 | |
| `next.config.js` | 수정 | `withReticle` 제거, YouTube 이미지 도메인 제거 |
| `tailwind.config.js`, `postcss.config.js` | 그대로 | |
| `eslint.config.mjs` | 그대로 | |
| `proxy.ts` | 수정 | `withAuth`의 `/dashboard*` 보호만 남김. `www.clipwise.kr` 리디렉트, 구형 경로 목록 제거. `/dashboard/tiro` → `/dashboard/sources`, `/dashboard/admin-mcp` → `/dashboard/mcp` 리디렉트 추가 |
| `instrumentation.ts` | 그대로 | |
| `lib/env-validation.ts` | 수정 | 필수 목록을 04 문서의 필수 변수로 교체 |
| `.gitignore` | 수정 | 원본 기반. `**/uploads/` 패턴 제거(원본에서 `lib/uploads` 누락 사고 원인) |
| `.env.example` | 신규 | 04 문서 초안 |
| `README.md` | 신규 | 설치·설정·실행·MCP 연결 안내 |
| `LICENSE` | 신규 | D8 결정 후 |
| `AGENTS.md`, `app/AGENTS.md`, `components/AGENTS.md`, `lib/AGENTS.md` | 작성됨 | 공개판 레포에 이미 작성. 원본의 같은 이름 파일을 복사해 덮어쓰지 않는다(manifest에서 제외) |
| `INTENT.md` | 작성됨 | 공개판 레포에 이미 작성. 원본 `INTENT.md`를 복사하지 않는다 |
| `Dockerfile`, `.dockerignore` | 신규 | D9. Node 20, `yarn build`, `yarn start` |
| `vercel.json`, `CLAUDE.md`, `RETICLE.md`, `.reticle.json`, `install-youtube-digest.sh`, `.agent*`, `.chisel`, `.claude`, `.cursor`, `.harness`, `.kiro`, `.opencode`, `.specs`, `.agentc-repo` | 제외 | 원본 운영·도구 전용 |
| `.github/workflows/ci.yml` | 신규 | `yarn install --frozen-lockfile`, `yarn lint`, `yarn test`, `yarn build` |

## 2. app

| 파일 | 처리 | 내용 |
|---|---|---|
| `app/layout.tsx` | 수정 | `ReticleDev` 제거. GA는 `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`가 있을 때만(현행 유지). 메타데이터는 `NEXT_PUBLIC_BRAND_NAME`, `NEXT_PUBLIC_APP_URL` 기준 |
| `app/globals.css` | 수정 | `--cw-*` 토큰, 다크 토큰, AG Grid 부분만. `.dashboard-sidebar`, `.cw-joseph` 색상 덮어쓰기, `.naver-blog-style`, `.magazine-*` 제거. `.blog-content`는 아카이브 상세가 쓰면 유지 |
| `app/page.tsx` | 수정 | 공개판 소개로 다시 씀. canonical 하드코딩 제거 |
| `app/login/page.tsx` | 수정 | Kakao 버튼은 서버에서 넘겨준 `kakaoEnabled`일 때만 |
| `app/terms/page.tsx`, `app/privacy/page.tsx` | 수정 | 운영자가 채우는 템플릿 |
| `app/robots.ts`, `app/sitemap.ts` | 수정 | `NEXT_PUBLIC_APP_URL` 기준, 포함 경로만 |
| `app/mcp-auth/page.tsx` | 수정 | "관리자에게 발급받은" → "MCP 토큰 관리에서 직접 발급한" |
| `app/dashboard/page.tsx` | 수정 | 온보딩 fetch 제거, `/dashboard/tiro` 링크 → `/dashboard/sources`, `cw-joseph` 클래스 제거 |
| `app/dashboard/knowledge/page.tsx` | 수정 | `draftChannels`, `isChannelConfiguredFor`, 초안 섹션 제거 |
| `app/dashboard/profile/page.tsx` | 그대로 | |
| `app/dashboard/agent/page.tsx` | 그대로 | |
| `app/dashboard/sources/page.tsx` | 수정 | Tiro 연결 카드 + Tiro 노트 섹션 + `SourceDocumentList` |
| `app/dashboard/mcp/page.tsx` | 경로 변경 | 원본 `app/dashboard/admin-mcp/page.tsx` |
| `app/blog/page.tsx`, `app/blog/workspace/[id]/page.tsx` | 그대로 | `cw-joseph` 클래스만 제거 |
| `app/blog/[slug]/page.tsx` | 수정 | HTTP 자기 호출 대신 `getPublishedPost(slugid)`. `clipwise.kr` 폴백, `preview`, YouTube 안내 제거 |

제외: `app/apply`, `app/class`, `app/contact`, `app/intro`, `app/onboarding`, `app/site`, `app/reticle-dev.tsx`, `app/llms*.txt`, `app/dashboard/{admin,admin-keys,admin-mcp,blog,class,settings,site,subscription,subscription-requests,tiro,users}`, `app/dashboard/sources/[provider]`.

## 3. app/api

### 유지

| 라우트 | 처리 | 내용 |
|---|---|---|
| `auth/[...nextauth]/route.ts` | 그대로 | |
| `knowledge/route.ts` | 수정 | POST(Tiro 노트 지식화)는 `workspaceIdsForUser` 기준. 관리자 분기 제거 |
| `knowledge/[id]/route.ts`, `[id]/archive`, `[id]/links`, `links`, `links/[id]`, `categories`, `categories/[id]`, `categories/[id]/merge`, `bulk-category`, `graph`, `batch` | 그대로 | `hub-http`의 `isPlatformAdmin` 우회가 있으면 제거 |
| `knowledge/[id]/enrich/route.ts`, `knowledge/enrich/batch/route.ts` | 수정 | AI 키 없으면 `503 AI_DISABLED` |
| `workspace/route.ts` | 수정 | `cover_url` 처리 제거 |
| `user/profile/route.ts` | 수정 | YouTube 처리 제거, 필요한 컬럼만 select, PUT은 `name`만 |
| `user/withdraw/route.ts` | 수정 | 관리자 메일 제거, workspace 삭제·MCP 키/세션 폐기 추가 |
| `agent/runs/route.ts` | 그대로 | |
| `sot/credentials/route.ts`, `[provider]/route.ts`, `[provider]/test/route.ts` | 수정 | `provider !== "tiro"`면 404 |
| `sot/documents/route.ts` | 수정 | 공급자 표시 여부·관리자 판정 제거 |
| `tiro/notes/route.ts` | 경로 변경 | 원본 `admin/tiro/notes/route.ts`. `requireAdmin` → `requireApiUserId`, 본인 workspace로 동기화 |
| `tiro/notes/knowledgeize/route.ts` | 경로 변경 | 원본 `admin/tiro/notes/knowledgeize/route.ts`. 같은 변경 |
| `mcp/route.ts` | 수정 | 고정 토큰 제거, 도구 정리, Tiro 개인/workspace 분기 통합, 자동 기록 규칙화 (01 문서 9절) |
| `mcp/keys/route.ts` | 경로 변경 | 원본 `admin/mcp/keys/route.ts`. 본인 범위 고정, 메일·`users` 전체 조회 제거 |
| `mcp/key/verify/route.ts` | 그대로 | |
| `mcp/oauth/{register,authorize,token,revoke}/route.ts` | 수정 | `authorize`의 승인 화면 문구·브랜드 이름을 환경 변수로. 나머지 그대로 |

### `.well-known`

| 라우트 | 처리 |
|---|---|
| `oauth-protected-resource/route.ts`, `.../api/mcp/route.ts` | 그대로 |
| `oauth-authorization-server/route.ts`, `.../api/mcp/route.ts` | 그대로 |
| `agentc-service.json/route.ts` | 제외 |

### 제외

`admin/**`(위에서 경로 변경한 것 외 전부), `agent/v1/**`, `auth/login`, `auth/signup`, `blog/posts/[slug]`, `cw/**`, `integrations/**`, `newsletter-drafts/**`, `notion-drafts/**`, `public/branding`, `site/**`, `sot/oauth/**`, `sot/providers/**`, `user/tiro/**`, `workspace/branding`, `workspace/cover`, `workspace/onboarding`.

## 4. components

| 파일 | 처리 | 내용 |
|---|---|---|
| `Providers.tsx` | 수정 | `CwBrandingProvider`를 정적 버전으로 |
| `Footer.tsx` | 수정 | 사업자 정보 제거 |
| `ui/ConfirmDialog.tsx`, `ui/NoticeLayer.tsx` | 그대로 | `ui/AlertDialog.tsx`는 사용처 확인 후 미사용이면 제외 |
| `cw/CwAuthNav.tsx`, `CwThemeToggle.tsx`, `CwPageHero.tsx`, `CwRefreshButton.tsx`, `CwDetailDrawer.tsx` | 그대로 | |
| `cw/CwBrandingProvider.tsx` | 수정 | fetch 제거. 환경 변수 + `DEFAULTS` 반환 |
| `cw/CwMobileNav.tsx` | 수정 | 01 문서 2절 메뉴 |
| `cw/CwProfileSection.tsx` | 수정 | `CwLinkedInConnection` 제거, `toast` → `notice` |
| `grid/*` (6개) | 그대로 | AG Grid Community 공통 래퍼 |
| `knowledge/KnowledgeHubSection.tsx`, `KnowledgeWorkspaceCard.tsx` | 수정 | 빈 화면 안내를 "원본 모으기"로, 표지 업로드 UI 제거 |
| `knowledge/hub/*` (9개) | 수정 | AI 정리 버튼은 `aiEnabled`일 때만 |
| `blog/WorkspaceCover.tsx`, `blog/BlogPostDetailShell.tsx` | 그대로 | |
| `dashboard/AgentActivitySection.tsx` | 그대로 | |
| `dashboard/TiroNotesSection.tsx` | 수정 | 체험 섹션·관리자 판정 제거, 새 API 경로 사용, 연결 카드 포함 |
| `dashboard/McpTokenSection.tsx` | 경로 변경 | 원본 `McpTokenAdminSection.tsx`. 사용자 선택·통계·사용자별 현황 제거, `MCP_URL`은 서버에서 받은 값 |
| `sot/SourceCredentialsSection.tsx` | 수정 | 관리자 모드 제거, Tiro 전용 |
| `sot/SourceDocumentList.tsx` | 그대로 | |
| `landing/LandingHeader.tsx` | 수정 | `/class` 링크 제거 |

제외: `class/`, `estc/`, `newsletter/`, `workspace/`, `blog/BlogAdminSection.tsx`, `cw/CwAdminSubscriptionRequests.tsx`, `cw/CwSubscriptionRequests.tsx`, `cw/CwLinkedInConnection.tsx`, `dashboard/AgentQualitySection.tsx`, `dashboard/PublicSiteManagementSection.tsx`, `dashboard/UsersSection.tsx`, `knowledge/KnowledgeDraftSection.tsx`, `knowledge/Newsletter*`, `knowledge/Notion*`, `sot/SourceInboxSection.tsx`, `sot/SourceProviderSection.tsx`.

## 5. lib

| 파일 | 처리 | 내용 |
|---|---|---|
| `supabase.ts` | 그대로 | `supabaseAdmin`은 서버 전용 |
| `encryption.ts` | 그대로 | AES-256-GCM, `ENCRYPTION_KEY` |
| `notice.ts` | 그대로 | |
| `auth-options.ts` | 수정 | 05 문서 1절 (Kakao 조건부, `ALLOWED_EMAILS`, 탈퇴 차단, 역할 컬럼 제거, 관리자 메일 제거, `app_settings` 제거) |
| `auth-features.ts` | 수정 | `kakaoEnabled = Boolean(KAKAO_CLIENT_ID && KAKAO_CLIENT_SECRET)` |
| `auth-utils.ts` | 수정 | dev-bridge 분기 제거 |
| `auth/api-session.ts` | 수정 | dev-bridge 분기 제거 |
| `auth/route-guard.ts` | 수정 | `requireAuth`만. `requireAdmin` 제거 |
| `connector/workspace-scope.ts` | 수정 | `workspaceIdsForUser`, `ensurePersonalWorkspace`만. 관리자·데모·기본 workspace 함수 제거 |
| `constants/roles.ts` | 제외 | 역할 컬럼 제거(D7)와 함께 |
| `workspace/workspace-settings.ts` | 수정 | `isPlatformAdmin` 제거, `users.image` 대신 `profile_image`만, `REVIEWER_ROLES`는 `workspace/roles.ts`에서 import |
| `workspace/roles.ts` | 신규 | `REVIEWER_ROLES = ["owner","admin","editor"]` (원본 `knowledge/hub/hub-http.ts:6`에서 분리) |
| `workspace/workspace-display.ts`, `workspace-http.ts` | 그대로 | |
| `knowledge/knowledge-service.ts` | 수정 | JEV 호출 제거 |
| `knowledge/tiro-knowledgeize.ts` | 수정 | `resolveWorkspaceIdForAdmin` → `workspaceIdsForUser` |
| `knowledge/document-analysis.ts`, `document-analysis-server.ts` | 그대로 | MCP `document_analysis_save` |
| `knowledge/archive/*` | 그대로 | |
| `knowledge/hub/types.ts`, `categories-server.ts`, `links-server.ts`, `graph-core.ts`, `graph-server.ts` | 그대로 | |
| `knowledge/hub/hub-http.ts` | 수정 | `REVIEWER_ROLES`를 `workspace/roles.ts`에서 가져옴, 관리자 우회 제거 |
| `knowledge/hub/enrich-core.ts` | 수정 | `JEV_QUESTIONS` 제거, `parseAgentJson`은 `llm/chat.ts`에서 |
| `knowledge/hub/enrich-server.ts` | 수정 | `llm/chat.ts` 사용, JEV 제거, 키 없으면 바로 반환 |
| `llm/chat.ts` | 신규 | 원본 `estc/llm-agents.ts`에서 `chatCompletion`, `parseAgentJson`만 추출. OpenRouter 우선, OpenAI 규격 폴백, `isAiEnabled()` |
| `blog/constants.ts`, `blog/safe-markdown.ts` | 그대로 | |
| `blog/workspace-archive.ts` | 수정 | `getPublishedPost(slugid)` 추가 |
| `tiro/tiro-client.ts`, `tiro/tiro-model.ts` | 그대로 | |
| `tiro/clipwise-tiro.ts` | 수정 | `resolveTiroCredentials(workspaceId, userId)`는 `resolveSourceCredentials`만, 기본 workspace·환경 변수 폴백 제거. 빈 `workspaceIds`면 빈 배열 반환(전체 조회 금지) |
| `sot/types.ts` | 수정 | `SourceProvider = "tiro"` |
| `sot/providers.ts` | 수정 | Tiro 항목만, `credentialScope: "user"`, `envFallback` 제거 |
| `sot/credentials.ts` | 수정 | `SOT_ENV_FALLBACK` 분기 제거 |
| `sot/credential-api.ts` | 수정 | `requireCredentialAdmin`, 공급자 표시 여부 검사 제거 |
| `sot/credential-testers.ts` | 수정 | Tiro만 |
| `sot/sot-service.ts` | 그대로 | |
| `mcp/mcp-access-key.ts`, `mcp-oauth.ts`, `mcp-oauth-store.ts` | 그대로 | |
| `mcp/mcp-http.ts` | 수정 | `https://clipwise.kr` 강제 제거, `MCP_PUBLIC_BASE_URL` 필수 |
| `agent/observability.ts` | 수정 | `listAgentQuality`, `updateImprovementCandidate`, Phoenix 내보내기 제거 |
| `agent/auto-capture.ts` | 수정 | JEV 관련 타입·임계값 제거, `classifyTool` 결과 `keep`만 기록 |
| `agent/auto-capture-server.ts` | 수정 | JEV 호출·속도 제한·개인정보 마스킹 제거. 개선 후보 생성 제거 |
| `uploads/bunny.ts` | 제외 | 표지 업로드 제외 |

제외: `agentc-web-connector.ts`, `auth.ts`, `auth/admin-check.ts`, `auth/dev-bridge-context.ts`, `auth/linkedin-admin.ts`, `agent/briefing.ts`, `blog/agentc.ts`, `blog/status-history.ts`, `class-catalog.ts`, `cw/`, `email/`, `estc/`, `geo.ts`, `jev/`, `linkedin*.ts`, `newsletter*`, `notion/`, `public-site.ts`, `resend.ts`, `sot/{maily,notion,slack,telegram}-adapter.ts`, `sot/oauth.ts`, `sot/registry.ts`, `sot/sync-runner.ts`, `sot/provider-visibility*.ts`, `tiro/personal-tiro.ts`, `workspace-branding.ts`, `workspace/cover-image-client.ts`.

## 6. 기타

| 경로 | 처리 | 내용 |
|---|---|---|
| `types/next-auth.d.ts` | 수정 | `role`, `user_type`, `app_role` 제거 |
| `public/favicon.ico`, `public/images/clipwise_logo.png` | 확인 후 | 상표 사용 허락 여부(05 문서 4절). 공개판 로고로 교체 가능 |
| `public/fonts/*.ttf` | 확인 후 | 재배포 허용 라이선스 확인 전에는 제외하고 시스템 폰트로 대체 |
| `public/ads.txt` | 제외 | |
| `sqls/**` | 제외 | 공개판은 `supabase/migrations/0001_clipwise_public_init.sql` 하나(03 문서) |
| `scripts/**` | 제외 | 필요한 스모크만 테스트로 다시 작성 |
| `docs/**` | 제외 | 공개판 `docs/`는 설치·MCP 연결·Tiro 연결 안내만 새로 작성 |

## 7. package.json 의존성

유지: `next`, `react`, `react-dom`, `next-auth`, `@supabase/supabase-js`, `@modelcontextprotocol/sdk`, `zod`, `react-hot-toast`, `lucide-react`, `framer-motion`, `ag-grid-community`, `ag-grid-react`, `@ag-grid-community/locale`, `d3-force`(지식 그래프), `tailwindcss`, `postcss`, `autoprefixer`, `typescript`, `eslint`, `eslint-config-next`, `@types/*`.

추가: 테스트 러너 하나(`vitest` 권장. 원본에는 테스트 설정이 없다).

제거: `resend`, `@reticlehq/*`, `tsx`(스크립트 제외 시), `uuid`(사용처 확인 후), 그 밖에 남은 import가 없는 패키지. 정리 후 `npx depcheck`로 확인한다.
