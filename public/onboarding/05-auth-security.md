# 05. 인증·권한·보안

## 1. 인증 (next-auth 4)

| 항목 | 원본 | 공개판 |
|---|---|---|
| 공급자 | Kakao, Google 항상 등록 | Google 항상, Kakao는 두 키가 모두 있을 때만 등록 |
| 신규 사용자 | `users` insert, `status: "pending"`, `user_type`은 `app_settings.default_user_type` | `status: "active"`, 역할 컬럼 없음 |
| Google 이메일 병합 | 같은 이메일의 기존 행에 `google_id` 연결 | 유지 |
| 가입 제한 | 없음 | `ALLOWED_EMAILS`가 있으면 목록 밖 이메일은 `signIn`에서 `false` |
| 탈퇴 사용자 | 다시 로그인 가능 (차단 없음) | `status = 'deleted'`면 `signIn`에서 `false` |
| JWT | `role`, `user_type`, `app_role`을 매번 DB에서 읽음 | 역할 조회 제거 |
| 관리자 메일 | 가입 시 `notifyAdminUserEvent` (Resend) | 제거 |
| `session.user.id` | 공급자 id(Kakao/Google). UUID 변환은 `getUserIdFromSession` | 유지. 개선 선택지: jwt 콜백에서 `users.id`를 `token.uid`로 넣어 매 요청 조회를 줄임 |

페이지 보호: `proxy.ts`의 `withAuth`(`/dashboard*`) + 각 페이지 `requireAuth()`.
API 보호: 모든 라우트 첫 줄에서 `requireApiUserId()`(401) → `workspaceIdsForUser(userId)`.

## 2. 반드시 고칠 보안 문제

원본 코드를 그대로 가져가면 공개판에서 문제가 되는 지점이다. 구현 시 하나씩 테스트로 막는다.

| 번호 | 위치 | 문제 | 공개판 처리 | 테스트 |
|---|---|---|---|---|
| P1 | `app/api/mcp/route.ts:29-33` `staticAuthorized` | 고정 토큰과 일치하면 principal 없이 통과 | 분기 삭제. OAuth 액세스 토큰만 허용 | 고정 토큰 Bearer → 401 |
| P2 | `app/api/mcp/route.ts:39-41` `canWrite` | principal이 없으면 쓰기 허용 | principal 필수, `mcp:learn` scope 있을 때만 쓰기 | `mcp:read`만 가진 토큰으로 `knowledge_apply` → 거부 |
| P3 | `lib/tiro/clipwise-tiro.ts:52,75` `listStoredTiroNotes`, `searchStoredTiroNotes` | `workspaceIds`가 빈 배열이면 필터 없이 **모든 workspace** 노트 조회. `isMissingWorkspaceColumn` 레거시 폴백도 workspace 필터 없이 다시 조회 | 빈 배열이면 즉시 `[]`. 레거시 폴백 분기 삭제(공개판 스키마는 `workspace_id` 필수). `knowledge-service.ts`의 같은 폴백도 삭제 | 빈 배열 → 결과 0건 |
| P4 | `app/api/admin/mcp/keys/route.ts:23-30,47,86` | 관리자면 모든 사용자 키·사용자 목록 조회, 대리 발급, 아무 키나 폐기 | 본인 범위 고정(`user_id = 본인`), `body.userId` 무시 | 다른 사용자 키 id로 DELETE → 404 |
| P5 | `lib/resend.ts:3` | `new Resend(undefined)`가 모듈 로드 시 예외 → 이 모듈을 import한 `[...nextauth]`, 탈퇴 API가 키 없이 깨짐 | `resend`·메일 모듈 전체 제거 | 메일 키 없이 로그인·탈퇴 성공 |
| P6 | `lib/supabase.ts` | 서비스 키가 없으면 `supabaseAdmin`이 anon 키로 동작 | 서비스 키 없으면 기동 실패 | 기동 검증 테스트 |
| P7 | `lib/auth-options.ts` `signIn` | 탈퇴 사용자 재로그인 | 1절 | `deleted` 사용자 → 로그인 거부 |
| P8 | `lib/connector/workspace-scope.ts:29-30,50-127` | 관리자는 데모 workspace, 기본 workspace 폴백, "가장 오래된 workspace" 선택 | 개인 workspace만 | 두 사용자 데이터 분리 테스트 |
| P9 | `lib/tiro/clipwise-tiro.ts:32` `resolveTiroCredentials` | 사용자 키가 아니라 기본 workspace 연결·환경 변수 키 사용 | 본인 연결만, 없으면 "Tiro 키를 먼저 등록해 주세요." | 키 없는 사용자 동기화 → 400 |
| P10 | `cw_tiro_notes` 고유키 | 다른 사용자 노트 덮어쓰기 | 03 문서 S2 | 같은 Tiro workspace를 두 사용자가 동기화 → 각각 보존 |
| P11 | `lib/auth/dev-bridge-context.ts` 분기 (`auth-utils`, `api-session`) | 호출처 없는 우회 경로 | 제거 | — |
| P12 | `lib/encryption.ts` 레거시 CBC 복호화 | 공개판에는 레거시 데이터 없음 | GCM(`v3`)만 남김 | 암복호화 왕복 테스트 |
| P13 | `searchStoredTiroNotes`의 `.or(title.ilike.%term%,...)` | 검색어에서 `\ % _`만 이스케이프. `,` `(` `)`가 들어가면 PostgREST 필터 문법이 깨짐 | 검색어의 `,()`를 제거하거나 공백으로 바꾼 뒤 조립 (workspace 필터는 AND라 범위는 유지됨) | `a,b)` 검색 → 오류 없이 0건 이상 |

## 3. API 범위 점검 목록

구현 후 모든 라우트가 아래를 지키는지 확인한다.

- 첫 단계에서 세션 사용자 확인 → 없으면 401 `{ error: "로그인이 필요합니다." }`
- 모든 `cw_*` 조회·수정에 `workspace_id in (본인 workspace)` 또는 `user_id = 본인`
- 경로 파라미터 id로 찾은 행도 workspace 일치 확인 후 처리 (다르면 404, 존재 여부를 알리지 않음)
- 응답에 `credentials_encrypted`, 키 원문, 토큰 해시, 다른 사용자 이메일을 넣지 않음
- 오류 응답은 한국어 한 문장 + 코드(`{ error, code }`). 외부 API 원문·스택 금지
- 쓰기 MCP 도구(`tiro_sync`, `knowledge_apply`)는 `approved: true` 없으면 실행하지 않음
- 공개 라우트는 `/blog*`, `/`, `/login`, `/terms`, `/privacy`, `/.well-known/*`, `/api/auth/*`, `/api/mcp*`(자체 OAuth 검사)뿐

## 4. MCP 보안 규칙 (원본 유지)

- OAuth 2.1, PKCE `S256`만. 동적 클라이언트 등록의 redirect URI는 `https` 또는 loopback만.
- 액세스 토큰 1시간, 리프레시 토큰 30일, 리프레시 때 회전(`rotate_cw_mcp_refresh_token`).
- 토큰·인가 코드·인증키는 SHA-256 해시만 저장.
- scope: `mcp:read`(조회), `mcp:learn`(지식 draft 저장·Tiro 동기화).
- 인증키(`cw_mcp_...`)는 발급 직후 화면에 1회만 표시. 메일·로그로 보내지 않음.
- 인증키 쿠키(`clipwise_mcp_access`, 30일)는 OAuth 인가 화면에서만 사용.

## 5. 공개 전 점검 (레포 공개 직전 필수)

### 5.1 히스토리

- 원본 레포를 포크하거나 `git filter-repo`로 잘라 쓰지 않는다. 원본 히스토리에는 과거 운영 설정·문서가 남아 있다.
- 정리된 작업 디렉터리에서 `git init` → 첫 커밋 → 새 원격(`clipwise_public`)에 push.

### 5.2 비밀값·식별 정보 스캔

```bash
# 비밀값 패턴
gitleaks detect --no-git --source . --redact

# 운영 식별 정보 (0건이어야 함)
# <원본_SUPABASE_REF>는 원본 운영 Supabase 프로젝트 ref. 값은 원본 담당자에게 받아 로컬에서만 넣는다.
rg -n "clipwise\.(kr|store|app)|digiloglabs|요셉|josephs-dream|<원본_SUPABASE_REF>|supabase\.co" --glob '!docs/**' --glob '!public/onboarding/**'
rg -n "cw_mcp_[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{20,}" .

# .env 류가 추적되지 않는지
git ls-files | rg -n "(^|/)\.env($|\.)" | rg -v "\.env\.example$"
```

- 사업자번호·전화·주소·개인 이메일이 `app/`, `components/`, `docs/`, `public/`에 없는지 확인.
- 원본 `docs/`, `.specs/`, `.harness/`, `sqls/`, `scripts/`는 가져가지 않는다(02 문서).

### 5.3 자산·라이선스

| 항목 | 확인 | 처리 |
|---|---|---|
| `public/fonts/BookkMyungjo_Light.ttf`, `tway_air.ttf` | 폰트 파일 재배포 허용 여부 | 확인 전까지 제외, 시스템 폰트 또는 OFL 폰트(예: Noto Serif KR)로 대체 |
| `public/images/clipwise_logo.png`, `favicon.ico` | Clipwise 상표 공개 사용 여부 | 결정 전까지 중립 아이콘으로 교체 |
| AG Grid Community | MIT | Enterprise 모듈·라이선스 키 사용 금지 유지 |
| 프로젝트 라이선스 | D8 | `LICENSE` 파일 추가 |

## 6. 운영자 안내에 넣을 보안 항목 (공개판 README)

- `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, `NEXTAUTH_SECRET`은 서버 환경 변수로만 넣고 저장소에 커밋하지 않는다.
- `ENCRYPTION_KEY`를 잃으면 저장된 Tiro 키를 복호화할 수 없다(다시 등록해야 함). 교체 시 `ENCRYPTION_KEY_PREVIOUS`에 이전 키를 두고, 키를 다시 저장한 뒤 이전 키를 지운다.
- 외부에 공개된 인스턴스라면 `ALLOWED_EMAILS`로 로그인 가능한 사람을 제한한다.
- HTTPS 뒤에서 운영해야 MCP OAuth가 동작한다(Claude 등 원격 클라이언트는 https 주소 필요).
