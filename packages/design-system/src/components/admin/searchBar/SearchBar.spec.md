# 컴포넌트: SearchBar

## 메타데이터

- 소유 경계: design-system (`admin` 구역)
- Status: 구현됨(2026-11-27 #595)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `어드민 컴포넌트` > `SearchBar`(node `7601:160810`).
- 이름: core `SearchField`(모바일 form 검색창, 16px 아이콘·Enter 제출)와 역할이 비슷하지만 이름이 겹치지 않고 규격(높이 48px, 20px 아이콘, 테두리)이 달라 별도로 둔다. 접두사는 붙이지 않는다.

## 목적과 범위

### 제공하는 동작

- 검색 아이콘 + 한 줄 입력. 상태: Default(안내 글자), Focused, Filled, Disabled.

### 제공하지 않는 동작

- 제출은 하지 않는다. 화면의 「검색」 버튼·Enter 제출은 호출자가 감싸는 form이 맡는다.
- 지우기 버튼은 Figma에 없어 만들지 않았고, 브라우저 기본 지우기 버튼도 숨긴다.

## Public API

- Props: `aria-label`(필수, 보이는 라벨이 없음), native `<input>` 속성(`value`, `onChange`, `placeholder`, `disabled` 등, `type` 제외). `className`은 바깥 상자에 적용한다.
- 호출자 소유 책임: 검색어 보관, 제출, 안내 글자 문구.

## 상태와 동작

- 안내 글자 `text-disabled`, 입력 글자 `text-tertiary`, 둘 다 `body-3-semibold`.
- Disabled: 전체 흐림 40%.
- 폭: 부모를 채운다(Figma 320px).

## 접근성

- Semantic element: `<input type="search">`(`searchbox` 역할). 아이콘은 장식이다.
- 포커스: Figma에 Focused 모양은 입력 커서뿐이라 바깥 상자에 `outline-border-brand` 윤곽을 더했다. 윤곽은 Tab 등 키보드로 들어왔을 때만 켜고, 마우스로 누르면 커서만 보인다(입력칸은 눌러도 `:focus-visible`이 켜져 마지막 입력 수단으로 판단).

## Styling과 의존성

| Figma 값                                                                          | 토큰·클래스                                                                    |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 바탕 `surface-primary`, 테두리 `border-tertiary` 1px, `radius-r3`, 높이 48        | `bg-surface-primary border border-border-tertiary rounded-r3 h-12`             |
| 좌우 `padding-p8`(16), 위아래 `padding-p5`(10), 아이콘·글자 간격 `spacing-s5`(10) | `px-padding-p8 py-padding-p5 gap-s5`                                           |
| 아이콘 `Line/Icon-M/search` 20px `icon-quaternary`                                | `LineSearchMediumIcon text-icon-quaternary`                                    |
| 글자 `Body-3-Semibold`, 안내 `text-disabled`, 입력 `text-tertiary`                | `typography-body-3-semibold text-text-tertiary placeholder:text-text-disabled` |
| Disabled `opacity-disabled`                                                       | `opacity-(--semantic-opacity-disabled)`                                        |

- Storybook state matrix: `Default`, `Filled`, `Disabled`.

## 확인할 항목

- 포커스 윤곽 (확정): Figma Focused는 커서만 보인다. 키보드 사용자를 위해 키보드로 들어왔을 때만 윤곽을 더했다(2026-11-27 사용자).

## 검증

- [x] 사용자 관찰 동작 test(이름, 입력, 비활성)
- [x] 지원 variant·edge state story
- [x] public export 영향 확인
- [x] 실행 command와 결과: `vitest run src/components/admin`, `eslint`, `tsc --noEmit` 통과(2026-11-27)
- [ ] 브라우저에서 Figma 기준 화면과 시각 비교
