# 컴포넌트: Dialog

## 메타데이터

- 소유 경계: design-system
- Status: 구현됨(로컬 검증, 실기기 미검증)
- Figma: `791:11810` (SolidButton / TextButton)

## 목적과 범위

- 사용자 응답이 필요한 짧은 확인창. Base UI Alert Dialog의 모달 의미를 사용한다.
- 폼·풍부한 콘텐츠용 일반 Dialog, 바텀시트, 명령형 API, 도메인 작업은 제공하지 않는다.

## Public API

- `Dialog.Root`: `open: boolean`, `onOpenChange(open: boolean): void`, 선택 `onOpenChangeComplete(open: boolean): void`, `children`. 종료 콜백은 전환이 끝난 후 호출되므로 overlay 제거 시점에 쓴다.
- `Dialog.Content`, `Title`, `Description`, `Footer`: 네이티브 속성·ref·className 확장. Content는 div, Title은 h2, Description은 p, Footer는 div. Content의 선택 `backdropClassName`으로 딤 전환을 조절한다.
- `Dialog.Cancel`, `Confirm`: 기존 Button props 중 variant는 primary/secondary/warning으로 제한하고 `appearance?: 'solid' | 'text'`를 받는다. Cancel은 닫힘 요청, Confirm은 onClick만 호출한다.
- `ConfirmDialog`: Root props + `title`, 선택 `description`, `confirmLabel`, 선택 `cancelLabel`, `onConfirm`, `onCancel`, `appearance`, `confirmDisabled`.
- controlled 전용. 실제 작업·비동기 상태·확인 후 닫기는 호출자가 소유한다. Base UI 타입은 공개하지 않는다.

## 상태와 동작

- 바깥 터치는 무시. Cancel·ESC는 실행 없이 닫힘 요청, Confirm은 자동으로 닫지 않는다.
- Solid: 취소 왼쪽, 확인 오른쪽 동일 폭. Text: 오른쪽 정렬. 취소 문구가 없으면 확인 하나.
- 긴 제목·설명은 줄바꿈하고 작은 viewport에서 본문을 스크롤한다. 버튼은 축소하지 않는다.
- 진입·닫힘 모션은 호출자가 Content와 `backdropClassName`으로 지정한다. CSS 전환이 끝나면 Base UI의 `onOpenChangeComplete`를 통해 제거 시점을 알린다. 비동기 확인 중 중복 실행은 confirmDisabled로 막는다.

## 접근성

- role=alertdialog, aria-modal, 제목·설명 자동 연결. Title 필수.
- 최초 초점은 취소 버튼, 없으면 확인 버튼. 키보드 초점 가두기·닫힌 뒤 이전 요소로 복원은 Base UI 담당.
- ESC는 외장 키보드용. Android 네이티브 뒤로가기 연동은 제공하지 않는다.
- 안전한 첫 초점은 우리 정책이며 Apple의 default action 지정과 구분한다.
- 열린 모달의 Toast는 시각적 표시·마우스 액션·접근성 트리 노출을 확인했지만 Tab으로 액션에 도달하지 못한다. 액션 Toast는 닫힌 뒤 사용하고 모달 안의 오류·필수 안내는 본문에 둔다. VoiceOver 낭독은 미검증.

## Styling과 의존성

- @base-ui/react 1.9.0, 기존 Button·TextButton·cn 사용.
- 폭 311px / 최대 320px, 최대 높이 640px은 Figma 기하 값. 작은 화면은 viewport 여백 안으로 제한.
- radius-r9, padding-p11(22), padding-p10(20), padding-p8(16), spacing-s4(8).
- typography-heading-1-semibold / typography-body-1-regular, text-primary / text-tertiary.
- Floated 미수출 토큰은 같은 흰색 surface-primary로 대체. 배경 딤은 Figma(`791:11665`의 딤 레이어)대로 overlay-dim-subtle(검정 10%).
- Story: Solid, Text, 확인 하나, 긴 글, 상호작용·Toast 공존.

## 확인할 항목

- 확정: 외부 터치 무시, ESC 취소, 첫 초점, controlled 확인 동작은 2026-10-17 대화 합의.
- 제안: Floated 대체는 기존 토큰 사용. 딤은 처음 overlay-scrim(60%)이었다가 3단계 화면의 Figma(`overlay-dim-subtle`)에 맞춰 바꿨다.
- 미정: iOS 실기기 VoiceOver·WebView 스크롤/초점과 Android 뒤로가기는 별도 검증.

## 사용 예

```tsx
<ConfirmDialog
  open={open}
  onOpenChange={setOpen}
  title="새 번들을 적용할까요?"
  description="현재 선택한 사진이 초기화됩니다."
  cancelLabel="취소"
  confirmLabel="적용"
  onConfirm={() => {
    applyBundle();
    setOpen(false);
    toast('적용했어요.');
  }}
/>
```

비동기 작업은 호출자가 대기 상태를 `confirmDisabled`에 전달하고 성공 시 닫는다. 오류는 Dialog 본문에 표시한다. 상세 이유는 `docs/decisions/records/009-confirm-dialog-base-ui.md`를 참조한다.

## 검증

- [x] Dialog 동작 test 7개: 접근성 연결, 취소·ESC, 복원, 외부 터치, controlled 확인, 단일 Text/disabled, compound 속성 전달
- [x] Solid/Text/단일 버튼/긴 글/Playground/ToastWhileOpen story
- [x] 생성기로 public export 갱신
- [x] Next 16.2.10 webpack: ConfirmDialog를 import한 임시 client route production build 통과. 임시 route는 제거함. Sentry 업로드 비활성화.
- [x] Storybook 10.5.2 production build 통과
- [x] Chromium 1280×577: 두 기본 형태 모두 311×164px, 제목 20px·설명 16px. 취소/단일 확인 초점, Tab 순환, ESC 닫기·호출 버튼 복원 확인
- [x] 320×480 iframe 긴 글: 창 288×448px, scrollHeight 862px, 가로 넘침 없음, 버튼 높이 48px
- [x] 열린 모달 Toast 공존의 제한 확인(위 접근성 항목)
- [x] DS 전체 test 179개·lint·typecheck, boundaries·agent docs 검사 통과
- [x] 아이콘·barrel 생성물 일치, Dialog 필수 파일 구조 확인
- 전체 `check:generated`는 기존 ignored `src/components/.omc` 런타임 폴더를 컴포넌트로 판단해 실패. 해당 폴더와 검사기는 이번 작업에서 수정하지 않음.
- 번들 단독 측정(앱 실제 증가량 아님): 로컬 macOS/Node 26.10.0/Yarn 4.17.1, Vite 8.1.5 production ES library, React·ReactDOM 외부 처리, AlertDialog 전체 부품 export. 빈 모듈 105 bytes / gzip 112 bytes, AlertDialog 111,223 bytes / gzip 28,741 bytes. CSS·앱 공유 chunk 중복 제거는 측정에서 제외. 성능 개선 효과는 미측정.
