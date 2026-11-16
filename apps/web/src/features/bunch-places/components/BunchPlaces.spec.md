# 페이지: 콕한 장소

## 메타데이터

- Route: `/bunch/places`(`apps/web/src/app/(app)/bunch/places/page.tsx`, #257)
- 소유: `features/bunch-places`. 번치 홈 프로필의 「콕한 장소」 버튼(`BunchHomeScreen` → `BUNCH_HOME_PATHS.places`)에서 들어온다. 경로 상수만 `bunch-home`에 두고 feature는 서로 import하지 않는다.
- Status: UI와 인터랙션 구현됨(#257), 목록·빼기 서버 연결(#414, `GET /pinned-places`·`DELETE /pinned-places/{pinId}`). 실시간·번들 상세 이동·이어 불러오기는 범위 밖. 실기기 전
- API 연결 전에는 `fixtures/places.fixture.ts`와 화면 안의 임시 상태로 그렸고, #414에서 fixture를 지웠다.
- 기능명세: 콕 8.1.1~8.1.9(FEED-10, 기능명세서 「콕」)
- 디자인 출처: Figma 번치 메인 진입 `4096:76060`, 목록 `4096:76101`, 빈 상태 `4096:76353`, 주소 복사 토스트 `4096:76391`, 볼 수 없는 번들 모달 `4164:96354`, 콕에서 빼기 토스트 `4164:96560`, 화면설계서 `4164:91159`

## 목적과 범위

### 포함

- 번치 멤버들이 콕해 둔 장소를 최근 콕한 순으로 모아 보여 준다(8.1.1, 8.1.3).
- 멤버별 필터 칩: 「전체 N」과 멤버 칩(프로필 이미지·이름·장소 수) 중 하나만 고른다(8.1.2).
- 장소 카드(디자인 시스템 `LocationCard`): 장소 이름·주소·「{번치 이름} | {번들 제목}」·더보기(8.1.3).
- 더보기 시트: 「주소 복사하기」·「콕에서 빼기」·「취소」(8.1.4).
- 주소 복사하기: 누른 순간 클립보드에 주소(없으면 장소 이름)를 복사하고(사용자 제스처 안이어야 iOS·WKWebView에서 막히지 않음), 결과 토스트는 시트가 닫힌 뒤에 띄운다(8.1.7).
- 콕에서 빼기: 확인 없이 바로 빼고 토스트의 「되돌리기」로 복구한다. 필터 칩 숫자도 바로 바뀐다(8.1.8).
- 볼 수 없는 번들 카드는 출처 자리에 「볼 수 없는 번들이에요」를 보이고, 누르면 모달(「취소」/「콕에서 빼기」)을 띄운다(8.1.6).
- 빈 상태: 제목·설명·「피드 둘러보기」(피드 탭으로 이동)(8.1.9).

### 범위 외

- 이어 불러오기(8.1.3): 첫 쪽 50개만 받는다(`api/pinnedPlaces.ts`의 `PAGE_SIZE`). 응답의 `nextCursor`로 infinite query로 바꿀 때 연결한다.
- 카드를 눌러 번들 상세로 이동(8.1.5): 번들 상세 route(`/bunches/[bunchId]/bundles/[bundleId]`)는 있지만 `BunchPlaces`가 `onOpenBundle`을 넘기지 않아 번들에서 담아 온 카드는 눌리지 않는다(2026-11-16 확인). 광고(BUNCH SPOT)에서 콕한 카드는 담아 온 번들이 없어 원래 눌러도 이동하지 않는다.
- 아래로 당겨 새로고침(8.1.1). 진입·앱 복귀 때 다시 받는 것은 Query 기본값(5분 지나면 다시 받음)을 따른다.
- 보고 있던 번치가 삭제·내보내진 경우의 안내(8.1.1 예외, 5.2.3).

## Route와 접근

- Path·params·search: `/bunch/places`, params·search 없음.
- 접근 권한·guard: 현재 번치 멤버라면 역할과 관계없이 누구나(8.1.1). 지금 번치는 서버가 고르고(`members/me`의 기본 번치), 소속 번치가 없으면 번치 탭(번치 없음 안내)으로 보낸다. `robots: noindex`.
- Layout·redirect·navigation: 하단 내비게이션 없이 `PageShell`(헤더 + 본문 스크롤)에 연다. 헤더 왼쪽 뒤로가기만 있고 제목은 보이지 않는다(`h1`은 스크린 리더용). 뒤로가기는 `useBackOr`로 이전 화면, 기록이 없으면 번치 홈(`/bunch`). 번치 홈과는 `bunchDrill` 전환으로 오간다(`AppTransitions`).

## 상태와 흐름

- 초기 진입: 「전체」가 선택된 상태. 고른 칩은 화면을 나가면 기억하지 않는다(8.1.2 로직 6).
- Loading: 처음 받는 동안 헤더만 보이고(칩은 개수를 몰라 그리지 않음) 상태 영역이 「콕한 장소를 불러오는 중이에요」를 읽는다(`QueryBoundary`). 칩을 바꿔 새 목록을 받는 동안은 보던 칩·목록을 두고 목록에 `aria-busy`를 단다(`useTransition`).
- Empty: 고른 칩의 장소가 0개이거나 전체가 0개면 같은 빈 상태. 필터 칩은 그대로 둔다. 「전체」는 0개여도 「전체 0」, 멤버 칩은 0개면 숫자를 붙이지 않는다.
- Error·retry: 목록을 받지 못하면 본문에 「일시적인 오류가 발생했어요. 다시 시도해 주세요」와 「다시 시도」(기능명세 8.1.1은 오류 토스트). 클립보드 복사 실패와 빼기 실패는 같은 문구의 토스트이고, 빼기 실패는 다시 받은 목록으로 카드가 돌아온다.
- Disabled·invalid: 없음.
- Success·완료 후 이동: 복사 → 「주소를 복사했어요.」(성공 아이콘). 빼기 → 「콕한 장소에서 뺐어요」 + 「되돌리기」. 두 토스트와 시트·모달에서 고른 동작은 시트·모달이 완전히 닫힌 뒤에 실행해 열린 창 뒤에 가려지거나 낭독이 묻히지 않게 한다.

## 데이터 의존성

- Query: `members/me`(지금 번치) → `GET /pinned-places?size=50&memberId=`(명세 005, 「전체」는 `memberId` 없음). key는 `bunchPlacesKeys.list(bunchId, memberId)`라 번치를 바꾸면 다른 목록이다. 칩 수는 응답의 `totalCount`와 `members[].count`(처음 콕한 멤버 기준), 멤버 이미지가 없으면 기본 프로필 이미지(`DEFAULT_PROFILE_IMAGE`). 닉네임이 없는 멤버는 칩을 그리지 않는다.
- 출처: `sourceType=ADVERTISEMENT`는 「BUNCH SPOT」, `sourceAccessible=false`이거나 번치 이름·번들 제목이 비면 「볼 수 없는 번들이에요」.
- Mutation·cache 영향: 서버에 복구 API가 없어(명세 005·009) 빼면 카드를 화면에서 먼저 숨기고 칩 수를 줄인 뒤, 되돌리기 토스트 시간(5초, `UNDO_DURATION`)이 지나면 `DELETE /pinned-places/{pinId}`를 보낸다. 되돌리면 보내지 않는다. 다른 장소를 또 빼거나(새 토스트가 이전 되돌리기를 대체) 화면을 떠나면 보류한 빼기를 바로 보낸다. 성공·실패 모두 `bunchPlacesKeys.lists(bunchId)`를 보지 않는 칩 목록까지 다시 받고(`refetchType: 'all'`) 숨김을 푼다. 초점은 되돌리기로 다시 생긴 카드만 받는다(칩을 바꿔 새로 보인 카드는 아님).

## UI와 접근성

- Component mapping: `PageShell`, `Header`+`HeaderIconButton`, `PlaceMemberFilter`(feature, `ChipButton` solid·avatar 변형, radio 그룹), `LocationCard`, `MoreMenuSheet`(왼쪽 아이콘, 오른쪽 화살표 없음, 「취소」), `ConfirmDialog`(solid: 취소 왼쪽·콕에서 빼기 오른쪽), `toast`.
- 칩: 높이 40, 칩 사이 6, 「전체」 좌우 12, 멤버 칩 왼쪽 8·오른쪽 10, 프로필 이미지 24. 선택 칩은 `surface-inversed` + 흰 글자. 방향키로 옮기면 바로 선택되고 Tab은 선택된 칩 하나에만 머문다(photo-box의 `MemberFilter`와 같은 방식이며, 이름 뒤 숫자를 괄호 없이 붙여 feature 간 import를 피해 따로 둔다).
- 간격: 헤더 아래 칩 위 16, 칩 아래 첫 카드 24, 카드 사이 4, 좌우 16.
- Keyboard·focus·accessible name: 더보기 버튼 이름은 「{장소 이름} 더보기」. 카드 버튼과 더보기는 따로 포커스된다. 시트·모달은 열기 전 초점으로 돌아간다(Base UI).
- Responsive·긴 텍스트·overflow: 장소 이름·주소는 한 줄 말줄임, 「{번치} | {번들}」은 번들 제목만 말줄임(`LocationCard`). 칩이 화면을 넘으면 가로 스크롤. 빈 상태 설명은 `break-keep`.

## 검증

- [x] 상태별 UI: 개발 서버 Chrome 393×852에서 목록·칩 선택·시트·볼 수 없는 번들 모달·빼기 토스트를 Figma와 대조(빈 상태는 테스트로 확인)
- [x] 관련 test: `places.test.ts`(복사 값), `BunchPlacesScreen.test.tsx`(칩·출처·받는 중·실패·시트·모달·빈 상태), `BunchPlaces.test.tsx`(가짜 서버 목록·칩 필터·복사·빼기 보류와 전송·되돌리기·빼기 실패·받기 실패와 다시 시도·번치 없음), `src/mocks/handlers/koks.test.ts`(목록 handler), route `page.test.tsx`
- [ ] 실기기·스크린 리더 확인

## 확인할 항목

- 「콕에서 빼기」 뒤 초점은 같은 자리에 온 다음 카드의 더보기 버튼(없으면 빈 상태 제목)으로, 「되돌리기」 뒤에는 다시 생긴 카드의 더보기 버튼으로 옮긴다. 토스트의 「되돌리기」는 사라질 때까지 5초이고 Tab으로 가려면 문서 끝까지 지나야 한다(디자인 시스템 토스트 공통, 액션 토스트의 키보드 도달성은 따로 정한다).
- 카드 이동(8.1.5): 번들 상세 route(`/bunches/[bunchId]/bundles/[bundleId]`)는 있지만 이 화면에 `onOpenBundle`을 넘기는 곳이 없어 이동하지 않는다(2026-11-16 확인). 이동 전 서버 재확인과 실패 토스트는 연결할 때 정한다.
- 시트 항목이 Figma처럼 아이콘이 있고 오른쪽 화살표는 없어 `MoreMenuSheet`의 `leftIcon` 항목을 쓴다.
- 취소 버튼 문구: 기능명세는 「취소」, 디자인 시스템 `MoreMenuSheet` 기본값은 「취소하기」다. 이 화면은 기능명세와 화면설계서를 따라 `cancelLabel`로 「취소」를 넘긴다.
- 고른 멤버가 그사이 번치를 나가면 서버가 「전체」 목록을 주고(`selectedMemberId` null) 화면도 「전체」 칩을 고른 것으로 보인다(8.1.2 로직 5).
- 되돌리기 토스트는 손가락·마우스를 올린 동안 닫힘이 멈출 수 있지만 빼기 요청은 5초에 보낸다. 그 뒤 「되돌리기」를 누르면 아무 일도 없다(안내 문구 없음, 디자인 시스템 토스트에 닫힘 알림이 생기면 전송을 거기에 묶음).
- 피드의 장소 콕 시트·광고 카드 「콕 했어요」는 다른 feature의 캐시라, 여기서 뺀 뒤 5분 안에 그 화면으로 가면 콕한 상태로 보일 수 있다(8.1.8 로직 3, 공용 무효화는 `src/shared/query`로 올릴 때).
