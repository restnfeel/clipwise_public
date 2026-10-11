# lib/ — 서버 로직과 연동

상위 규칙: [../AGENTS.md](../AGENTS.md)

## 구성

| 경로 | 역할 |
|---|---|
| `supabase.ts` | 서버 전용 Supabase 클라이언트(service role) |
| `auth-options.ts`, `auth-utils.ts`, `auth/` | next-auth 설정, 세션 → 사용자 id, 페이지·API 인증 가드 |
| `connector/workspace-scope.ts` | 사용자 → 개인 workspace 결정·생성 |
| `workspace/` | workspace 설정·표시·역할 상수 |
| `sot/` | 원본(외부 소스) 공통 계약, 공급자 목록, 자격 증명 암호화 저장, 원본 문서 원장 |
| `tiro/` | 음성 기록 원본 API 클라이언트·모델·동기화 |
| `knowledge/` | 지식 생성·조회·분류·연결·그래프·아카이브 동기화 |
| `blog/` | 공개 아카이브 조회, 안전한 마크다운 렌더 |
| `mcp/` | MCP OAuth 저장소, 인증키, 공개 주소 |
| `agent/` | 에이전트 실행 기록·평가·자동 기록 |
| `llm/` | 선택적 LLM 호출 (OpenRouter 우선, OpenAI 규격 폴백) |
| `encryption.ts` | AES-256-GCM 암복호화, 키 교체 |
| `notice.ts` | 클라이언트 알림 API (이 폴더에서 유일한 클라이언트용 모듈) |
| `env-validation.ts` | 기동 시 환경 변수 검증 |

## 원칙

- `notice.ts`를 빼면 모두 서버 전용이다. UI 컴포넌트·React를 import하지 않는다. 필요하면 파일 맨 위에 `import "server-only"`.
- 같은 기능을 웹 API와 MCP 도구가 함께 쓰도록, 함수는 `(userId 또는 workspaceIds, 입력) → 결과` 형태로 만든다. `NextRequest`/`NextResponse`에 의존하지 않는다.
- 오류는 코드가 있는 도메인 오류 클래스로 던지고(`new XxxError(code, 한국어 메시지)`), HTTP 변환은 라우트가 한다.

## DB 접근

- 모든 쿼리에 `workspace_id`(`.in("workspace_id", workspaceIds)`) 또는 `user_id` 필터를 붙인다.
- `workspaceIds`가 빈 배열이면 쿼리하지 않고 빈 결과를 돌려준다. 필터를 생략한 "전체 조회"로 떨어지지 않게 한다.
- "기본 workspace", "가장 오래된 workspace" 같은 폴백을 만들지 않는다.
- Supabase 응답은 `if (error)`를 확인하고 도메인 오류로 바꾼다. 오류를 삼키지 않는다.
- `select`에는 필요한 컬럼만 적는다.
- PostgREST 필터 문자열(`.or()`, `.ilike`)에 사용자 입력을 넣을 때는 `\ % _ , ( )`를 이스케이프하거나 제거한다.
- 스키마 컬럼이 없을 때를 대비한 "레거시 폴백 쿼리"를 두지 않는다. 스키마는 마이그레이션으로 맞춘다.

## 외부 연동

- 외부 API 호출은 `lib/<공급자>/` 클라이언트에서만 한다. 라우트·컴포넌트에서 직접 호출하지 않는다.
- 클라이언트는 `fetchImpl`, `baseUrl`, 타임아웃을 주입받게 만들어 테스트할 수 있게 한다.
- 401/403, 429(재시도 간격 준수), 5xx, 타임아웃을 구분해 도메인 오류로 바꾼다.
- 외부 원본은 읽기 전용으로 다룬다. 외부에 쓰는 기능을 추가할 때는 승인 흐름을 먼저 설계한다.
- 새 원본 공급자는 `sot/providers.ts`에 등록하고, 자격 증명은 `sot/credentials.ts`로 암호화 저장한다. 공급자별 저장 테이블을 따로 만들지 않는다.

## 비밀값

- 환경 변수 또는 `encryption.ts`로 암호화한 DB 값에서만 읽는다.
- 키·토큰·원문 본문 전체를 로그에 남기지 않는다. 로그에는 오류 코드와 식별자만.
- 토큰·인증키·인가 코드는 SHA-256 해시만 저장하고 원문 비교는 해시로 한다.
- `ENCRYPTION_KEY`를 바꿀 때는 `ENCRYPTION_KEY_PREVIOUS`로 이전 키를 함께 읽고, 다시 저장하며 새 키로 옮긴다.

## LLM (`llm/`)

- LLM 호출은 이 모듈 한 곳에서만 한다.
- 키가 없으면 `null`을 돌려주고 호출하는 쪽은 그 기능을 건너뛴다. 예외로 앱을 멈추지 않는다.
- 프롬프트에 비밀값을 넣지 않는다. 응답은 JSON 파싱·zod 검증을 거쳐 저장한다.
- 응답 대기는 타임아웃을 두고, 실패해도 원래 작업(지식 저장 등)은 성공으로 남긴다.

## 테스트

- 각 서비스 함수는 범위 필터(다른 workspace 데이터 차단), 빈 범위, 외부 오류, 키 없음 경우를 테스트한다.
- Supabase는 쿼리 빌더 가짜 객체로, 외부 API는 `fetchImpl` 주입으로 대체한다.
