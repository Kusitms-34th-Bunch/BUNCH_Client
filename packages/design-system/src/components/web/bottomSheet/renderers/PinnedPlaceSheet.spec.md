# 컴포넌트: PinnedPlaceSheet

## 메타데이터

- 소유 경계: design-system `web` 구역(시트 렌더러)
- Status: 구현됨(로컬 검증, 실기기 미검증)
- Figma: Bottom Sheet 09 `3740:78862`

## 목적과 범위

- 콕한 장소 하나를 눌렀을 때 여는 메뉴 시트. 장소 사진·이름·주소와 「콕했던 번들 보러가기」·「주소 복사하기」·「콕에서 빼기」, 「닫기」.
- 콕한 장소 화면(번치 홈 「콕한 장소」 버튼)은 아직 없다. 항목별 동작(번들 목록 이동, 주소 복사와 결과 안내, 빼기 확인)은 그 화면을 만드는 feature가 맡는다.

## Public API

- `open`, `onOpenChange`, `onOpenChangeComplete`: `BottomSheet.Root`와 같음.
- `placeName`, `address`: 장소 이름(시트 제목)과 주소(시트 설명). 길면 한 줄 말줄임하고 `title`로 전체를 보여 준다(마우스 올림 전용).
- `imageSrc?`: 장소 대표 사진. 없으면 회색 자리.
- `onViewBundles`, `onCopyAddress`, `onRemove`: 세 항목의 동작. 눌러도 시트는 닫지 않는다.

## 상태와 동작

- 「닫기」, 바깥 터치, 끌기, ESC로 닫는다.
- 다른 화면으로 가거나 확인 창을 열 때는 호출자가 먼저 닫는다.

## 접근성

- 장소 이름이 시트 이름(`BottomSheet.Title`), 주소가 설명(`BottomSheet.Description`).
- 사진과 메뉴 아이콘은 장식이다(`alt=""`, `MenuLabel`의 `leftIcon`).
- 「닫기」가 화면에 보이는 닫는 수단이라 숨긴 닫기 버튼을 따로 두지 않는다.

## Styling과 의존성

| Figma                                                             | 구현                                                                                                      |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 장소 줄 패딩 6, 사진 52·r8, 사진과 글자 사이 8                    | `p-padding-p3`, `size-13 rounded-r4`, `gap-s4`                                                            |
| 사진 자리 #d9d9d9                                                 | `bg-surface-tertiary`(#d9d9d9 토큰 부재로 가장 가까운 회색)                                               |
| 장소 이름 Body-2-Medium `text-primary`                            | `typography-body-2-medium text-text-primary`                                                              |
| 주소 Body-4-Regular `text-tertiary`                               | `typography-body-4-regular text-text-tertiary`                                                            |
| 장소 줄과 메뉴 사이 24, 메뉴 사이 8                               | `gap-s12`, `gap-s4`                                                                                       |
| Menu Label(앞 아이콘 20, 화살표 없음)                             | `MenuLabel` `leftIcon`·`showChevron={false}`                                                              |
| 아이콘 hand-click·Copy·Trashcan(Line Medium)                      | `LineHandClickMediumIcon`(새로 추가)·`LineCopyMediumIcon`·`LineTrashcanMediumIcon`, `text-icon-secondary` |
| 「닫기」 SolidButton 48(`surface-tertiary`, 글자 `text-tertiary`) | `Button variant="secondarySubtle"`                                                                        |

## 확인할 항목

- 이름 변동 (기획): 화면설계서에 「콕(가볼 곳) 이름 변동 가능성 있음」이 있었고, 번치 홈 버튼은 2026-11-06 「콕한 장소」로 바뀌었다. 시트 항목 문구도 바뀌면 함께 고친다.
- 「콕에서 빼기」 확인 (미정): 바로 빼는지 확인 창을 띄우는지 Figma에 없다. 호출자가 정한다.
- 사진 자리 색 (제안): Figma #d9d9d9에 맞는 토큰이 없어 `surface-tertiary`(#eaeaea)를 썼다.

## 검증

- [x] test 3개: 시트 이름·설명과 항목 콜백(닫지 않음), 사진 장식·없을 때 회색 자리, 「닫기」 닫기 요청
- [x] Story: Default, LongText
