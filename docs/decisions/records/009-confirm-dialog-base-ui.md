# 009: 확인 Dialog의 모달 동작은 Base UI에 맡긴다

- 상태: accepted
- 구현 상태: 로컬 구현·검증. iOS WebView·VoiceOver 실기기 미검증.

## 배경과 결정

Figma `791:11810`의 두 확인창은 제목·설명과 Solid/Text 버튼을 공유한다. 외부 터치로 닫지 않고 취소와 실행을 구분하며, 포커스 가두기·복원·스크롤 방지·ESC·접근성 연결이 필요하다.

`@base-ui/react` 1.9.0의 Alert Dialog를 내부 구현으로 사용한다. 공개 API는 우리 `Dialog.Root/Content/Title/Description/Footer/Cancel/Confirm`과 이를 조립한 `ConfirmDialog`다. Base UI 타입은 노출하지 않는다. Button·TextButton·토큰은 기존 것을 재사용한다. 공개 Trigger·Portal·명령형 overlay API는 추가하지 않는다.

- `open/onOpenChange` controlled 전용. Cancel·ESC는 취소, 바깥 터치는 무시한다.
- 첫 초점은 취소, 없으면 확인, 모두 비활성이면 팝업이다. 이는 안전한 키보드 동작을 위한 프로젝트 정책이다.
- Confirm은 `onConfirm`만 호출한다. 호출자가 성공 시 닫거나 실패 시 열어두며 비동기 중 중복 실행은 `confirmDisabled`로 막는다.
- 문구는 앱 책임이다. 제품에서는 `예/아니요`보다 `취소/적용`처럼 결과를 설명하는 이름을 우선한다. Story의 기본 문구는 Figma 비교를 위해 원본을 유지한다.
- Floated 미수출 토큰은 같은 흰색 `surface-primary`로 대체하고 배경은 기존 `overlay-scrim`을 사용한다. 디자인 토큰 전달 시 재검토한다.

## 비교한 대안

- native `<dialog>`: 별도 의존성 없이 top layer를 제공하지만 외부 Sonner의 배치와 접근이 제한되며 확인창 API·포커스 정책을 별도로 구성해야 한다.
- 직접 모달 구현: 의존성을 줄이지만 포커스·배경 접근 차단·스크롤·중첩 상태를 직접 유지해야 한다.
- Radix: 후보가 될 수 있으나 이번 요구는 Base UI로 충족해 추가 라이브러리를 도입하지 않는다. 미지원 제품이라고 판단한 것은 아니다.

## Toast 공존과 사용 제약

Sonner는 유지한다. 로컬 Chromium에서 열린 모달 위 Toast의 표시·마우스 액션 실행·접근성 트리 노출은 확인했다. 그러나 모달 내부에서 Tab을 누르면 초점이 내부로 순환하여 바깥 Toast 액션에 도달하지 못한다. VoiceOver 낭독은 미검증이다.

따라서 모달 안의 오류·필수 안내는 본문에 표시하고 액션이 필요한 Toast는 모달을 닫은 뒤 표시한다. `Playground` story가 이 사용 예다. `ToastWhileOpen`은 제약을 재현하는 시험용이며 권장 사용 예가 아니다. 내부 inert 속성 우회나 z-index 조작은 추가하지 않는다.

## 검증

- Yarn PnP 설치, Dialog 단위 테스트, 대상 lint·typecheck·생성물, Storybook 및 임시 client route의 Next 16 webpack production build로 호환성을 확인한다. 명령별 결과는 컴포넌트 spec에 기록한다.
- 실제 앱 사용 전 Tailwind에 DS 소스 검색 경로 등록이 필요하다(현재 웹은 tokens.css만 import). 이번 임시 route는 import·client boundary 빌드 시험이며 앱 화면 적용은 아니다.
- 번들 측정은 React/ReactDOM을 외부 처리한 Vite production ES library의 AlertDialog 전체 export와 빈 모듈 비교다. 앱의 실제 증분과 구분한다. 수치·조건은 spec에 기록한다.
- 브라우저 시험은 실기기 검증을 대신하지 않는다. Android 하드웨어 뒤로가기는 WebView bridge 별도 작업이다.

## 재검토 조건과 근거

일반 Dialog·바텀시트가 필요하거나 열린 모달과 액션 Toast 동시 접근이 필수인 경우 재검토한다. 바텀시트는 Base UI Drawer부터 검토하되 실기기 검증 후 결정한다.

- [Base UI Alert Dialog](https://base-ui.com/react/components/alert-dialog)
- [Apple Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts)
- [Apple UIKit Alerts와 Action Sheets](https://developer.apple.com/documentation/uikit/getting-the-user-s-attention-with-alerts-and-action-sheets)
- [Android Dialog](https://developer.android.com/develop/ui/compose/components/dialog)
