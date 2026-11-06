# 컴포넌트: LocationCard

## 메타데이터

- 소유 경계: design-system (`web`)
- Status: 구현됨(스크린 리더·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `Location_Card`(node `3740:77678`, `Status=Default` `3740:77677`, `Status=Status2` `3963:83840`), 콕한 장소 - Flow B 컴포넌트(node `4096:79217`)
- 기능 명세: 콕 8.1.3(장소 카드), 8.1.4(더보기), 8.1.5(카드 눌러 번들로 이동), 8.1.6(볼 수 없는 번들)
- 이슈: #245

## 목적과 범위

### 제공하는 동작

- 콕한 장소 목록에서 장소 하나를 보여 주는 카드. 지도 핀, 장소 이름, 주소, 출처 줄, 오른쪽 위 더보기(⋯).
- 출처 줄은 두 모양이다.
  - 번들에서 담은 장소: 「{번치 이름} | {번들 제목}」. 길면 번치 이름은 그대로 두고 번들 제목 끝을 줄인다(8.1.3 예외).
  - 그 밖: 한 문구만(광고에서 콕한 장소 「BUNCH PICK」, 원래 번들을 볼 수 없는 장소 「볼 수 없는 번들이에요」).
- 카드 누름(`onClick`)과 더보기(`onMore`)는 서로 다른 버튼이다. 더보기를 누른 것은 카드 누름으로 치지 않는다(8.1.3 상세 2).
- 카드를 누르는 동안 검정 10% 겹침(Figma `Status2`).

### 제공하지 않는 동작

- 출처 문구, 번들 이동, 접근 불가 모달, 더보기 시트(「주소 복사하기」·「콕에서 빼기」)는 화면이 정한다.
- 광고에서 콕한 장소처럼 이동할 곳이 없으면 `onClick`을 넘기지 않는다. 그러면 카드는 버튼이 아니고 눌림 모양도 없다.

## Public API

- Props: `placeName`, `address`, `source`(필수), `bundleTitle`, `onClick`, `onMore`, `moreLabel`(기본 `<장소 이름> 더보기`), native `<div>` 속성(`className`은 카드에 적용).
- Figma 이름 대응: `title`→`placeName`, `location`→`address`, `bunch`→`source`, `bundle`→`bundleTitle`, `showDivider`·`showBundle`→`bundleTitle` 유무.
- 호출자 책임: 목록 구조(`ul`·`li`), 카드 사이 간격, 문구.

## 상태와 동작

| 상태                        | 모양                                                                          |
| --------------------------- | ----------------------------------------------------------------------------- |
| 기본                        | 흰 배경, 안쪽 1px `border-tertiary` 선(outline), radius 8                     |
| 눌림(`onClick`이 있을 때만) | 카드 전체에 `overlay-hover`(검정 10%), 75ms ease-out. 동작 줄이기면 전환 없음 |
| 더보기 눌림                 | 점 아이콘 둘레 원형 `overlay-pressed`, 누르는 영역 40px                       |

- 카드 버튼의 누름 영역은 카드 전체로 넓혔다(버튼의 `::before`가 카드를 덮음). 더보기 버튼은 그 위에 있어 따로 눌린다. 버튼 안에 버튼을 넣지 않기 위한 구조다.

## 접근성

- 카드 버튼 이름은 안의 글자 그대로다: 「봄날카페 제주 제주시 애월읍 여행가조 , 제주 3박 4일」. 구분선 「|」은 숨기고 쉼표로 읽게 했다.
- 더보기 버튼은 `aria-label`(기본 「봄날카페 더보기」).
- 지도 핀·점 아이콘은 장식(`aria-hidden`).
- 키보드: 카드 버튼 → 더보기 순서. 카드 버튼에 초점이 오면 카드 안쪽에 `border-brand` 2px 테두리(카드 밖으로 나가지 않아 목록 간격·`overflow-hidden`에 잘리지 않음).
- 색 대비: 장소 이름 `#121212` 18.7:1, 주소 `#535A61` 7.0:1로 통과. 출처 `#969AA0`는 2.8:1로 일반 텍스트 AA(4.5:1)에 못 미친다(Figma 값, 확인할 항목).

## Styling과 의존성

| Figma            | 값                                                                               | 토큰·클래스                                                                                                                              |
| ---------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 카드             | 343×96, 좌우 16·위아래 14, radius 8, 테두리 1                                    | `px-padding-p8 py-padding-p7 rounded-r4 outline -outline-offset-1 outline-border-tertiary bg-surface-primary`(테두리를 크기에 넣지 않음) |
| 핀과 글자 사이   | 10                                                                               | `gap-s5`                                                                                                                                 |
| 핀               | Fill/Icon-M/map-pin 20, `#BCBEC2`, 위아래 2                                      | `FillMapPinMediumIcon`, `text-icon-quaternary`, `py-s1`                                                                                  |
| 이름·주소        | Body-2-Medium `#121212` / Body-4-Regular `#535A61`, 사이 2                       | `typography-body-2-medium text-text-primary`, `typography-body-4-regular text-text-tertiary`, `gap-s1`                                   |
| 주소와 출처 사이 | 10                                                                               | `gap-s5`                                                                                                                                 |
| 출처             | Caption-1-Medium(번치) / Caption-1-Regular(구분선·번들), `#969AA0`, 구분선 폭 12 | `typography-caption-1-medium`·`typography-caption-1-regular`, `text-text-quaternary`, `w-3`                                              |
| 더보기           | Line/Icon-M/dots 20                                                              | `LineDotsMediumIcon`, `text-icon-quaternary`                                                                                             |
| 눌림             | 검정 겹침                                                                        | `before:bg-overlay-hover`                                                                                                                |

- `FillMapPin*Icon` 세 크기를 이번에 아이콘 파이프라인에 추가했다(Figma Icon 프레임 `3225:61378`·`3225:61380`·`3225:61382`).
- 새 dependency 없음.
- Storybook: `Default`, `FromBunchPick`, `UnavailableBundle`, `LongText`, `Static`, `List`.

## 확인할 항목

- 더보기 아이콘 대비: `icon-quaternary`(`#BCBEC2`) 대 흰 배경 1.9:1로, 누를 수 있는 그래픽에 필요한 3:1에 못 미친다. 이 버튼의 유일한 시각 단서라 디자이너에게 색 변경을 요청한다(Figma 값이라 코드에서 임의로 바꾸지 않음). `ProfileListItem` 더보기도 같은 색이다.
- 출처 대비 2.8:1은 「볼 수 없는 번들이에요」 같은 상태 안내도 싣고 있어 우선순위가 높다.
- 카드 버튼에 `aria-haspopup` 같은 속성을 넘길 방법이 없다(나머지 props는 카드 바깥 `div`로 감). 볼 수 없는 번들처럼 누르면 모달이 열리는 경우를 알리려면 화면을 만들 때 prop을 더한다.
- 카드 누름이 번들 상세로 이동하는데 링크(`<a>`)가 아니라 버튼이다. 새 탭 열기 같은 링크 동작은 없다. 필요하면 `href` 변형을 더한다.
- 「볼 수 없는 번들이에요」의 글자 굵기: 번치 이름과 같은 Caption-1-Medium으로 그렸다. Figma에 이 상태가 없다.
- 눌림 겹침의 정확한 투명도: Figma `Status2`는 검정 겹침이고, 캡처 밝기로 10%(`overlay-hover`)로 봤다.

## 검증

- 단위 테스트: 읽는 순서와 구분선 숨김, 카드·더보기 누름 분리, 출처 한 문구와 말줄임, 버튼 없는 표시용, 더보기 이름·말줄임 클래스.
- Storybook(`List`, 폭 343) 측정: 카드 343×96, 안쪽 1px 선 `#EAEAEA`, radius 8, 핀 (16,16) 20×20 `#BCBEC2`, 이름 (46,14) 15/22 500 자간 -0.25 `#121212`, 주소 (46,38) 13/18 400 `#535A61`, 출처 (46,66) 12/16 번치 500 자간 0.25·구분선 폭 12·번들 400 `#969AA0`, 더보기 아이콘 (307,14) 20×20(누르는 영역 40). Figma 값과 같다.
- 눌림 겹침은 클래스로만 확인했고 화면 캡처로 밝기를 대조하지 않았다. 스크린 리더, 실기기는 확인하지 않았다.
