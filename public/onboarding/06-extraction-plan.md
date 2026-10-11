# 06. 추출 절차와 검증

## 1. 진행 원칙

- 원본 레포(`/Users/restnfeel/workspace/ws_digiloglabs/clipwise`)는 읽기만 하고 수정·커밋하지 않는다. 공개판은 이 레포(`/Users/restnfeel/workspace/ws_digiloglabs/clipwise_public`, `main`, 커밋 없음)에서 만든다.
- GitHub 레포는 **비공개로 먼저 만들고**, 5단계 점검을 모두 통과한 뒤 공개로 바꾼다.
- 단계마다 `yarn lint`, `yarn build`가 통과한 상태로 커밋한다. 공개 전 히스토리는 비공개 레포 안에서만 쌓이고, 공개 직전 하나로 합칠지(squash) 결정한다.

## 2. 단계

### 1단계: 골격 (복사만)

1. 레포는 이미 있다(`git init` 완료, 루트에 `DESIGN.md`, `.chisel/`, 이 문서 폴더). 새로 만들지 않는다.
2. 02 문서에서 "그대로/수정/경로 변경"인 파일만 복사한다. 목록을 `public/onboarding/manifest.txt`로 만들고 원본 루트에서 `rsync -a --files-from=<manifest> <원본> <공개판>`으로 복사해 빠짐이 없게 한다. 경로 변경 대상은 복사 후 `git mv`로 옮긴다.
3. `.gitignore`, `.env.example`, `README.md`(임시) 추가.
4. `yarn install` → `yarn build`. 이 단계에서는 import 오류가 나는 것이 정상이다. 오류 목록이 02 문서의 "수정" 항목과 일치하는지만 확인한다.

### 2단계: 서버 기반

1. `lib/supabase.ts`, `lib/env-validation.ts`, `lib/encryption.ts` 정리 (P6, P12).
2. 인증: `auth-options.ts`, `auth-features.ts`, `auth-utils.ts`, `auth/api-session.ts`, `auth/route-guard.ts`, `types/next-auth.d.ts` (05 문서 1절, P5, P7, P11).
3. `connector/workspace-scope.ts` 개인 workspace만 (P8). `workspace/roles.ts` 신규.
4. `lib/llm/chat.ts` 신규, `enrich-*`·`knowledge-service.ts`에서 ESTC·JEV 제거.
5. 스키마: 빈 Supabase 프로젝트에 `supabase/migrations/0001_clipwise_public_init.sql` 적용.

### 3단계: 기능별 화면·API

순서는 의존 관계 순이다. 기능마다 수용 기준(4절)을 통과시킨 뒤 다음으로 넘어간다.

1. 셸: `Providers`, `CwBrandingProvider`(정적), `CwMobileNav`, `Footer`, `proxy.ts`, 로그인·로그아웃
2. 내 정보
3. 원본 모으기(Tiro): 자격 증명 API, `/api/tiro/notes*`, `clipwise-tiro.ts`(P3, P9, P10, P13), 화면 합치기
4. 지식함
5. 지식 아카이브
6. 대시보드
7. MCP: `/api/mcp/keys`(P4), `/api/mcp`(P1, P2, 도구 정리, 자동 기록), `mcp-http.ts`, 인가 화면, `/dashboard/mcp`
8. 에이전트 활동

### 4단계: 문서·설치 경험

1. `README.md`: 기능 소개, 요구 사항(Node 20, Supabase 프로젝트, Google OAuth 앱), 설치 순서, 환경 변수 표, 스키마 적용, 실행, MCP 연결(Claude 설정 JSON), Tiro 키 발급 위치, 업데이트 방법.
2. `docs/`: `install.md`, `mcp.md`, `tiro.md`, `security.md` (05 문서 6절 기반).
3. `Dockerfile`, `.github/workflows/ci.yml`, `LICENSE`(D8), `AGENTS.md`, `INTENT.md`.

### 5단계: 공개 전 점검

1. 이 핸드오프 폴더를 `public/onboarding/`에서 빼낸다. Next.js는 `public/` 아래 파일을 그대로 웹에 내보내므로 `https://<도메인>/onboarding/05-auth-security.md`처럼 열린다. 운영자용 문서는 4단계 `docs/`로 옮기고, 원본 경로·내부 판단이 담긴 이 폴더는 삭제한다.
2. 05 문서 5절 전부 + 4절 수용 기준 전부 통과 → 레포 공개 전환.

## 3. 자동 검증

| 명령 | 기준 |
|---|---|
| `yarn lint` | 오류 0 |
| `yarn build` | 성공 |
| `yarn test` | 전부 통과 |
| `npx depcheck` | 미사용 의존성 0 |
| `npx tsc --noEmit` | 오류 0 |
| 04 문서 6절 `rg` | 0건 |
| 05 문서 5.2 스캔 | 0건 |
| 공개 범위 밖 import 확인 | `rg -n "estc|jev|newsletter|notion|linkedin|subscription|admin-check|agentc-web-connector|resend|bunny" app components lib` 0건 |

테스트로 반드시 만들 것(vitest, 외부 API·Supabase는 가짜 객체):
- 05 문서 2절 P1~P13 각각
- 두 사용자 분리: 사용자 A의 지식·Tiro 노트·실행 기록·MCP 키를 사용자 B가 API로 읽거나 고칠 수 없음
- Tiro 클라이언트: `fetchImpl` 주입으로 노트 목록 페이지네이션, 401/429 처리
- `lib/llm/chat.ts`: OpenRouter 우선 → OpenAI 폴백 → 둘 다 없으면 `null`
- 아카이브 동기화: 지식 `published` → 글 공개, 지식 삭제 → 글 내림

## 4. 수용 기준

### 설치

- Given 빈 Supabase 프로젝트와 필수 환경 변수, When `0001` SQL 적용 후 `yarn build && yarn start`, Then `/`와 `/login`이 열리고 서버 로그에 오류가 없다.
- Given 선택 변수(Kakao, AI, `ALLOWED_EMAILS`)가 하나도 없음, When 로그인·Tiro 연결·지식화·MCP 연결을 수행, Then 모두 동작하고 AI 정리 버튼만 보이지 않는다.
- Given 필수 변수 하나가 빠진 운영 모드, When 기동, Then 빠진 변수 이름을 남기고 멈춘다.

### 로그인·메뉴

- Given 처음 로그인한 사용자, When `/dashboard` 진입, Then `users` 행과 개인 workspace(owner)가 생기고 메뉴에 01 문서 2절 항목만 보인다.
- Given `ALLOWED_EMAILS`에 없는 이메일, When 로그인, Then 거부된다.
- Given 탈퇴한 사용자, When 다시 로그인, Then 거부된다.

### 원본 모으기

- Given Tiro 키 미등록, When 동기화, Then "Tiro 키를 먼저 등록해 주세요." 안내가 뜨고 외부 호출이 없다.
- Given 키 등록 후 동기화, When 노트 첫 컬럼 클릭, Then 우측 드로워에 원문·요약이 보이고 하단 "지식으로 만들기"로 `draft` 지식이 생긴다.
- Given 두 사용자가 같은 Tiro workspace 키를 등록, When 둘 다 동기화, Then 각자 workspace에 노트가 따로 저장된다.

### 지식함·아카이브

- Given `draft` 지식, When 상태를 `published`로 바꾸고 "아카이브에 공개", Then `/blog`에 글이 보이고 로그아웃 상태에서도 열린다.
- Given 공개된 지식, When 지식 삭제, Then `/blog/[slug]`가 404가 된다.

### MCP

- Given `/dashboard/mcp`에서 인증키 발급, When 화면 새로고침, Then 원문은 다시 보이지 않고 접두사만 보인다.
- Given Claude Desktop에 설정 JSON 붙여 넣기, When 연결, Then 인가 화면에서 인증키 입력 → 승인 → `tiro_context`, `knowledge_search`가 본인 데이터만 반환한다.
- Given 고정 토큰 또는 `cw_mcp_` 인증키를 Bearer로 `/api/mcp` 호출, Then 401.
- Given `knowledge_apply`를 `approved: false`로 호출, Then 저장하지 않는다.

### 에이전트 활동

- Given MCP로 `knowledge_apply` 호출 성공, When `/dashboard/agent`, Then 실행 기록 1건이 보이고 평가를 남길 수 있다.

## 5. 원본과의 동기화

- 공개판은 원본의 일부를 단순화한 파생본이다. 원본에서 공용 컴포넌트(`components/cw`, `components/grid`, `lib/notice`)나 Tiro·MCP 로직이 바뀌면 공개판에 옮길지 판단한다.
- 판단 기준: 공개 범위 기능이고, 관리자·제외 기능 의존이 없을 것.
- 원본 `AGENTS.md`의 Context Map에 이 문서 폴더(`docs/public/`)를 링크해 변경 시 확인하게 한다.

## 6. 일정 추정

| 단계 | 예상 |
|---|---|
| 1. 골격 | 0.5일 |
| 2. 서버 기반 | 1일 |
| 3. 기능 8개 | 3~4일 |
| 4. 문서·설치 | 1일 |
| 5. 점검 | 0.5일 |
| 합계 | 6~7일 |
