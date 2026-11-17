# 컴포넌트: TextButtonUnderline

## 메타데이터

- 소유 경계: design-system `web` 구역
- Status: 구현됨(Storybook·렌더 비교 전, 실기기 미검증)
- Figma: `Text_Button_Underline`(`6739:45925`: Disabled `6739:45924`, Default `6739:45926`, Pressed `6739:45928`)

## 목적과 범위

### 제공하는 동작

- 목록 줄 안의 보조 동작을 나타내는 밑줄 글자 버튼(약관 및 개인정보의 「전문보기」).
- 기본은 일반 버튼이고, `renderLink`를 주면 링크다(`MenuLabel`과 같은 방식).
- 누르는 동안 `overlay-hover`(10%)를 75ms ease-out으로 덮는다(Figma `While Pressing / Dissolve / Ease out / 75ms`).

### 제공하지 않는 동작

- 화면 이동 전환(Figma `On Click / Dissolve / Ease out / 200ms`)은 라우터·앱 전환 규칙의 일이라 컴포넌트가 다루지 않는다.
- 아이콘, 크기 변형. Figma에 없다.
- 이 컴포넌트가 생기기 전의 다른 밑줄 글자(알림 권한 배너의 「설정으로 이동」, 오류 배너 등)는 바꾸지 않는다(이번 범위 밖).

## Public API

- `children`: 글자이자 접근성 이름.
- native `<button>` 속성(`onClick`, `disabled`, `className` 등). `type`은 `button`으로 고정한다.
- `renderLink({ className, children })`(선택): 링크 요소(예: Next `Link`)에 그대로 붙인다. 이때 버튼 속성은 쓰지 않고 비활성도 없다.

## 상태와 동작

- Default: `text-tertiary`, 12/16 Regular, 밑줄(`decoration-from-font`, `text-underline-position: from-font`).
- Pressed: 글자 뒤에 `overlay-hover`. 동작 줄이기에서는 전환을 끈다.
- Disabled: 글자 `text-disabled`와 전체 40%. 눌림 효과와 클릭이 없다.
- 안쪽 여백 `padding-p1`(2), 모서리 `radius-r2`(4).

## 접근성

- 버튼·링크 이름은 글자다. 링크 모드는 호출자가 넘긴 링크 요소의 역할을 따른다.
- 키보드 초점은 `outline-border-brand` 2px로 표시한다.
- 글자만으로 부족한 이름(예: 어떤 항목의 전문보기인지)은 호출자가 화면 밖 글자로 보충한다.

## Styling과 의존성

| Figma                                       | 구현                                                                         |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| Caption-1-Regular(12/16), `text-tertiary`   | `typography-caption-1-regular text-text-tertiary`                            |
| 안쪽 여백 `padding-p1`, 모서리 `radius-r2`  | `p-padding-p1 rounded-r2`                                                    |
| Pressed `overlay-hover`                     | `before:bg-overlay-hover`, `active:before:opacity-100`                       |
| Disabled `text-disabled`·`opacity-disabled` | `disabled:text-text-disabled disabled:opacity-(--semantic-opacity-disabled)` |

## 확인할 항목

- Pressed 글자색: Figma는 `#4b5157`이지만 같은 값의 토큰이 없다. 가장 가까운 기존 토큰(`text-tertiary` #535a61)을 그대로 두고 배경 눌림만 적용했다. 새 토큰 필요 여부는 디자인에 확인한다 (제안).
- 터치 영역: 글자 12px에 여백 2px이라 높이가 20px 안팎이다. Figma 정의 그대로 두었고, 사용하는 화면이 필요하면 호출자가 `className`으로 영역을 넓힌다 (미정).

## 검증

- [x] 사용자 관찰 동작 test(버튼·비활성·링크)
- [x] 지원 상태 story(Default·Disabled·AsLink)
- [x] public export 영향 확인: `web/index.ts`에 export 추가(`yarn gen:index`로 barrel 동기화)
- [x] 실행 command와 결과: DS test 4개·typecheck·eslint 통과. `yarn check:generated`는 Windows에서 `spawn EINVAL`로 실행하지 못해 CI에서 확인
- [ ] 눌림·비활성의 겹친 불투명도 모습은 Storybook 눌림 상태 story가 없어 코드로만 확인했다. 실기기·Storybook에서 확인한다
