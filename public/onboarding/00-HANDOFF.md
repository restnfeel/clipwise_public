# 00. 핸드오프 — clipwise_public 구현 시작 안내

인계일: 2026-10-11
인계자: Clipwise 원본 작업 에이전트
작업자: 이 레포를 바이브 코딩으로 구현할 담당자

## 1. 한 줄 목표

비공개 Clipwise에서 **일반 사용자 기능 8개**(대시보드, 지식함, 지식 아카이브, 내 정보, 에이전트 활동, 원본 모으기(Tiro만), MCP 토큰 관리(본인만), 로그아웃)만 떼어내, 누구나 자기 Supabase에 설치해 쓰는 공개 레포로 만든다.

## 2. 현재 상태

| 항목 | 상태 |
|---|---|
| 작업 레포 | `/Users/restnfeel/workspace/ws_digiloglabs/clipwise_public`, 브랜치 `main`, 커밋 없음 |
| 레포 안 기존 파일 | `AGENTS.md`, `INTENT.md`, `app/AGENTS.md`, `components/AGENTS.md`, `lib/AGENTS.md`(공개판 규칙, 이미 작성), `DESIGN.md`(요청자가 둔 디자인 시스템), `.chisel/`(도구 DB, 커밋 제외), 이 폴더 |
| 규칙 우선순위 | 루트 `AGENTS.md` > 하위 `AGENTS.md` > `INTENT.md` > 이 폴더 문서. 원본 레포의 `AGENTS.md`·`INTENT.md`는 복사하지 않는다 |
| 원본 레포 | `/Users/restnfeel/workspace/ws_digiloglabs/clipwise` (읽기 전용으로만 사용), 기준 커밋 `4e4a4a0` |
| 원격 GitHub 레포 | 아직 없음. 만들 때는 **비공개로 먼저** 만들고 공개 전 점검 후 전환 |
| 설계 문서 | 이 폴더 01~06 + `sql/` (설계 완료, 코드 작업 0%) |
| 스키마 초안 | `sql/0001_clipwise_public_init.sql` — PGlite에서 적용·재적용 검증 완료 |
| 결정 사항 | README의 D1~D9. **D1~D7, D9는 문서 기본값으로 진행.** D8 라이선스는 요청자 확인 전까지 `LICENSE` 파일을 만들지 않는다 |

## 3. 읽는 순서

1. [README.md](./README.md) — 범위, 원칙, 결정 사항
2. [01-scope.md](./01-scope.md) — 기능별로 무엇을 어떻게 동작시킬지
3. [05-auth-security.md](./05-auth-security.md) 2절 — **반드시 고칠 보안 문제 P1~P13** (코드를 옮기기 전에 먼저 읽기)
4. [02-code-inventory.md](./02-code-inventory.md) — 파일별 처리표 (작업 중 계속 참조)
5. [03-database.md](./03-database.md) + [sql/](./sql/0001_clipwise_public_init.sql) — 스키마와 코드가 맞춰야 할 차이 S1~S14
6. [04-env-config.md](./04-env-config.md) — 환경 변수, 하드코딩 제거
7. [06-extraction-plan.md](./06-extraction-plan.md) — 단계·테스트·수용 기준

## 4. 작업 규칙

### 4.1 하지 말 것

- 원본 레포 파일을 수정하거나 원본에서 커밋·푸시하지 않는다. 원본은 복사 원천으로만 쓴다.
- 원본 레포를 포크하거나 `.git` 히스토리를 가져오지 않는다.
- 02 문서에 없는 파일을 "일단" 복사하지 않는다. 필요해 보이면 02 문서에 추가 사유를 적고 가져온다.
- API 키·토큰·Supabase 키를 코드·문서·커밋 메시지에 쓰지 않는다. 문서에는 환경 변수 **이름**만.
- `.env`를 커밋하지 않는다. `.env.example`만.
- `alert()`, `confirm()`, `prompt()`를 쓰지 않는다.
- 관리자 기능·역할 분기(`requireAdmin`, `app_role`, `isAdmin`)를 되살리지 않는다.

### 4.2 UI 규칙 (원본 `INTENT.md`를 그대로 따름)

- 알림은 `lib/notice.ts`의 `notice.*`, `copyWithNotice`만. 화면에서 `react-hot-toast`를 직접 import하지 않는다. 문구는 한국어 한 문장.
- 되돌리기 어려운 동작(삭제, 탈퇴, 키 폐기, 세션 폐기, 아카이브 내리기)은 `components/ui/ConfirmDialog.tsx`를 거친다.
- 페이지 머리는 `CwPageHero`.
- 목록은 데스크탑 `CwDataGrid`(AG Grid **Community만**), 모바일 카드.
- 상세는 **첫 컬럼 셀 클릭**으로만 연다. 행 전체 클릭, "상세보기" 버튼·컬럼 금지.
- 상세는 우측 `CwDetailDrawer`(70%, 넓게 90%, 뒤 흐림, Esc 닫기). 항목 작업 버튼은 모두 드로워 하단, 위험 작업은 왼쪽 끝.
- 드로워가 있는 표에는 작업 컬럼을 두지 않는다. 열린 행은 강조. 로딩은 표 안 오버레이.
- 표가 있는 화면은 `CwRefreshButton`을 필터 줄 오른쪽 끝에.
- 색은 `var(--cw-*)` 토큰과 Tailwind 유틸리티. 전역 CSS를 새로 늘리지 않는다.

### 4.3 서버 규칙

- 라우트 순서: 입력 검증 → `requireApiUserId()` → `workspaceIdsForUser(userId)` → `lib/*` 호출.
- 모든 `cw_*` 쿼리에 본인 workspace 또는 본인 `user_id` 필터. 05 문서 3절 점검 목록을 라우트마다 확인.
- `supabaseAdmin`은 서버 전용. 클라이언트 컴포넌트에서 서버 모듈 import 금지.
- 오류 응답은 `{ error: "한국어 한 문장", code }`. 외부 API 원문·스택 금지.
- 런타임 `process.env` 참조에는 fallback 또는 기동 검증을 둔다.
- AI 호출은 OpenRouter 우선, OpenAI 규격 폴백(`lib/llm/chat.ts` 한 곳).

### 4.4 `DESIGN.md` 다루기

- 루트 `DESIGN.md`는 요청자가 둔 참고 문서다. **적용 여부·범위는 요청자에게 확인한 뒤** 진행한다.
- 적용한다면 `app/globals.css`의 `--cw-*` 토큰 값만 바꾸는 방식으로 한다(컴포넌트 구조·클래스는 그대로).
- 참고 브랜드의 상표명, 로고, 고유 서체(SoDoSans 등)는 쓰지 않는다. 색·간격·모서리 같은 수치만 참고한다.

### 4.5 커밋

- 메시지: `type(scope): 설명` (예: `feat(tiro): 사용자 범위 동기화 API`, `fix(mcp): 고정 토큰 분기 제거`).
- 단계마다 `yarn lint`, `yarn build`(테스트 생긴 뒤에는 `yarn test`)가 통과한 상태로만 커밋.
- `git add`는 의도한 파일만. `.chisel/`은 `.gitignore`에 넣는다.

## 5. 첫날 할 일 (1단계 골격)

1. 이 레포의 `AGENTS.md`, `INTENT.md`, `app/AGENTS.md`, `components/AGENTS.md`, `lib/AGENTS.md`를 읽는다. 원본의 `docs/aggrid/08-clipwise-conventions.md`는 그리드 구현 참고용으로만 본다.
2. 02 문서를 보고 `public/onboarding/manifest.txt`(원본 기준 상대 경로 목록)를 만든다.
3. 원본 루트에서 `rsync -a --files-from=public/onboarding/manifest.txt` 로 복사. 경로 변경 대상은 `git mv`.
4. `.gitignore`(`.chisel/`, `.env`, `.next`, `node_modules` 포함), `.env.example`(04 문서 4절) 추가.
5. `package.json` 정리(02 문서 7절) → `yarn install` → `yarn build`.
6. 빌드 오류 목록을 02 문서의 "수정" 항목과 대조해 빠진 파일이 없는지 확인.
7. 커밋: `chore: 공개판 골격 복사`.

## 6. 막히면

| 상황 | 할 일 |
|---|---|
| 02 문서에 없는 파일이 import로 필요함 | 정말 공개 범위 기능에 필요한지 확인 → 필요하면 02 문서에 행 추가 후 복사, 아니면 import를 끊는다 |
| 원본 동작과 문서가 다름 | 원본 코드가 사실이다. 문서를 고치고 왜 다른지 한 줄 남긴다 |
| 결정 사항 D1~D9를 바꿔야 할 것 같음 | 진행을 멈추고 요청자에게 묻는다 |
| 보안 문제 P1~P13 외 새 문제 발견 | 05 문서 2절 표에 P14부터 추가, 테스트로 막는다 |
| Supabase에 스키마 적용 | 빈 개발용 프로젝트에만. 원본 운영 DB(Clipwise)에는 절대 적용하지 않는다 |

## 7. 완료 보고 형식

단계가 끝날 때마다 요청자에게 아래 형식으로 보고한다.

```text
[단계 N] 완료
- 바뀐 것: (기능·파일 요약)
- 검증: yarn lint / yarn build / yarn test 결과, 수용 기준 통과 항목
- 남은 것·질문: (없으면 "없음")
```

"아마 될 것이다", "확인 못 함"을 통과로 보고하지 않는다. 확인하지 못한 항목은 그대로 적는다.

## 8. 바이브 코딩 프롬프트 예시

```text
public/onboarding/00-HANDOFF.md 규칙을 따른다.
public/onboarding/01-scope.md 8절(원본 모으기)과 05-auth-security.md P3·P9·P10·P13을 구현한다.
원본 /Users/restnfeel/workspace/ws_digiloglabs/clipwise 의 lib/tiro/clipwise-tiro.ts, app/api/admin/tiro/notes/** 를 읽고
공개판에 app/api/tiro/notes/route.ts, app/api/tiro/notes/knowledgeize/route.ts 를 사용자 범위로 만든다.
테스트를 먼저 쓰고(빈 workspaceIds → 0건, 키 없는 사용자 → 400, 두 사용자 노트 분리), 통과시킨 뒤 yarn lint·build까지 확인한다.
```

```text
public/onboarding/00-HANDOFF.md 규칙을 따른다.
05-auth-security.md P1·P2와 01-scope.md 9절을 구현한다.
app/api/mcp/route.ts에서 고정 토큰 분기와 제외 도구(estc_*, briefing_*, geo_audit, draft_*, refresh_stale, tiro_personal_sync)를 지우고,
Tiro 도구는 OAuth 사용자의 개인 workspace만 읽게 한다. 고정 토큰 Bearer → 401 테스트를 먼저 쓴다.
```

## 9. 주의: 이 폴더 위치

이 문서 폴더는 `public/onboarding/`에 있다. Next.js는 `public/` 아래 파일을 그대로 웹에 내보내므로, 앱을 빌드·배포하면 이 문서가 URL로 열린다. **원격 레포를 공개하거나 배포하기 전에 반드시 이 폴더를 지운다**(06 문서 5단계). 운영자용 설치 문서는 4단계에서 `docs/`에 따로 쓴다.
