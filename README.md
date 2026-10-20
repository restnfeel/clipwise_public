# Clipwise (공개 설치판)

내 서버와 내 Supabase에 직접 설치해서 쓰는 **개인 지식 관리 웹앱**입니다.
음성 기록 같은 원본을 모아 지식 카드로 정리하고, 원하는 글은 공개 아카이브로 게시하고, Claude 같은 AI 에이전트가 MCP로 내 지식을 읽고 쓸 수 있게 해 줍니다.

> 데이터는 설치한 사람의 DB에만 저장됩니다. 외부 서비스로 무언가를 보내는 동작은 사람이 승인했을 때만 실행됩니다.

## 무엇을 할 수 있나요?

| 메뉴 | 하는 일 |
|---|---|
| 원본 모으기 | Tiro(음성 기록) 키를 등록하고 노트를 가져옵니다 |
| 지식함 | 가져온 내용을 지식 카드로 정리·분류·연결하고 검토합니다 |
| 지식 아카이브 | 게시한 지식을 로그인 없이 볼 수 있는 공개 페이지로 보여 줍니다 |
| MCP | AI 에이전트 연결용 인증키를 발급·폐기합니다 |
| 에이전트 활동 | AI 에이전트가 무엇을 했는지 기록을 확인합니다 |
| 내 정보 | 프로필 확인, 회원 탈퇴 |

- 로그인한 사람은 모두 자기 개인 공간(workspace)의 주인이며, 자기 데이터만 보입니다.
- 관리자 기능은 없습니다.

## 준비물

- Node.js 18 이상, Yarn
- [Supabase](https://supabase.com) 프로젝트 1개 (무료 플랜 가능)
- Google 로그인용 OAuth 클라이언트 ([Google Cloud Console](https://console.cloud.google.com/apis/credentials))

## 설치 방법

### 1. 코드 받기

```bash
git clone https://github.com/restnfeel/clipwise_public.git
cd clipwise_public
yarn install
```

### 2. 환경 변수 만들기

```bash
cp .env.example .env
```

`.env`를 열고 아래 **필수** 값을 채웁니다.

| 변수 | 넣을 값 |
|---|---|
| `NEXTAUTH_URL` | 앱 주소 (로컬은 `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` 결과 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API의 Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 같은 화면의 service_role 키 (절대 공개 금지) |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` 결과 (한 번 정하면 바꾸지 마세요) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth 클라이언트 값 |
| `MCP_PUBLIC_BASE_URL` | AI 에이전트가 접속할 공개 주소 (보통 `NEXTAUTH_URL`과 같음) |

Google OAuth의 리디렉트 URI에는 `{NEXTAUTH_URL}/api/auth/callback/google`을 등록합니다.

### 3. 데이터베이스 만들기

Supabase 대시보드의 **SQL Editor**에서 [`public/onboarding/sql/0001_clipwise_public_init.sql`](./public/onboarding/sql/0001_clipwise_public_init.sql) 내용을 붙여 넣고 한 번 실행합니다.

앱을 먼저 켰다면 `/setup` 화면에서 SQL을 복사할 수 있고, 테이블이 다 만들어졌는지도 확인할 수 있습니다.

### 4. 실행

```bash
yarn dev          # 개발 모드
```

운영 서버에서는 빌드 후 실행합니다.

```bash
yarn build
yarn start
```

브라우저에서 `NEXTAUTH_URL` 주소로 접속해 Google로 로그인하면 끝입니다.

## 선택 기능

값을 넣으면 켜지고, 비워 두면 해당 기능만 숨겨집니다. 앱은 그대로 동작합니다.

| 변수 | 켜지는 기능 |
|---|---|
| `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET` | 카카오 로그인 버튼 |
| `ALLOWED_EMAILS` | 쉼표로 적은 이메일만 로그인 허용 (비우면 누구나) |
| `OPENROUTER_API_KEY` (+ `OPENROUTER_MODEL`) | AI 자동 정리 (우선 사용) |
| `OPENAI_API_KEY` (+ `OPENAI_MODEL`, `OPENAI_BASE_URL`) | AI 자동 정리 (OpenAI 규격 호환 서버) |
| `NEXT_PUBLIC_APP_URL` | 공개 주소 (검색엔진용 주소, 사이트맵) |
| `NEXT_PUBLIC_BRAND_NAME`, `NEXT_PUBLIC_BRAND_LOGO_URL` | 화면에 보이는 이름과 로고 |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` | Google Analytics |
| `ENCRYPTION_KEY_PREVIOUS` | 암호화 키를 바꿀 때 이전 키 |

## AI 에이전트(MCP) 연결하기

1. 앱에 로그인해 **MCP** 메뉴에서 인증키를 발급합니다. 키는 발급 직후 한 번만 보이니 바로 복사해 두세요.
2. Claude 같은 MCP 클라이언트에서 커스텀 커넥터 주소로 `{MCP_PUBLIC_BASE_URL}/api/mcp`를 등록합니다.
3. 연결 중 인증 화면이 뜨면 1번에서 받은 인증키를 입력합니다.

연결되면 에이전트가 쓸 수 있는 도구는 다음과 같습니다.

| 도구 | 하는 일 |
|---|---|
| `tiro_context`, `tiro_search` | 내 Tiro 노트 조회·검색 |
| `knowledge_search` | 검토됐거나 공개된 내 지식 검색 |
| `tiro_sync` | Tiro 원본 동기화 (`approved: true`일 때만) |
| `knowledge_apply` | 지식 초안 저장 (`approved: true`일 때만) |

AI 에이전트는 외부에서 접속하므로 `MCP_PUBLIC_BASE_URL`은 `localhost`가 아닌 실제 공개 주소여야 합니다.

## 개발자용 명령

```bash
yarn lint     # 코드 검사
yarn test     # 테스트
yarn build    # 프로덕션 빌드 (타입 검사 포함)
```

코드 구조와 작업 규칙은 [AGENTS.md](./AGENTS.md), 화면 의도는 [INTENT.md](./INTENT.md), 디자인은 [DESIGN.md](./DESIGN.md)를 참고하세요.

## 기술 스택

Next.js (App Router) · TypeScript · next-auth · Supabase Postgres · Tailwind CSS · MCP SDK · Vitest

## 라이선스

MIT
