# 컴포넌트: BundleAuthorInfo

## 메타데이터

- 소유 경계: design-system (`web`)
- Status: 구현됨(스크린 리더·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일` `Bundle Author Info`(node `4137:109682`, `Variant=Default·Ad`)
- 기능 명세: `docs/specs/feed.md` 6.1.3·6.1.5
- 이슈: #253

## 목적과 범위

- 기본: 번치 이미지(34)·이름·경과 시간을 한 버튼으로(번치 프로필 이동), 오른쪽에 참여 멤버 묶음.
- 광고: 로고(34), 회색 배지(예: 「BUNCH SPOT」), 홍보 문구, 오른쪽 버튼 자리(`actions`).
- 바깥 여백은 호출자가 정한다. 새 피드 카드(`Bundle Feed Card`)는 번치를 사진 위에 얹어 이 컴포넌트를 쓰지 않는다. Figma 섹션에는 남아 있어 그대로 둔다.

## Public API

- 공통: `imageSrc`, native `<div>` 속성.
- 기본(`variant` 생략): `bunchName`·`time`·`onBunchClick`(필수), `members`·`onMembers`.
- 광고(`variant="ad"`): `badge`·`tagline`(필수), `actions`(콕하기·더보기 버튼, 장소 콕 항목·광고 카드 이슈에서 조립).

## 접근성

- 번치 버튼 이름은 「여행가조 2일 전」(이미지는 장식). 긴 이름은 한 줄 말줄임.

## Styling과 의존성

| Figma     | 값                                                    | 토큰·클래스                                                    |
| --------- | ----------------------------------------------------- | -------------------------------------------------------------- |
| 이름      | Body-2-Semibold 15/22 `#121212`, 아래 -2              | `typography-body-2-semibold text-text-primary -mb-0.5`         |
| 시간      | Caption-1-Regular 12/16, 높이 18                      | `typography-caption-1-regular text-text-tertiary h-4.5`        |
| 광고 배지 | Caption-1-Regular, 좌우 6·위아래 2, 반경 6, `#F5F5F5` | `ColorBadge size="sm" color="gray"`                            |
| 홍보 문구 | Caption-1-Medium 12/16 자간 0.25, 좌우 4              | `typography-caption-1-medium text-text-tertiary px-padding-p2` |

- Storybook: `Default`, `LongName`, `Ad`.

## 확인할 항목

- 광고 배지 글자는 Figma의 「BUNCH SPOT」으로 정했다(명세도 고침). 글자는 호출자가 넘긴다.
- 광고의 「콕하기」 칩은 손 아이콘이라 기존 `ChipButton`(아래 화살표만)으로 그릴 수 없다. 광고 카드 이슈에서 정한다.

## 검증

- 단위 테스트: 번치·참여 멤버 버튼 분리, 광고 배지·문구·버튼 자리.
- Storybook(Chromium) 측정: 피드 카드 안에서 375×54(Figma 54), 광고 375×40, 배지 82×20 `#F5F5F5`·`#535A61`.
