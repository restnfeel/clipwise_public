# 04. 환경 변수와 설정

공개판은 아래 변수만 읽는다. 원본의 나머지 변수(약 40개)는 코드와 함께 사라진다.
문서·이슈·로그에는 변수 **이름**만 적고 값은 적지 않는다.

## 1. 필수

| 변수 | 용도 | 비고 |
|---|---|---|
| `NEXTAUTH_URL` | 앱 공개 주소 (예: `https://notes.example.com`) | 로그인 콜백 기준 |
| `NEXTAUTH_SECRET` | 세션 서명 | `openssl rand -base64 32` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 DB 접근 | 브라우저 노출 금지. 없으면 기동 실패(anon 폴백 없음) |
| `ENCRYPTION_KEY` | Tiro 키 암호화 (AES-256-GCM, 문자열을 SHA-256으로 키 생성) | `openssl rand -hex 32`. 바꾸면 기존 키 복호화 불가 → 교체 시 `ENCRYPTION_KEY_PREVIOUS` 사용 |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google 로그인 | 리디렉트 URI: `${NEXTAUTH_URL}/api/auth/callback/google` |
| `MCP_PUBLIC_BASE_URL` | MCP·OAuth 메타데이터의 공개 origin | 보통 `NEXTAUTH_URL`과 같음. 원본의 `https://clipwise.kr` 강제 값 제거 |

## 2. 선택

| 변수 | 켜지는 기능 | 없을 때 |
|---|---|---|
| `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET` | Kakao 로그인 버튼 | 버튼 숨김, provider 미등록 |
| `ALLOWED_EMAILS` | 쉼표 구분 이메일만 로그인 허용 (D2) | 누구나 로그인 |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_BASE_URL` | AI 자동 정리 (우선) | 다음 항목 확인 |
| `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL` | AI 자동 정리 (OpenAI 규격 폴백) | AI 정리 꺼짐, 규칙 기반 정리만 |
| `ENCRYPTION_KEY_PREVIOUS` | 암호화 키 교체 기간의 이전 키 | |
| `NEXT_PUBLIC_APP_URL` | canonical, sitemap, robots | `NEXTAUTH_URL` 사용 |
| `NEXT_PUBLIC_BRAND_NAME` | 화면·메타데이터·OAuth 승인 화면 이름 | `Clipwise` |
| `NEXT_PUBLIC_BRAND_LOGO_URL` | 메뉴 로고 | 기본 아이콘 |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` | GA | GA 스크립트 없음 |

모델 기본값: `OPENROUTER_MODEL`은 `openai/gpt-4o-mini`(원본 기본값), `OPENAI_MODEL`은 `gpt-4o-mini`.

## 3. 원본에서 없어지는 변수

| 묶음 | 변수 |
|---|---|
| Supabase anon | `SUPABASE_ANON_KEY` (브라우저 조회·anon 클라이언트 없음. `lib/supabase.ts`의 `supabase` export 제거) |
| 기본 workspace | `CLIPWISE_DEFAULT_WORKSPACE_ID` |
| Tiro 환경 변수 폴백 | `TIRO_API_KEY`, `TIRO_WORKSPACE_GUID`, `SOT_ENV_FALLBACK` |
| 다른 공급자 | `NOTION_*`, `SLACK_*`, `TELEGRAM_*`, `MAILY_*`, `SOT_OAUTH_ENABLED`, `NEXT_PUBLIC_SOT_OAUTH_ENABLED`, `CLIPWISE_PUBLIC_URL` |
| 메일 | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CLIPWISE_ADMIN_EMAIL`, `ADMIN_EMAIL`, `ADMIN_NOTIFICATION_EMAIL`, `CLIPWISE_CONTACT_EMAIL` |
| AgentC | `AGENTC_WEB_CONNECTOR_TOKEN`, `AGENTC_CONNECTOR_TOKEN`, `AGENTC_BLOG_REVIEW_TOKEN`, `AGENTC_DEFAULT_USER_ID` |
| JEV·관찰 | `TYPESAFE_API_KEY`, `TYPESAFE_MODEL`, `JEV_ENABLED`, `JEV_TIMEOUT_MS`, `PHOENIX_*` |
| OpenCode | `OPENCODE_API_KEY`, `OPENCODE_API_URL`, `OPENCODE_MODEL` |
| Bunny | `BUNNY_API_KEY`, `BUNNY_STORAGE_ZONE`, `BUNNY_STORAGE_HOSTNAME`, `BUNNY_CDN_HOSTNAME` |
| LinkedIn | `LINKEDIN_*`, `ADMIN_EMAILS` |
| 기타 | `AUTH_URL`, `VERCEL_ENV`, `ENV_VALIDATION_STRICT` |

## 4. `.env.example` 초안

```bash
# ── 필수 ─────────────────────────────────────────
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ENCRYPTION_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MCP_PUBLIC_BASE_URL=http://localhost:3000

# ── 선택: 로그인 ──────────────────────────────────
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=
# 쉼표로 구분. 비우면 누구나 로그인
ALLOWED_EMAILS=

# ── 선택: AI 자동 정리 (OpenRouter 우선, 없으면 OpenAI 규격) ──
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1

# ── 선택: 화면 ────────────────────────────────────
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_BRAND_NAME=Clipwise
NEXT_PUBLIC_BRAND_LOGO_URL=
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=

# ── 선택: 암호화 키 교체 ───────────────────────────
ENCRYPTION_KEY_PREVIOUS=
```

## 5. 기동 시 검증 (`lib/env-validation.ts`)

- 필수 목록: 1절 변수 전부.
- 운영 판정은 `NODE_ENV === "production"`만 쓴다(`VERCEL_ENV` 판정 제거).
- 운영에서 필수 변수가 없으면 기동을 멈추고 빠진 변수 **이름**을 로그로 남긴다.
- `KAKAO_CLIENT_ID`와 `KAKAO_CLIENT_SECRET` 중 하나만 있으면 경고.
- `MCP_PUBLIC_BASE_URL`의 호스트가 `localhost`/`127.0.0.1`/`0.0.0.0`인데 운영이면 경고(Claude 등 외부 클라이언트가 접근할 수 없음).

## 6. 하드코딩 제거 목록

원본에서 운영 도메인·회사 정보가 코드에 박혀 있는 곳이다. 모두 환경 변수 또는 설정으로 바꾼다.

| 위치 | 하드코딩 | 공개판 |
|---|---|---|
| `lib/mcp/mcp-http.ts:6,13` | 운영이면 `https://clipwise.kr` 강제 | `MCP_PUBLIC_BASE_URL` 필수, 없으면 요청 origin(개발) |
| `components/dashboard/McpTokenAdminSection.tsx:18,106` | `MCP_URL = "https://clipwise.kr/api/mcp"` | 서버 페이지에서 `mcpPublicBaseUrl()`을 props로 전달 |
| `app/blog/[slug]/page.tsx:38` | `https://clipwise.kr` 폴백 | 자기 HTTP 호출 제거(01 문서 5절) |
| `app/page.tsx:10,14,34` | canonical·메타데이터 | `NEXT_PUBLIC_APP_URL` |
| `app/robots.ts`, `app/sitemap.ts` | `clipwise.kr` | `NEXT_PUBLIC_APP_URL` |
| `proxy.ts:22-24` | `www.clipwise.kr` 리디렉트 | 제거 |
| `components/Footer.tsx` | 디지로그랩스 사업자 정보·링크 | 제거, 브랜드 이름·레포 링크만 |
| `app/privacy/page.tsx`, `app/terms/page.tsx` | 디지로그랩스 | 운영자 템플릿 |
| `lib/estc/llm-agents.ts:40` | `HTTP-Referer: https://clipwise.app`, `X-Title: Clipwise ESTC` | `lib/llm/chat.ts`에서 `NEXTAUTH_URL`, `NEXT_PUBLIC_BRAND_NAME` |
| `lib/blog/constants.ts:1` | "요셉의 꿈" 주석 | 주석 제거 |
| `app/api/mcp/oauth/authorize/route.ts:71` | 승인 화면 "Clipwise", "CLIPWISE · MCP" | `NEXT_PUBLIC_BRAND_NAME` |
| `app/globals.css`, 페이지 래퍼 | `cw-joseph` 클래스 | 제거 |
| `next.config.js` | YouTube 이미지 도메인 | 제거 |

구현 후 확인 명령 (결과 0건이어야 함):

```bash
rg -n "clipwise\.(kr|store|app)|digiloglabs|요셉|josephs-dream|cw-joseph" --glob '!docs/**' --glob '!public/onboarding/**'
```
