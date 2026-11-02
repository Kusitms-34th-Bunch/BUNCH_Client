# 컴포넌트: BunchLabel

## 메타데이터

- 소유 경계: design-system `web` 구역
- Status: 구현됨(Storybook 치수 확인, 실기기 미검증)
- Figma: `Bunch_Label` `3534:65660`(Disabled `3534:65659`, Default `3534:65661`, Pressed `3537:65671`). 쓰는 곳: Dialog Label 변형 `3537:65744`

## 목적과 범위

- 테두리 있는 번치 한 줄: 34px 대표 이미지, 이름, 오른쪽 화살표. 눌러서 그 번치에 대한 다음 동작(예: 관리자 권한 넘기기)으로 간다.
- `BunchListItem`(번치 전환 시트)과 모양이 달라(테두리, 34px 이미지, 15px 이름, 화살표) 따로 만든다. 이미지는 `ProfileImage` `XS`를 재사용한다.

## Public API

- `name`: 번치 이름(필수, 접근성 이름). 길면 한 줄 말줄임.
- `imageSrc?`: 대표 이미지. 없으면 `ProfileImage` 기본 바탕.
- native `button` 속성(`onClick`, `disabled` 등)과 `className`. `type`은 항상 `button`.

## 상태와 동작

- 기본, 눌림(overlay-hover 10%를 이미지·바탕 위로 덮음), 비활성(`surface-disabled` 바탕, `border-disabled` 선, 전체 40%).
- 눌렀을 때의 이동은 호출자가 정한다. 목록 의미(`ul`·`li`)도 호출자 담당.

## 접근성

- 이미지와 화살표는 장식이고 이름만 읽는다. 비활성은 native `disabled`라 초점을 받지 않는다.

## Styling과 의존성

| Figma                                                | 구현                                                                  |
| ---------------------------------------------------- | --------------------------------------------------------------------- |
| 흰 바탕, 1px 안쪽 선 `border-tertiary`, r8           | `bg-surface-primary inset-ring inset-ring-border-tertiary rounded-r4` |
| 패딩 좌우 8·위아래 10(높이 54)                       | `px-padding-p4 py-padding-p5`                                         |
| 이미지 34(테두리 `border-tertiary`)와 이름 사이 6    | `ProfileImage size="XS"` + `border`, `gap-s3`                         |
| 이름 Body-2-Medium `text-secondary`                  | `typography-body-2-medium text-text-secondary`                        |
| 화살표 `Line/Icon-M/chevron-right`                   | `LineChevronRightMediumIcon text-icon-quaternary`                     |
| Pressed: overlay-hover 덮개                          | `before:bg-overlay-hover` + `active`                                  |
| Disabled: `surface-disabled`, `border-disabled`, 40% | `disabled:` 같은 토큰과 `opacity-(--semantic-opacity-disabled)`       |

- 선은 Figma처럼 크기에 들어가지 않아야 해서 `border` 대신 `inset-ring`을 쓴다(`border`면 높이 56). 고대비 모드는 box-shadow를 그리지 않아 `forced-colors:outline`으로 같은 자리에 1px 선을 그린다.

## 확인할 항목

- 비활성 이유는 글자로 전달되지 않는다. 비활성 줄을 쓰면 호출자가 설명 문구로 이유를 알린다.
- 긴 이름은 말줄임이라 이름이 비슷한 번치는 화면으로 구분하기 어렵다(접근성 이름에는 전체 이름).
- Pressed의 선 색: Figma 눌림 변형은 선이 검은색이다. 덮개(검정 10%)와 겹친 모습으로 보고 따로 바꾸지 않았다.

## 검증

- [x] test: 버튼 이름·`type`·클릭, 이미지·화살표 장식, 비활성 클릭 막힘
- [x] Story: Default, Disabled, LongName, InConfirmDialog(Dialog Label 변형)
- [x] Storybook Chromium: InConfirmDialog가 Figma `3537:65744`와 같음(311×328, 줄 54·간격 6, 줄 폭 267)
- [ ] 스크린 리더·실기기
