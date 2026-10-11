# AGENTS.md

이 레포에서 작업하는 AI 에이전트와 사람이 따르는 최상위 규칙이다. 세부 규칙은 하위 문서에 위임한다.
규칙과 구현이 어긋나면 구현을 고치거나, 규칙이 낡았으면 이 문서를 같은 변경에서 함께 고친다.

## 1. 프로젝트 개요

- **무엇:** 사용자가 자기 서버와 자기 Supabase 프로젝트에 직접 설치해 쓰는 지식 관리 웹앱(셀프 호스팅).
- **흐름:** 외부 원본(음성 기록 등) 연결 → 원본 동기화 → 지식 카드로 정리·검토 → 공개 아카이브 게시 / MCP로 AI 에이전트에 공유 → 에이전트 실행 기록 확인.
- **사용자 모델:** 모든 로그인 사용자는 자기 개인 workspace의 `owner`다. 관리자 역할과 관리자 화면은 없다.
- **데이터 원칙:** 데이터는 설치한 사람의 DB에만 저장한다. 외부 서비스로 쓰기(동기화·게시·저장)는 사람이 승인했을 때만 한다.

## 2. 기술 스택

| 영역 | 사용 |
|---|---|
| 프레임워크 | Next.js App Router (Node 서버로 상시 실행) |
| 언어 | TypeScript strict |
| 인증 | next-auth 4 (OAuth, JWT 세션) |
| DB | Supabase Postgres, 서버에서 service role로만 접근 |
| UI | React 함수형 컴포넌트, Tailwind, `lucide-react`, AG Grid Community, `framer-motion` |
| 알림 | `react-hot-toast` 기반 공통 레이어(`lib/notice`) |
| 검증 | `zod` |
| AI 연동 | MCP 서버(`@modelcontextprotocol/sdk`), 선택적 LLM 호출(OpenAI 규격 호환) |
| 테스트 | Vitest |
| 패키지 | Yarn (lock 파일 하나만) |

## 3. 명령

```bash
yarn install          # 의존성 설치 (lock 파일 갱신 시 함께 커밋)
yarn dev              # 개발 서버
yarn lint             # ESLint
yarn test             # 단위·통합 테스트
yarn build            # 프로덕션 빌드 (타입 검사 포함)
yarn start            # 빌드 결과 실행
```

변경을 마치기 전에 `yarn lint`, `yarn test`, `yarn build`가 모두 통과해야 한다.

## 4. 아키텍처

```text
브라우저 ── app/(pages) ── components/  ── fetch ──▶ app/api/* (얇은 라우트)
                                                       │ 검증 → 인증 → 범위 결정
                                                       ▼
                                                     lib/* (도메인 서비스, 서버 전용)
                                                       │
                                     ┌─────────────────┼──────────────────┐
                                     ▼                 ▼                  ▼
                              Supabase(service role)  외부 원본 API     LLM(선택)
MCP 클라이언트 ── OAuth 2.1 ──▶ app/api/mcp ──▶ lib/* (같은 서비스 재사용)
```

| 경로 | 역할 | 세부 규칙 |
|---|---|---|
| `app/` | 페이지, API 라우트, `.well-known` 메타데이터 | [app/AGENTS.md](./app/AGENTS.md) |
| `components/` | 화면 컴포넌트, 공통 UI | [components/AGENTS.md](./components/AGENTS.md) |
| `lib/` | 도메인 로직, DB·외부 API 접근, 인증 헬퍼 | [lib/AGENTS.md](./lib/AGENTS.md) |
| `supabase/migrations/` | 스키마 SQL (순서대로 적용) | 이 문서 7절 |
| `types/` | 전역 타입 보강 (`next-auth` 등) | |
| `public/` | 정적 파일. **웹에 그대로 공개됨** | 문서·비밀 파일 금지 |
| `docs/` | 설치·운영·연동 안내 | |

## 5. 황금 규칙

### 절대 규칙

- 비밀값(API 키, 서비스 키, 토큰, 암호화 키)을 코드·문서·로그·커밋에 쓰지 않는다. 환경 변수 또는 암호화 저장만. 문서에는 변수 **이름**만 적는다.
- `.env`를 커밋하지 않는다. 새 변수는 `.env.example`과 `docs/`에 이름·용도를 추가한다.
- 모든 데이터 조회·수정은 세션 사용자의 workspace 또는 `user_id`로 범위를 제한한다. 범위 없이 통과하는 경로(고정 토큰, "기본 workspace" 폴백, 빈 필터)를 만들지 않는다.
- 모든 테이블은 RLS를 켜고 `anon`/`authenticated` 권한을 회수한다. 브라우저에서 DB에 직접 접근하지 않는다.
- 외부 서비스에 쓰는 동작은 사람의 명시적 승인 후에만 실행한다(UI 버튼 또는 MCP `approved: true`).
- `alert()`, `confirm()`, `prompt()`를 쓰지 않는다.

### 할 것

- 라우트는 얇게, 로직은 `lib/`에. 같은 로직을 웹 API와 MCP 도구가 함께 쓴다.
- 선택 기능(추가 로그인 공급자, AI 정리 등)은 환경 변수가 있을 때만 켠다. 없을 때 앱이 죽지 않고 해당 UI만 숨긴다.
- 런타임에 `process.env`를 읽을 때는 기본값을 두거나 기동 시 검증(`lib/env-validation.ts`)에 등록한다.
- LLM 호출은 한 모듈(`lib/llm/`)에서만. OpenRouter 우선, OpenAI 규격 엔드포인트 폴백.
- 사용자 대면 문구·오류 메시지는 한국어 한 문장.
- UI는 [INTENT.md](./INTENT.md), 시각 디자인은 [DESIGN.md](./DESIGN.md)를 따른다.

### 하지 말 것

- 관리자 역할·전체 사용자 조회·대리 실행 기능을 추가하지 않는다(이 앱의 범위 밖).
- 클라이언트 컴포넌트에서 서버 모듈(`lib/supabase`, 외부 API 클라이언트)을 import하지 않는다.
- 특정 호스팅 서비스를 전제로 코드·문서를 쓰지 않는다. 일반 Node 서버/컨테이너 기준으로 쓴다.
- 운영 도메인·회사 정보·개인 정보를 하드코딩하지 않는다. 공개 주소는 환경 변수로만 만든다.
- 사용하지 않는 코드·의존성·주석 처리된 코드를 남기지 않는다.

## 6. 보안 기본

| 항목 | 규칙 |
|---|---|
| 인증 | 페이지는 `requireAuth()`, API는 `requireApiUserId()`로 시작 |
| 범위 | `workspaceIdsForUser(userId)` 결과로 필터. 경로 id로 찾은 행도 workspace 일치 확인 후 처리, 다르면 404 |
| 응답 | 암호문, 키 원문, 토큰 해시, 다른 사용자 정보를 넣지 않음. 오류는 `{ error, code }` |
| 저장 | 외부 서비스 키는 AES-256-GCM으로 암호화 저장, 토큰·인증키는 해시만 저장 |
| MCP | OAuth 2.1 + PKCE(S256) 액세스 토큰만 허용. scope로 읽기/쓰기 구분 |
| 로그 | 비밀값, 원문 본문 전체, 개인 정보를 남기지 않음 |
| 탈퇴 | 탈퇴 사용자는 재로그인 차단, 토큰·세션 폐기 |

## 7. 데이터베이스

- 스키마 변경은 `supabase/migrations/NNNN_설명.sql` 새 파일로 추가한다. 이미 적용된 마이그레이션 파일은 고치지 않는다.
- 마이그레이션은 빈 DB에서 처음부터 순서대로 적용해도 성공해야 한다(존재하지 않는 테이블을 alter하지 않음).
- 테이블 접두사 `cw_`를 유지한다. 새 테이블에는 `workspace_id`(또는 `user_id`) 컬럼과 인덱스, RLS, 권한 회수를 함께 넣는다.
- 고유키에는 `workspace_id`를 포함해 사용자 간 데이터가 섞이지 않게 한다.
- 스키마를 바꾸면 해당 `lib/` 쿼리와 타입을 같은 변경에서 고친다.

## 8. 테스트

- 새 기능·버그 수정은 실패하는 테스트를 먼저 쓴다.
- 반드시 테스트할 것: 권한·범위(다른 사용자 데이터 접근 차단), 승인 없는 쓰기 차단, 선택 기능 키가 없을 때의 동작, 외부 API 오류 처리.
- 외부 API와 Supabase는 가짜 객체로 대체한다. 외부 클라이언트는 `fetch`를 주입받게 만든다.
- 테스트 이름은 한국어로 행동을 설명한다. 준비 → 실행 → 검증, 한 테스트에 한 가지 검증.

## 9. Git

- 브랜치: `feat/*`, `fix/*`, `refactor/*`, `docs/*`, `chore/*`.
- 커밋: `type(scope): 설명` (예: `feat(mcp): 지식 검색 도구 범위 필터`, `fix(auth): 탈퇴 사용자 재로그인 차단`).
- 의도한 파일만 `git add`한다. 빌드 산출물, 로컬 도구 폴더, `.env`는 `.gitignore`에 둔다.

## 10. 완료 기준

작업 완료를 보고하기 전에:

1. `yarn lint`, `yarn test`, `yarn build` 통과
2. 바뀐 화면은 브라우저에서 직접 확인(로그인 → 해당 메뉴 → 주요 동작 → 오류 로그 없음)
3. 비밀값 스캔: `git diff`에 키·토큰 형태 문자열이 없는지 확인
4. 규칙·환경 변수·스키마가 바뀌었으면 이 문서, `INTENT.md`, `.env.example`, `docs/`를 함께 갱신

확인하지 못한 항목은 "확인 못 함"으로 그대로 보고한다. 추측을 통과로 보고하지 않는다.

## 11. 문서 지도

| 문서 | 내용 |
|---|---|
| [INTENT.md](./INTENT.md) | UI·운영 의도, 공통 컴포넌트 사용 규칙 |
| [DESIGN.md](./DESIGN.md) | 색·타이포·간격 등 시각 디자인 시스템 |
| [app/AGENTS.md](./app/AGENTS.md) | 페이지·API 라우트 규칙 |
| [components/AGENTS.md](./components/AGENTS.md) | 컴포넌트 규칙 |
| [lib/AGENTS.md](./lib/AGENTS.md) | 서버 로직·연동 규칙 |
| `public/onboarding/` | 초기 구축용 인계 문서. 구축 완료 후 삭제 (`public/` 아래라 웹에 노출됨) |
