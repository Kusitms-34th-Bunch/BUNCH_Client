# 컴포넌트: CardList

## 메타데이터

- 소유 경계: design-system (`admin` 구역)
- Status: 구현됨(2026-11-27 #592)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `어드민 컴포넌트` > `Card List`(node `7916:106605`). 화면설계서에서는 신고 상세의 신고 내역 항목이다. Figma 이름과 코드 이름이 같다. `core`에 같은 이름이 없어 접두사를 붙이지 않는다.

## 목적과 범위

### 제공하는 동작

- 카드 목록의 항목 하나: 본문 한 줄, 세로 구분선(`|`)으로 나눈 보조 정보 한 줄.

### 제공하지 않는 동작

- 목록 묶음(`ul`/`li`)과 보조 정보 문구 조합(예: 「퇴근런클럽 (신고자: 민수)」)은 호출자가 정한다. Figma의 「신고자:」 같은 문구를 컴포넌트에 넣지 않았다.
- 누르는 동작은 없다(Figma에 상태 변형이 없음).

## Public API

- Props: `title`(ReactNode), `meta`(ReactNode 배열, 항목 사이에 구분선), native `<div>` 속성. 두 줄 모두 `div`로 감싸 block 요소를 넘겨도 DOM 중첩이 깨지지 않는다.
- 호출자 소유 책임: 본문·보조 정보 문구, 목록 묶음.

## 상태와 동작

- 본문 `body-1-medium` `text-secondary`, 보조 정보 `body-4-regular` `text-tertiary`, 구분선 `body-1-regular` `text-quinary`.
- 긴 본문: 줄바꿈한다. 보조 정보가 넘치면 다음 줄로 넘어간다.

## 접근성

- 구분선(`|`)은 장식이라 `aria-hidden`이다.
- 목록으로 쓰면 호출자가 `ul`/`li`로 감싼다.

## Styling과 의존성

| Figma 값                                                                | 토큰·클래스                                                    |
| ----------------------------------------------------------------------- | -------------------------------------------------------------- |
| 바탕 `surface-primary`, 테두리 `border-secondary`, `radius-r5`          | `bg-surface-primary border border-border-secondary rounded-r5` |
| 좌우 `padding-p8`(16), 위아래 `padding-p5`(10), 줄 간격 `spacing-s1`(2) | `px-padding-p8 py-padding-p5 gap-s1`                           |
| 보조 정보 간격 `spacing-s3`(6)                                          | `gap-s3`                                                       |

- 허용되는 dependency: `cn`.
- Storybook state matrix: `Default`, `WithoutMeta`, `LongTitle`.

## 확인할 항목

- 긴 본문 줄바꿈 (제안): Figma는 한 줄(596px)이다. 신고 내용이 길 수 있어 말줄임 대신 줄바꿈으로 둔다.
- 폭 (제안): Figma 596px 고정 대신 부모 폭을 채운다.

## 검증

- [x] 사용자 관찰 동작 test(본문·보조 정보, 구분선 숨김)
- [x] 지원 variant·edge state story
- [x] public export 영향 확인
- [x] 실행 command와 결과: `vitest run src/components/admin`, `eslint`, `tsc --noEmit` 통과(2026-11-27)
- [ ] 브라우저에서 Figma 기준 화면과 시각 비교
