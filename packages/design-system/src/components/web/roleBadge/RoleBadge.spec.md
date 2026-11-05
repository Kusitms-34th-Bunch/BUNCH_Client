# 컴포넌트: RoleBadge

## 메타데이터

- 소유 경계: design-system `web`(`@app/design-system/web`으로 import). 번치 멤버 역할은 BUNCH 사용자 앱에서만 의미가 있다.
- Status: 구현됨(Storybook 렌더 대조·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `사진함, 번들 작성 컴포넌트` 안 `Role Badge`(node `1240:9314`). Figma `Role`·`Size`를 코드 `memberRole`·`size`로 옮겼다. `role`은 native 속성과 겹쳐 `memberRole`로 정했다.
- 이슈: #75

## 목적과 범위

### 제공하는 동작

- 멤버 역할을 보여 주는 원형 배지. 번치장(`owner`, 주황)·공동 번치장(`coOwner`, 회색)은 왕관, 초안 작성자(`draftAuthor`, 회색)는 연필이다.
- 크기 2개: `sm` 16px, `md` 20px. Figma Role Badge 6종을 모두 지원한다.
- 배경 원과 글리프가 한 SVG에 들어 있는 컬러 그래픽 아이콘 6종(`GraphicRole*Icon`, `svg-graphic`)을 역할·크기로 골라 그린다.

### 제공하지 않는 동작

- 클릭 등 상호작용, 역할 이름 글자. 디자인에 없다.
- 역할 판정. 어떤 멤버가 어떤 역할인지는 호출하는 쪽이 정한다.
- 배경색 변경. 색이 SVG에 고정돼 있어 토큰으로 바꿀 수 없다.

## Public API

- Props: `memberRole`(기본 `owner`), `size`(기본 `sm`), `label`, 그리고 native `<svg>`의 속성(`className` 등. 접근성 계약을 깨는 `role`·`aria-label`·`aria-hidden`·`aria-labelledby`·`tabIndex`와 `children`·`size`는 제외). 클릭 핸들러는 받지 않는 것으로 취급하며, 누르게 하려면 호출하는 쪽이 버튼으로 감싼다.
- 호출자 소유 책임: `label` 문구(i18n), 배치.

## 상태와 동작

- Variant·size: 위 "제공하는 동작" 참고.
- Loading·empty·error·disabled·selected: 해당 없음(디자인에 없음).
- 긴 텍스트·overflow: 글자가 없다. 크기는 SVG의 `width`·`height`(16·20)로 고정이다.

## 접근성

- Semantic element: `<svg>`.
- Accessible name·label: `label`을 주면 `role="img"` + `aria-label`, 없으면 `aria-hidden`(옆에 역할 글자가 있는 경우). 번치장(주황)과 공동 번치장(회색)은 같은 왕관이고 색으로만 구분된다. 그래서 `label` 없이 쓸 때는 옆에 역할 글자를 반드시 둔다.
- 터치 영역: 상호작용이 없어 해당 없음. 버튼·링크로 감싸면 감싸는 쪽이 이름과 터치 영역을 책임진다.
- Keyboard·focus: 상호작용이 없어 focus 대상이 아니다.

## Styling과 의존성

| Figma                    | 값                           | 사용한 것                                          |
| ------------------------ | ---------------------------- | -------------------------------------------------- |
| 원 크기 S / M            | 16 / 20                      | `GraphicRole*SmallIcon` / `GraphicRole*MediumIcon` |
| Owner 배경               | `orange-400` #ffa100         | SVG 안 `#FFA100`(토큰 아님)                        |
| CoOwner·DraftAuthor 배경 | #bfbfbf(Figma에서 변수 아님) | SVG 안 `#BFBFBF`(토큰 아님)                        |
| 왕관·연필 글리프         | 10px, 흰색                   | SVG 안에 포함                                      |

- Figma 노드를 내보내 배경 원과 글리프만 남겼다(`icons.spec.md`의 "그래픽 아이콘" 참고).
- dependency·토큰 추가 없음.
- Storybook state matrix: `Matrix`(역할 3 × 크기 2), `Default`.

## 확인할 항목

- 색 고정 (제안): 배경색이 SVG에 박혀 있어 디자인 색이 바뀌면 SVG를 다시 내보내야 한다. 배지가 고정 표식이라 이 방식을 택했다.
- 역할 구분 (미정): owner와 coOwner가 색만 다른 같은 왕관이다. 흰 글리프와 #BFBFBF 배경의 대비도 낮아 보인다(계산하지 않음). 디자이너 확인.

## 검증

- [x] 사용자 관찰 동작 test
- [x] 지원 variant·edge state story
- [x] public export 영향 확인
- [x] 실행 command와 결과

실행한 검증: `typecheck`, `lint`, `vitest run src/components/web/roleBadge src/icons`(24개 통과), `tokens:check`, `icons:check`, `gen:index:check` 통과. 브라우저 시각 비교와 스크린 리더 확인은 하지 않았다.
