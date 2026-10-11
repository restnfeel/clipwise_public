# clipwise_public — 공개 설치판 설계 문서

작성일: 2026-10-11
상태: 설계 초안 (구현 전, 결정 사항 확인 필요)
대상 레포: `clipwise_public` (신규, 공개)
원본 레포: `clipwise` (비공개, 로컬 `/Users/restnfeel/workspace/ws_digiloglabs/clipwise`, 기준 커밋 `4e4a4a0`)
작업 레포: `clipwise_public` (로컬 `/Users/restnfeel/workspace/ws_digiloglabs/clipwise_public`)
**작업자는 [00-HANDOFF.md](./00-HANDOFF.md)부터 읽는다.**

## 목적

일반 사용자가 레포를 받아 자기 Supabase 프로젝트와 서버에 설치해 쓰는 **공개 설치판**을 만든다.
현재 Clipwise에서 일반 사용자에게 열린 기능만 가져오고, 관리자·운영 전용 기능과 그에 얽힌 코드·쿼리·환경 변수를 모두 걷어낸다.

## 포함 기능 (확정 범위)

| 메뉴 | 현재 경로 | 공개판 경로 | 비고 |
|---|---|---|---|
| 대시보드 | `/dashboard` | `/dashboard` | 관리자 온보딩 호출 제거 |
| 지식함 | `/dashboard/knowledge` | `/dashboard/knowledge` | 메일리·노션 초안, 표지 업로드 제외 |
| 지식 아카이브 | `/blog`, `/blog/[slug]`, `/blog/workspace/[id]` | 동일 | 공개 페이지. 관리자 미리보기 제거 |
| 내 정보 | `/dashboard/profile` | `/dashboard/profile` | LinkedIn, YouTube 잔재 제거 |
| 에이전트 활동 | `/dashboard/agent` | `/dashboard/agent` | MCP 실행 기록 조회·평가 |
| 원본 모으기 (Tiro만) | `/dashboard/sources`, `/dashboard/tiro` | `/dashboard/sources` | 두 화면을 하나로 합침. Tiro 외 공급자 제거 |
| MCP 토큰 관리 (본인만) | `/dashboard/admin-mcp` | `/dashboard/mcp` | 관리자 전체 조회·대리 발급 제거 |
| 로그아웃 | `CwAuthNav` | 동일 | |

이 밖에 동작에 꼭 필요한 화면: `/` 랜딩, `/login`, `/mcp-auth`(MCP 인가), `/terms`, `/privacy`.

## 제외 기능

구독 요청, 구독 요청 관리, 사용자 관리, 키 등록, 클래스 관리, 브랜드·사이트 설정, 에이전트 품질, ESTC, 지식 검수(`/dashboard/blog`), AgentC 웹 커넥터(`/api/agent/v1/*`), LinkedIn, JEV 평가, 정기 브리핑, GEO·공개 페이지, 메일리·노션·Slack·Telegram·Plaud 공급자, Bunny 표지 업로드, 관리자 메일 알림.

## 문서 목록

| 문서 | 내용 |
|---|---|
| [00-HANDOFF.md](./00-HANDOFF.md) | 작업자 인계: 현재 상태, 읽는 순서, 작업 규칙, 첫날 할 일, 보고 형식 |
| [01-scope.md](./01-scope.md) | 기능별 화면·API·권한 동작, 메뉴 구성, 사용자 흐름 |
| [02-code-inventory.md](./02-code-inventory.md) | 파일 단위 처리표 (그대로 / 수정 / 신규 / 제외) |
| [03-database.md](./03-database.md) | 테이블 목록, 원본 SQL과의 차이, 수정해야 할 스키마 문제 |
| [sql/0001_clipwise_public_init.sql](./sql/0001_clipwise_public_init.sql) | 빈 Supabase에 한 번에 적용하는 통합 스키마 초안 |
| [04-env-config.md](./04-env-config.md) | 환경 변수 필수·선택 목록, `.env.example` 초안, 하드코딩 제거 목록 |
| [05-auth-security.md](./05-auth-security.md) | 인증·권한 모델, 반드시 고칠 보안 문제, 공개 전 비밀값 점검 |
| [06-extraction-plan.md](./06-extraction-plan.md) | 레포 생성 순서, 단계별 작업, 검증·수용 기준 |

## 핵심 설계 원칙

1. **관리자 개념 없음.** 모든 로그인 사용자는 자기 개인 workspace의 `owner`다. `requireAdmin`, `app_role`, 관리자 메뉴 분기를 코드에서 없앤다.
2. **본인 데이터만.** 모든 API는 세션 사용자 → 개인 workspace 범위로만 읽고 쓴다. 고정 토큰처럼 범위 없이 통과하는 경로는 두지 않는다.
3. **선택 기능은 키가 있을 때만 켠다.** AI 자동 정리(OpenRouter 우선, OpenAI 규격 폴백), Kakao 로그인은 환경 변수가 없으면 화면과 서버 모두에서 꺼진다. 키가 없어서 앱이 죽는 일이 없어야 한다.
4. **스키마는 한 파일.** 빈 DB에 `sql/0001_clipwise_public_init.sql` 하나만 적용하면 동작한다. 원본의 순서 의존·레거시 테이블 참조를 가져가지 않는다.
5. **히스토리 없이 시작.** 비공개 레포를 포크하거나 히스토리를 옮기지 않는다. 정리된 파일만 새 레포의 첫 커밋으로 올린다.
6. **원본과의 차이를 줄인다.** URL, 테이블 이름(`cw_` 접두사), 공용 UI 컴포넌트 이름은 원본과 같게 유지해 이후 수정 사항을 옮기기 쉽게 한다.

## 결정이 필요한 사항

아래 기본값으로 문서를 작성했다. 다르게 정하면 해당 문서를 고친다.

| 번호 | 항목 | 기본값 (문서 반영) | 대안 |
|---|---|---|---|
| D1 | 로그인 방식 | Google 필수, Kakao는 키가 있을 때만 버튼 표시 | Kakao만 / 이메일 매직링크 추가 |
| D2 | 가입 제한 | `ALLOWED_EMAILS`(선택)가 있으면 목록의 이메일만 로그인 | 누구나 로그인 |
| D3 | AI 자동 정리 | `OPENROUTER_API_KEY` 또는 `OPENAI_API_KEY`가 있을 때만 동작, 없으면 규칙 기반 정리만 | 완전 제외 |
| D4 | 지식 아카이브 공개 범위 | 인스턴스 안 모든 workspace의 `published` 글을 공개 목록에 표시 (현행) | 로그인 사용자에게만 표시 |
| D5 | 에이전트 활동 자동 기록 | MCP 쓰기 도구·오류 호출만 규칙으로 기록 (JEV 판정 제거) | `agent_run_*` 도구 명시 기록만 |
| D6 | MCP 토큰 메일 발송 | 제외. 발급 직후 화면에서 1회 표시·복사 | Resend 선택 기능으로 유지 |
| D7 | `users` 역할 컬럼 | `role`, `user_type`, `app_role` 삭제 | 호환용으로 유지 |
| D8 | 라이선스 | 미정 | MIT / Apache-2.0 / AGPL-3.0 |
| D9 | 배포 안내 | `yarn build && yarn start` 일반 Node 서버 + Dockerfile 예시 | 특정 호스팅 가이드 추가 |
