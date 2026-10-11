# components/ — React 컴포넌트

상위 규칙: [../AGENTS.md](../AGENTS.md), UI 의도: [../INTENT.md](../INTENT.md), 시각 디자인: [../DESIGN.md](../DESIGN.md)

## 구성

| 폴더 | 내용 |
|---|---|
| `ui/` | 앱 전체 공통 기본 UI (`ConfirmDialog`, `NoticeLayer`) |
| `cw/` | 셸과 공통 화면 부품 (메뉴, 인증 메뉴, 테마 전환, 페이지 머리, 드로워, 새로고침, 프로필) |
| `grid/` | AG Grid Community 공통 래퍼와 셀·테마·로케일·로딩 |
| `knowledge/` | 지식함 화면 |
| `blog/` | 공개 아카이브 화면 |
| `dashboard/` | 대시보드 하위 기능 섹션 (원본 연결, MCP 토큰, 에이전트 활동) |
| `sot/` | 원본 연결·원본 문서 목록 |
| `landing/` | 홈 화면 |
| `Providers.tsx` | 세션, 브랜드, 알림 레이어 등 루트 Provider |
| `Footer.tsx` | 공통 푸터 |

새 기능은 기능 이름 폴더를 만들고, 두 기능 이상에서 쓰는 부품만 `cw/`, `ui/`, `grid/`로 올린다.

## 작성 규칙

- 함수형 컴포넌트, props는 타입으로 명시한다. `any` 금지.
- `"use client"`는 상태·이펙트·이벤트가 필요한 컴포넌트에만 붙인다. 가능한 한 잎(leaf) 컴포넌트로 내린다.
- 파일 이름: 컴포넌트 PascalCase(`KnowledgeListView.tsx`), 헬퍼 kebab-case(`cw-grid-cells.ts`).
- 스타일은 Tailwind 유틸리티 + `var(--cw-*)` 토큰. 색 값을 직접 쓰지 않는다. 전역 CSS를 늘리지 않는다.
- 아이콘은 `lucide-react`.
- 데이터는 `/api/*`만 `fetch`한다. 로딩·오류·빈 상태를 모두 그린다. 실패는 `notice.error`로 알린다.
- 같은 값을 계산으로 얻을 수 있으면 state에 두지 않는다. 이벤트로 일어나는 동작은 effect가 아니라 핸들러에서 처리한다.
- 목록 렌더링에는 안정적인 `key`(id)를 쓴다. 인덱스를 key로 쓰지 않는다.
- 낙관적 업데이트를 하면 실패 시 되돌리고 알린다.
- 무거운 컴포넌트(그래프, 에디터)는 `next/dynamic`으로 지연 로딩한다.

## 공통 부품 사용

- 알림: `notice.*`, `copyWithNotice` (`react-hot-toast` 직접 import 금지)
- 확인: `ConfirmDialog` (`alert`/`confirm` 금지)
- 페이지 머리: `CwPageHero`
- 목록: 데스크탑 `CwDataGrid`, 모바일 카드
- 상세: `CwDetailDrawer` (첫 컬럼 클릭으로만 열기, 작업은 하단)
- 새로고침: `CwRefreshButton`

공통 부품의 props를 바꾸면 사용하는 모든 화면을 같은 변경에서 고친다.

## 하지 말 것

- 서버 모듈(`lib/supabase`, 외부 API 클라이언트, 암호화, 인증 옵션)을 import하지 않는다.
- 비밀값을 props·state·localStorage에 오래 두지 않는다. 발급 직후 표시용 원문은 화면을 떠나면 버린다.
- 권한 판단을 화면에서만 하지 않는다. 숨김은 편의일 뿐이고 차단은 API가 한다.
- 화면마다 알림·모달·스피너를 새로 만들지 않는다.
