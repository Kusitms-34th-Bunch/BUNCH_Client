# 컴포넌트: BottomSheet

## 메타데이터

- 소유 경계: design-system `web` 구역(apps/web 모바일 화면 전용)
- Status: 구현됨(로컬 검증, 실기기 미검증)
- Figma: Bottom Sheet 세트 `2500:50688`(변형 01~08)

## 목적과 범위

### 제공하는 동작

- 화면 아래에서 올라오는 모달 시트의 틀: 손잡이, 제목·부제, 닫기 버튼, 스크롤되는 본문, 하단 버튼 영역.
- 모달 동작(포커스 가두기·복원, 배경 스크롤 잠금, ESC, 바깥 터치 닫기, 아래로 끌어 닫기, 가상 키보드 보정)은 Base UI Drawer에 맡긴다.

### 제공하지 않는 동작

- 시트별 내용(사진 올리기 카드, 달력, 번치 목록, 신고 사유 등). Figma 변형마다 시트 렌더러(`PhotoUploadSheet` 등)가 이 부품으로 조립한다(아래 "조합 규칙").
- snap point(반쯤 열린 상태), 중첩 시트, Trigger·명령형 API. 필요해지면 추가한다.
- Android 하드웨어 뒤로가기 연동(WebView bridge 별도 작업).

## Public API

- `BottomSheet.Root`: `open`, `onOpenChange(open)`, 선택 `onOpenChangeComplete(open)`, 선택 `disablePointerDismissal`, `children`. controlled 전용.
- `BottomSheet.Content`: div 속성·className·style 확장. 선택 `handle`(기본 true), `backdropClassName`.
- `BottomSheet.Header`: 2열 grid div. 제목·부제는 왼쪽 열, 닫기는 오른쪽 열에 자동 배치. 다른 배치(Figma 02)는 className으로 바꾼다.
- `BottomSheet.Title`(h2), `Description`(p): 시트의 접근성 이름·설명으로 연결.
- `BottomSheet.Close`: 20px 닫기 아이콘 버튼(누르는 영역 40px). 접근성 이름 기본값 `닫기`, `aria-label`로 바꿀 수 있다.
- `BottomSheet.Body`: 남은 높이를 채우고 넘치면 스크롤하는 div.
- `BottomSheet.Footer`: 하단 버튼을 세로로 쌓는 div. 버튼은 기존 `Button`을 넣는다.
- 호출자 소유 책임: 문구, 열림 상태, 버튼 동작, 닫힌 뒤 처리. Base UI 타입은 공개하지 않는다.

## 상태와 동작

- 열기·닫기: Figma 공통 모션. `cubic-bezier(0,0,0.35,1)`, 열기 340ms·닫기 160ms, 아래에서 위로 이동하며 투명도 40%→100%. 동작 줄이기에서는 이동 없이 투명도만 바뀌도록 의도했다(브라우저 에뮬레이션 미확인).
- 끌어내리기: 손잡이뿐 아니라 시트 어디서든 아래로 끌면 따라 내려오고, 놓으면 속도·거리에 따라 닫힌다(Base UI 기본). 배경 딤은 끄는 만큼 옅어진다. 위로 끌면 움직이지 않는다(Figma에 위로 늘어나는 동작이 없음).
- 바깥 터치: 기본은 닫는다. 입력 중인 시트는 `disablePointerDismissal`로 막는다.
- 높이: 내용 높이만큼, 최대는 화면 위 safe area + 24px까지. 넘치면 `Body`만 스크롤하고 제목·하단 버튼은 고정된다.
- 폭: 앱 프레임과 같은 `--app-max-width`(430px). 변수가 없으면 화면 폭.
- 아래 여백: `--safe-area-bottom`(없으면 `env()`) + 8px. Figma의 홈 인디케이터 34px 영역이 safe area에 해당한다.
- 긴 제목·부제는 단어 단위로 줄바꿈한다(Dialog와 같은 `break-keep` + `wrap-break-word`).

## 접근성

- role=dialog, aria-modal(Base UI). Title이 접근성 이름, Description이 설명. 제목이 화면에 없으면(Figma 02·06) `className="sr-only"`로 Title을 둔다. Title을 빠뜨리면 이름이 없어지며 타입으로 막지 않는다. `Content`에 `aria-label`을 주는 방법도 가능하다.
- 열면 시트 안으로 초점을 옮기고 가두며, 닫히면 연 요소로 되돌린다.
- 손잡이는 장식이라 `aria-hidden`. 끌기 대신 닫기 버튼·ESC·바깥 터치로 닫을 수 있어야 하므로, 제목 영역에 Close가 없는 시트는 Footer에 닫는 버튼(「취소하기」 등)을 둔다.
- 본문은 `overscroll-behavior: contain`으로 배경 스크롤이 번지지 않는다.

## Styling과 의존성

- `@base-ui/react` 1.9.0 Drawer(이미 설치, Dialog와 같은 패키지), `LineCloseIcon`, `cn`.

| Figma                                   | 구현                                               |
| --------------------------------------- | -------------------------------------------------- |
| 배경 `surface/surface-primary`          | `bg-surface-primary`                               |
| 위 모서리 `radius-r10`(24)              | `rounded-t-r10`                                    |
| 손잡이 영역 padding 10, 막대 52×7       | `p-padding-p5`, `h-1.75 w-13 rounded-full`         |
| 손잡이 색 `#d9d9d9`(토큰 없음)          | `bg-border-secondary`(#e1e2e5, 가장 가까운 토큰)   |
| 섹션 간격 `spacing-s8`(16)              | `gap-s8`                                           |
| 좌우 여백 `padding-p8`(16)              | `px-padding-p8`                                    |
| 제목 Heading-1-Semibold, `text-primary` | `typography-heading-1-semibold text-text-primary`  |
| 부제 Body-3-Semibold, `text-quaternary` | `typography-body-3-semi-bold text-text-quaternary` |
| 제목·부제 간격 `spacing-s2`(4)          | `mt-s2`                                            |
| 닫기 `Line/Icon-M/Close` 20             | `LineCloseIcon size="md"`, `text-icon-primary`     |
| 하단 위 여백 `padding-p7`(14), 간격 8   | `pt-padding-p7 gap-s4`                             |
| 하단 버튼 SolidButton 48                | 기존 `Button`(secondary·tertiary·primary)          |
| 배경 딤(Figma에 없음)                   | `bg-overlay-dim-subtle`(Dialog와 같음)             |

- Story: Default, HiddenClose, PointerDismissalDisabled, LongBody(틀 동작). Figma 변형별 모습은 각 시트 렌더러 story에서 확인한다.
- 부제 글자 토큰 (확정): Figma `Body-3-Semibold`(14/600/21/-0.5)와 값이 같은 `typography-body-3-semi-bold`를 쓴다. 이름도 같다.

## 확인할 항목

- 제목 크기 (제안): 변형 01은 18px(Heading-2), 04·07은 20px(Heading-1). 다수인 20px을 기본으로 하고 01은 `className`으로 바꿀 수 있다. 디자이너 확인 필요.
- 위 모서리 (제안): 변형 02만 20px, 나머지는 24px(`r10`). 24px로 통일.
- 손잡이 색 (제안): `#d9d9d9` 토큰이 없어 `border-secondary`(#e1e2e5) 사용. 디자이너에게 토큰 요청.
- 배경 딤 (제안): Figma 시트 프레임에 딤이 없어 Dialog와 같은 `overlay-dim-subtle`(검정 10%) 사용.
- 바깥 터치·끌어내리기로 닫기 (제안): Figma에 손잡이가 있어 끌어내리기를 켜고, 바깥 터치도 기본으로 닫는다. 신고처럼 입력이 있는 시트는 호출자가 `disablePointerDismissal`을 준다.
- 공통 모션 `40%→100%` (제안): 토스트 행과 같은 표기라 투명도로 해석.
- 신고 시트의 닫기 버튼 (제안): Figma 07·08에는 닫기가 없고 바깥 터치도 막혀 끌기·ESC로만 닫힌다. 터치 스크린리더 사용자를 위해 Story에는 `Close`를 넣었다. 디자이너 확인 필요.
- 입력 중 닫힘 (미정): `disablePointerDismissal`은 바깥 터치만 막고 끌기·ESC는 입력 중에도 닫는다. 입력을 지킬지(닫기 전 확인 등)는 신고 기능 구현 때 정한다.
- 초기 초점 (제안): Base UI 기본값으로 시트 안 첫 번째 누를 수 있는 요소로 이동한다(메뉴 시트는 첫 메뉴 행). 시트 화면이 다른 첫 초점을 요구하면 `Content`에 `initialFocus` prop을 추가한다.
- 실기기 (미정): iOS WKWebView의 끌기·가상 키보드·VoiceOver, Android 뒤로가기.

## 조합 규칙

- Figma에 그려진 시트(Bottom Sheet 01~08)는 이 폴더의 `renderers/`에 시트 렌더러로 둔다. 새 렌더러는 기존 렌더러 파일 4개(`.tsx`·`.test.tsx`·`.stories.tsx`·`.spec.md`)를 복사해서 시작한다. 렌더러는 이 부품을 조합하고 문구·목록·콜백만 props로 받는다. API 호출·저장 상태는 넣지 않는다.

  | Figma | 렌더러                 |
  | ----- | ---------------------- |
  | 01    | `PhotoUploadSheet`     |
  | 02    | `DateChangeSheet`      |
  | 03    | `BundleRecommendSheet` |
  | 04    | `BunchSwitchSheet`     |
  | 05    | `AdminTransferSheet`   |
  | 06    | `MoreMenuSheet`        |
  | 07·08 | `ReportSheet`          |

- 렌더러를 디자인 시스템에 두는 이유: `apps/web`에는 Storybook이 없어 Figma 대조를 디자인 시스템 story에서 한다. 더보기·신고·번치 전환은 여러 기능이 쓴다.
- 화면에 닫기 버튼이 없는 시트(Figma 01 등)도 숨긴 닫기 버튼을 둔다. 끌기·바깥 터치는 스크린 리더로 닿기 어렵기 때문이다. 「취소하기」 같은 하단 닫기 버튼이 있으면 생략한다.
  - 클래스: `<BottomSheet.Close className="sr-only focus-visible:not-sr-only focus-visible:-m-s5 focus-visible:p-s5" />`
  - `not-sr-only`가 padding·margin을 지우므로 누르는 영역(40px)을 `focus-visible`에서 다시 준다.
- 선택처럼 열 때마다 초기화할 state는 `BottomSheet.Content` 안쪽 컴포넌트에 둔다. 닫히면 내용이 내려가 함께 사라진다. `Root`의 직접 자식에 두면 닫혀도 남는다.
- 앱 `features`는 렌더러를 여는 hook만 만든다. 데이터 연결과 동작(저장, 이동, 토스트)은 hook이 맡는다.
  - hook은 `overlay-kit`의 `overlay.open(({ isOpen, close, unmount }) => …)`로 연다. 예: `features/onboarding/hooks/useExitFlowDialog.tsx`.
  - 연결: `open={isOpen}`, `onOpenChange={(open) => !open && close()}`, `onOpenChangeComplete={(open) => !open && unmount()}`. `unmount`는 닫힘 모션이 끝난 뒤 실행된다.
- 시트 안 버튼이 다른 화면(앨범·카메라 등)을 열면 먼저 `open`을 `false`로 바꾼다. 열어 둔 채 띄우면 초점 가두기·스크롤 잠금과 겹친다.

## 사용 예

```tsx
<BottomSheet.Root open={open} onOpenChange={setOpen}>
  <BottomSheet.Content>
    <BottomSheet.Header>
      <BottomSheet.Title>번치 전환하기</BottomSheet.Title>
      <BottomSheet.Close />
    </BottomSheet.Header>
    <BottomSheet.Body>{/* features의 목록 */}</BottomSheet.Body>
    <BottomSheet.Footer>
      <Button variant="tertiary">새로운 번치 추가하기</Button>
    </BottomSheet.Footer>
  </BottomSheet.Content>
</BottomSheet.Root>
```

결정 배경은 `docs/decisions/records/014-bottom-sheet-base-ui-drawer.md`를 참조한다.

## 검증

- [x] 동작 test 6개: 이름·설명 연결, 닫기 버튼과 초점 복원, ESC, 초점 가두기, 손잡이 숨김·생략, 바깥 터치 막기
- [x] Story 5개
- [x] 생성기로 `web` barrel export 갱신
- [x] 대상 lint·typecheck·test
- [x] Chromium(Storybook, 1280×577): radius 24, 손잡이 영역 27·막대 52×7, 섹션 간격 16, 제목 20/26 semibold, 닫기 아이콘 20·누르는 영역 40·오른쪽 여백 16, 하단 위 여백 14, 버튼 높이 48, 가로 넘침 없음
- [x] 기본 바깥 터치: Storybook에서 시트 밖을 누르면 닫힘. 배경 딤 opacity 1·검정 10%(끌기 연동 `calc` 유효)
- [x] 긴 본문: 시트 위 끝이 화면 위 24px에서 멈추고 Body만 스크롤(보이는 높이 460 / 전체 1240)
- [ ] 375px 폭 렌더 비교(브라우저 도구의 viewport 변경 미확인)
- [ ] `prefers-reduced-motion` 에뮬레이션에서 이동 없음
- [ ] 실기기 끌어내리기·가상 키보드·VoiceOver
