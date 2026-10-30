# 페이지: 사진함 목록(하단 탭 `/photos`)

## 메타데이터

- Route: `/photos`(`apps/web/src/app/(app)/(main)/photos/page.tsx`)
- Status: 목록·멤버 필터·날짜 미확인 아코디언·빈 상태·번치 없음·로딩·오류 UI 구현됨(fixture와 목 동작, 개발 서버 headless Chrome 375×812 실측. 실기기 전). 선택 모드(#126: 고르기·「⋯」 메뉴·저장·번들 만들기·삭제)도 같은 화면에 구현했고 저장·삭제는 목 동작이다. 번치 전환·올리기·날짜 바꾸기·사진 상세 이동은 호출 지점만 있음.
- 디자인 출처: Figma `사진함`(node `1782:30110`)의 `사진함_01~05`, 선택 모드 `사진함_07·08·10~12`, `번치 Empty Space`(`1861:36971`)와 화면 설계서(`1861:30963`). 이슈 #125.
- 기능 spec: `docs/specs/photo-box.md`의 3.1 사진함 탭.

## 목적과 범위

### 포함

- 헤더(번치 대표 이미지·이름·전환 화살표, 「선택」)는 상단에 고정하고, 멤버 필터 칩과 날짜 미확인 아코디언·날짜별 사진 목록은 함께 스크롤한다. 오른쪽 아래 「+」는 고정한다. 하단 탭 막대는 본문 위에 떠 있고(사진이 뒤로 비친다), 목록 끝 여백은 `PageShell`이 막대 + 36px(Figma 사진함_02)로 확보하며 「+」는 막대 위 10px에 둔다.
- 멤버 필터: 「전체」와 멤버(프로필 이미지·닉네임) 칩, 하나만 선택(radio 그룹), 가로 스크롤, 사진이 없는 멤버도 칩을 보인다.
- 사진은 촬영 날짜 섹션으로 나누고 최신 날짜가 위, 섹션 안은 최근 촬영이 앞, 같은 시각이면 업로드 순이다. 한 줄 3장 정사각형, 사이 1px.
- 섹션 날짜: 올해는 「9월 27일 일요일」, 올해가 아니면 요일 없이 「2025년 12월 24일」.
- 「촬영 날짜를 확인할 사진 N장」 아코디언: 기본 접힘, 펼치면 업로드 최신순 3열, 0장이면 숨김. N은 선택한 멤버 기준.
- 빈 상태: 번치에 사진이 없으면 「첫 번째 사진을 공유해 보세요」, 선택한 멤버의 사진이 없으면 「첫 사진을 기다리고 있어요!」.
- 번치 없음: 「참여 중인 번치가 없어요」와 「새 번치 만들기」(`/onboarding/create`)·「초대 링크로 참여하기」(`/onboarding/join`). 헤더·필터·「+」는 없다.
- 로딩(회색 자리표시)·오류(기획 문서의 기본 문구 「일시적인 오류가 발생했어요. 다시 시도해 주세요」와 「다시 시도」), 처리 중이거나 불러오지 못한 사진의 회색 자리표시(Figma에 없는 상태).

- 선택 모드(#126): 「선택」→「취소」, 사진마다 선택 원과 누른 순서 번호(최대 50장, 51번째는 「사진은 한 번에 50장까지 고를 수 있어요.」), 필터 칩에 「전체 (N)」·멤버별 장수(0장이면 숫자 없음, 함께 올린 사진은 올린 멤버 모두에게), 「+」→「⋯」(0장이면 비활성), 하단 탭 막대 숨김.
- 「⋯」 메뉴: 저장·번들 만들기·날짜 바꾸기, 구분선 아래 빨간 삭제. 열면 첫 항목에 포커스, Esc·바깥 누름·항목 선택으로 닫는다.
- 저장: 확인 없이 호출하고 사진마다 점 3개 로딩, 완료하면 선택 모드를 끝내고 「이미지 저장이 완료되었어요.」. 일부 실패는 저장된 사진을 선택에서 빼고 「N장은 저장하지 못했어요. 다시 시도해 주세요.」, 전부 실패는 「일시적인 오류가 발생했어요. 다시 시도해 주세요」(선택 유지).
- 번들 만들기: 1~20장이면 「이 사진들로 번들을 만들까요?」(「아니요」/「예」), 「예」는 `onCreateBundle`(고른 순서)만 부른다. 21장 이상이면 「번들에는 사진을 20장까지 담을 수 있어요.」.
- 삭제: 일반 멤버가 다른 멤버 사진을 섞으면 「내가 올린 사진만 삭제할 수 있어요.」, 아니면 「선택한 사진 N장을 삭제할까요?」 확인 창(「삭제하기」/「취소」, 처음 포커스는 「취소」) 뒤 삭제하고 「사진함에서 사진 N장이 삭제되었어요.」(0장이면 토스트 없음). 함께 올린 사진은 내 이름만 빠진다.
- 실행 직전(확인 창의 확정 포함) 고른 사진이 목록에서 사라졌으면 실행하지 않고 선택에서 빼며 「선택한 사진 중 N장이 사진함에서 사라져 선택이 해제됐어요.」를 띄운다(선택 모드 유지).

### 범위 외(추후 작업 예정)

- 사진 올리기 시트(바텀시트), 번치 전환 목록(바텀시트), 날짜 바꾸기 시트: 「+」·번치 이름은 `onUploadClick`·`onBunchClick` 호출 지점만 있다.
- 사진 드래그(#127), 사진 상세(#128): 사진을 눌러도 이동하지 않는다. 날짜 바꾸기는 `onChangeDate`, 번들 만들기 확정은 `onCreateBundle` 호출 지점만 있다.
- 무한 스크롤·다음 페이지·당겨서 새로고침·삭제된 사진 처리: 목록 API 연결 때 함께 한다.
- iPhone 상태 바·홈 인디케이터(기기 요소. Safe Area는 `AppFrame`이 처리한다)와 하단 탭(`MainTabBar`).

## Route와 접근

- Path·params·search: `/photos`. params는 없다. 임시 `preview` search(`loading`·`error`·`no-bunch`·`empty`)로 상태를 눈으로 확인할 수 있고, route 경계(`lib/preview.ts`의 `parsePreview`)에서 허용 값만 통과시킨다. 알 수 없는 값은 무시하고 운영(`NODE_ENV=production`)에서는 아예 열지 않는다. 제거 조건: 목록 API를 연결하는 PR에서 `preview.ts`·`fixtures/`·page의 `searchParams` 읽기·`usePhotoBox`의 fixture를 함께 삭제한다. 그 전까지는 운영에서도 `/photos`가 fixture(가짜 번치 데이터)를 보여 주므로 로그인·API 연결 전에는 일반 사용자에게 열리지 않아야 한다.
- 렌더링: `searchParams`를 읽어 `/photos`가 정적 prerender 대신 요청마다 렌더되는 동적 route다. 정적 정보뿐인 화면이라 비용은 작고, `preview`를 없애면 함께 사라진다.
- 아직 없는 route: 사진 상세 `/photos/[photoId]`는 #128에서 만든다. 그 전에는 직접 URL로 들어가면 not-found이고, 이 화면에서 사진을 눌러도 이동하지 않는다.
- 접근 권한·guard: 아직 없다(로그인 미구현). 번치 멤버만 볼 수 있어야 하며 서버가 판단한다(`docs/specs/photo-box.md`).
- Layout·redirect·navigation: `(app)/(main)` group의 하단 탭 layout 안에서 `PageShell`을 한 번 쓴다. `robots: noindex`.

## 상태와 흐름

- 화면 상태는 `PhotoBoxState`(`loading`·`error`·`no-bunch`·`ready`)다. `usePhotoBox`가 호출 지점이고 지금은 fixture(`fixtures/photoBox.fixture.ts`)를 돌려준다. API를 연결하면 이 hook만 TanStack Query 상태에서 만든다.
- 멤버 필터는 화면 안 상태다(기본 「전체」). 번치를 전환하면 「전체」로 돌려야 하며, 번치 전환이 생길 때 함께 한다.
- 처리 중(`processing`)·실패(`failed`) 사진과 이미지 로딩 실패(`onError`)는 회색 자리표시이고 접근성 이름은 「처리 중인 사진」·「불러오지 못한 사진」이다.
- 아코디언은 열림 상태를 스스로 갖는다. 열고 닫는 모션은 화면 설계서의 값(340ms, `cubic-bezier(0, 0, 0.35, 1)`)이다. 높이는 `Accordion`이, 좌우 여백·모서리는 이 화면이 같은 값으로 전환하고 `prefers-reduced-motion`에서는 즉시 바뀐다.

- 선택 모드는 화면 안 상태다(`hooks/usePhotoSelectionFlow.ts`). 서버·기기 동작은 `PhotoBoxActions`(`savePhotos`·`deletePhotos`)로 받고, `usePhotoBox`가 목 동작을 준다(저장은 0.8초 뒤 모두 성공, 삭제는 `applyDelete`로 목록에서 반영). API를 연결하면 이 hook만 mutation으로 바꾼다.
- 선택 모드 동안 `HideMainTabBar`를 렌더해 `(main)` layout이 탭 막대를 숨기고 `--main-tab-bar-*` 변수를 0으로 되돌린다. 「⋯」는 그래서 막대가 없는 Figma 위치(`float-gap` 0)에 놓인다.
- 선택 모드를 끝낸 직후의 완료 토스트는 막대가 다시 보이므로 막대 위 10px에 둔다(`TOAST_ABOVE_TAB_BAR_OFFSET`). 사진함 토스트는 모두 목록 폭(343px)으로 펼친다.

## 데이터 의존성

- Query와 enabled 조건: 없음(fixture). 연결 시 `photoKeys.list(bunchId, memberFilter)`(infinite)·`photoKeys.undated(...)`·`bunchKeys.members(bunchId)`(`docs/specs/photo-box.md`의 후보).
- API 계약 확인 항목: 사진 목록(날짜 섹션별, 처리 상태, 올린 멤버들, 날짜 출처), 날짜 미확인 사진, 멤버 목록, 현재 번치(앱 공통 상태). 백엔드 명세 전이라 `PhotoBoxPhoto`·`PhotoBoxMember` 필드는 화면이 필요로 하는 값만 정한 제안이다.

## UI와 접근성

- Component mapping: 헤더는 `core`의 `Header`+`AccountSwitcher`(`avatarSrc` 추가)+`TextButton`, 필터 칩은 `ChipButton`(`solid`·`avatar`, size L), 아코디언은 `Accordion`, 사진 칸은 `PhotoThumbnail`(`onImageError` 추가), 「+」는 `FloatingButton icon="add"`, 번치 없음 버튼은 `Button`.
- Semantic·heading: 화면 제목 `h1`(「사진함」, 화면에는 숨김), 날짜 섹션 제목은 `h2`와 `section`, 아코디언 제목도 `h2`. 사진 목록은 날짜를 이름으로 가진 `ul`이다.
- 멤버 필터: `radiogroup`(「멤버 필터」)과 칩마다 `role="radio"`·`aria-checked`. Tab은 선택된 칩 하나에만 머물고(roving tabindex) 방향키로 이동하면 바로 선택된다(Home·End 지원). `ChipButton`의 `aria-pressed`는 쓰지 않는다.
- 사진: 이미지 `alt`는 호출하는 쪽이 주는 값이다(사진 상세로 가는 이동은 #128).
- 포커스 링: 칩 둘레 링이 가로 스크롤 영역에 잘리지 않도록 스크롤 영역 아래에 4px 여백을 둔다.
- 「+」: 이름 「사진 올리기」, 본문 바로 아래 높이 0 영역에 겹쳐 고정(오른쪽 16px·본문 아래 10px).
- 로딩은 `role="status"`와 「사진함을 불러오는 중이에요」, 오류는 `role="alert"`.
- Responsive·긴 텍스트: 칩 줄은 가로 스크롤, 375px에서 본문 가로 넘침이 없다. 번치 이름은 한 줄로 줄임.

| Figma(`사진함_02`·`번치 Empty Space`) | 값                                                                             | 사용한 토큰·utility                                        |
| ------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| 헤더                                  | 375×48, 좌우 16, `AccountSwitcher` 대표 이미지 28·이름 18/27, 「선택」 32 높이 | `Header`, `AccountSwitcher p-s3 gap-s4`, `TextButton sm`   |
| 칩 줄                                 | 위 18, 칩 높이 40(화면 인스턴스), 칩 간격 6, 좌우 16                           | `ChipButton size="L" h-10`, `gap-s3 px-s8 pt-s9`           |
| 아코디언(접힘)                        | 343×81, radius 8, 칩 줄과 16, 좌우 16                                          | `Accordion`, `mx-s8 mt-s6 rounded-r4`(칩 줄 아래 4px 포함) |
| 아코디언(펼침)                        | 좌우 여백·radius 없이 전체 폭, 사진 3열이 바로 아래                            | `Accordion`, `mt-s6`(좌우 여백·radius 제거)                |
| 날짜 제목                             | 14/21 600 자간 -0.5, 위 16·아래 6·좌 16·우 14                                  | `typography-body-2-meduim pt-s8 pb-s3 pl-s8 pr-s7`         |
| 사진 칸                               | 123×123, 사이 1px, 3열                                                         | `grid grid-cols-3 gap-px`, `PhotoThumbnail`                |
| 「+」                                 | 52, 오른쪽 16, 하단 탭 위 10                                                   | `FloatingButton add`, `right-s8 bottom-s5`                 |
| 빈 상태                               | 가운데, 80×80 자리표시, 14/21 600 `text-quaternary`, 간격 12                   | `PhotoBoxEmpty`, `text-text-quaternary gap-s6`             |
| 번치 없음                             | 자리표시 172×144(102,227), 제목 16/24, 설명 12/16, 버튼 343×48(y479·537)       | `NoBunch`, `Button`·`Button variant="tertiary"`            |

## 검증

- [x] 관련 test: `photoDate.test.ts`(날짜 형식·필터·섹션 정렬·날짜 미확인 분리), `PhotoBoxScreen.test.tsx`(제목·헤더, 섹션 순서와 연도 형식, 처리 중·실패·이미지 오류 자리표시, 「+」, 아코디언 열고 닫기·장수·숨김, 멤버 필터 radio·방향키·roving tabindex, 빈 상태 두 종류, 번치 없음 이동, 로딩·오류) 50개(`preview.test.ts` 포함) 통과.
- [x] 브라우저 렌더 대조(개발 서버, headless Chrome 375×812): 헤더 375×48, 칩 높이 40·간격 6(전체 48·멤버 70), 아코디언 343×81(y122), 「+」 52(x307), 번치 없음 자리표시 172×144(102,227)·버튼 343×48(y479·537)이 Figma 값과 같다. 펼친 아코디언은 전체 폭 회색 헤더 뒤 3열 사진이 이어진다. 방향키 선택 이동과 필터별 장수 변화를 확인했다.
- [x] 선택 모드 test: `selection.test.ts`·`photoActions.test.ts`(순수 로직), `PhotoBoxSelection.test.tsx`(고르기·번호·칩 개수·50장·취소·메뉴 포커스·Esc·바깥 누름), `PhotoBoxSelectionFlow.test.tsx`(저장 성공·일부·전부 실패, 번들 1~20·21장, 삭제 확인·권한·사라진 사진 중단) 통과. 웹 전체 440개 통과.
- [x] 브라우저 렌더 대조(headless Chrome 375×812, Safe Area 34px): 선택 모드에서 「⋯」 y726(Figma 사진함_07과 같음), 탭 막대 숨김, 칩 「전체 (5)」·「은우 (2)」, 메뉴 x187·y508·172×208(아래 끝이 Figma와 같음), 삭제 확인 창 311×164(32, 324)와 버튼 위치가 Figma 사진함_10과 같다.
- [ ] 실기기(iOS WebView) 레이아웃·스크롤·하단 탭과 「+」 간격: 미검증
- [ ] 스크린 리더(VoiceOver) 낭독(radiogroup·아코디언·목록): 미검증
- [ ] 사진 수백 장에서 스크롤·이미지 지연 로딩 성능: 미검증(fixture는 24장)

## 디자이너 확인 항목

- 칩 높이: Figma 화면 인스턴스는 40px인데 `ChipButton` L 컴포넌트는 38px이다. 화면 값(40)을 따랐다.
- 빈 상태·번치 없음 일러스트: Figma가 추후 공유한다고 해서 회색 자리표시다. 빈 상태 자리표시 색(`#efefef`)은 토큰에 없어 `surface-secondary`(`#f5f5f5`)를 썼다.
- `AccountSwitcher`: 기존 컴포넌트는 색종이 아이콘이었는데 Figma 현재 모습은 번치 대표 이미지라 `avatarSrc`를 추가하고 여백을 Figma(`p-s3 gap-s4`)에 맞췄다.
- 로딩·오류·처리 중 사진의 모양은 Figma에 없어 이 PR에서 정한 값이다.
- 삭제 확인 창 문구: Figma와 기획 문서에는 기본 문구(「선택한 사진 N장을 삭제할까요? / 삭제 이후에는 복구할 수 없어요.」)만 있고, 사진 종류별(관리자가 다른 멤버 사진, 함께 올린 사진, 섞임, 작성 중인 번들에 쓰인 사진) 원문이 없다. `getDeleteKind`로 종류는 나눠 두었고 지금은 모든 종류가 기본 문구를 쓴다.
- 선택 모드에서 처리 중·실패 사진(회색 자리표시)은 고를 수 없게 했다. 기획 확인이 필요하다.
- 저장 중 점 3개의 모양(사진 위 `overlay-pressed` 위 가운데)은 Figma에서 크기·배치를 읽지 못해 정한 값이다. 사진 선택 시 번호가 나타나는 150ms 전환(설계서 3번)은 `SelectionIndicator`에 없어 적용하지 않았다.
