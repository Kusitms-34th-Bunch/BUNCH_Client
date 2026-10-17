# 컴포넌트: Badge

## 메타데이터

- 소유 경계: design-system
- Status: 구현됨(Figma 대조·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Badge`(node `637:3630`). Figma 이름과 코드 이름이 같다.

## 목적과 범위

### 제공하는 동작

- 짧은 라벨(예: TIP)을 칩 모양으로 보여 주는 표시용 컴포넌트.
- variant 2개(`weak`, `strong`) × color 2개(`brand`, `gray`) × 크기 3개(`lg`, `md`, `sm`).

### 제공하지 않는 동작

- 클릭 등 상호작용, 아이콘, 숫자 카운트 전용 모양은 디자인에 없어서 만들지 않았다.
- `green`·`pink`·`yellow` 칩 색은 이 디자인에 없어서 포함하지 않았다.

## Public API

- Props: `variant`(기본 `weak`), `color`(기본 `brand`), `size`(기본 `lg`), `children`, 그리고 native `<span>`의 모든 속성(`className`, `ref`, `aria-*` 등).
- 이벤트: 없음. Controlled / uncontrolled: 해당 없음.
- 글자 크기: `typography-*` 토큰이 정하며 `text-sm` 같은 크기 클래스로는 바꿀 수 없다.
- 호출자 소유 책임: 라벨 문구(i18n), 배치.

## 상태와 동작

- Variant·color: weak brand `chip-blue-bg`/`chip-blue-fg`, weak gray `chip-gray-bg`/`chip-gray-fg`, strong brand `chip-blue-fg` 배경 + `text-inversed`, strong gray `chip-gray-fg` 배경 + `chip-gray-bg` 글자.
- 크기: `lg` 패딩 8×4 + `body-2-meduim`(14/21), `md` 패딩 7×3 + `body-3-semi-bold`(13/18), `sm` 패딩 7×3 + `caption-1-medium`(12/16). 반경 `r3`.
- 긴 텍스트: 줄바꿈하지 않고 `overflow-clip`으로 잘린다(`max-w-full`).

## 접근성

- Semantic element: `<span>`(역할 없는 표시용).
- Accessible name·label: 글자가 그대로 읽힌다.
- Keyboard·focus: 상호작용이 없어 focus 대상이 아니다.
- 대비(토큰 hex로 계산, 렌더로 재지 않음): weak brand 3.09:1, strong brand 3.44:1로 일반 텍스트 AA(4.5:1)에 못 미친다. weak·strong gray는 5.81:1로 통과한다. 색은 디자인 값이라 코드에서 바꾸지 않았다. 상태 전달용이 아닌 보조 라벨로 쓴다.
- `color`: native span의 deprecated `color` 속성과 이름이 같지만 Badge의 색 축으로만 쓰이며 DOM에 전달되지 않는다.

## Styling과 의존성

- Token: `bg-chip-*`, `text-chip-*`, `text-text-inversed`, `rounded-r3`, `px-padding-p4`, `py-padding-p2`, `typography-body-2-meduim`·`body-3-semi-bold`·`caption-1-medium`. 선언은 `tv` + `compoundVariants`.
- 허용되는 dependency: `tailwind-variants`.
- Figma 이름 대응: `Weak/Strong`→`weak/strong`, `gray/brand`→`color`, `L/M/S`→`lg/md/sm`, `text`→`children`.
- Storybook state matrix: `Default`, `Matrix`, `LongLabel`.

## 확인할 항목

- `md`·`sm` 패딩 7px/3px (제안): 대응하는 spacing·padding 토큰이 없어(가까운 값 p3=6, p4=8) 임의 값 `px-[7px] py-[3px]`을 썼다. 토큰 추가 또는 6/8 반올림 여부를 디자이너와 정한다.
- `sm` 글자 폭 (제안): Figma 인스턴스가 `w-[19px]`로 고정이나 "TIP" 한정 값으로 보여 적용하지 않고 내용 폭을 따른다.
- brand 대비 (미정): weak·strong brand가 AA에 못 미친다. 디자이너에게 수용 여부를 확인한다.

## 검증

- [x] 사용자 관찰 동작 test 작성
- [x] 지원 variant·edge state story 작성
- [x] public export 영향 확인(`yarn gen:index`로 `badge` export 추가. `yarn check:generated`는 실행하지 않음)
- [x] 실행 command와 결과: `yarn workspace @app/design-system lint`·`typecheck`·`test`(180) 통과
- [x] `bunch-ui-accessibility-reviewer` 검토(brand 대비 외 Critical·High 없음, 시각 검증은 공백)
- [ ] Figma 대조·Storybook 렌더 확인
