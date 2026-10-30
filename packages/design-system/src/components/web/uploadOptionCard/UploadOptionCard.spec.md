# 컴포넌트: UploadOptionCard

## 메타데이터

- 소유 경계: design-system `web`(`@app/design-system/web`으로 import). 사진 올리기 방식을 고르는 BUNCH 사용자 앱의 카드라서 `web`에 둔다.
- Status: 구현됨(Chrome 렌더 대조·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `사진함, 번들 작성 컴포넌트` 안 `UploadOptionCard`(node `1474:14992`). Figma `State=Default / Pressed`를 아래 "상태와 동작"으로 옮겼다.
- 이슈: #79

## 목적과 범위

### 제공하는 동작

- 사진을 올리는 방식 하나(예: 「앨범에서 선택」)를 보여 주고 눌러서 고르는 카드. 왼쪽 원형 사진 아이콘, 제목, 설명, 오른쪽 쉐브론으로 이뤄진다.
- 누르면 `onClick`을 부른다.

### 제공하지 않는 동작

- 실제 파일 선택·촬영·업로드. 눌렀을 때의 동작은 호출하는 쪽이 정한다.
- 비활성 모양과 hover. Figma에 없다.
- 아이콘은 `icon`으로 사진(`photo`, 기본)·카메라(`camera`) 중 고른다. Figma 컴포넌트에는 사진 하나뿐이지만 Bottom Sheet 01 변형(`2487:46357`)의 「카메라로 찍기」가 카메라 아이콘을 쓴다. 다른 아이콘은 지원하지 않는다.
- 글자와 i18n.

## Public API

- Props: `title`(필수), `description`(필수), 그리고 native `<button>`의 속성(`onClick`, `className` 등. `type`·`disabled`·`children`·`title`·`aria-label`·`aria-labelledby`·`aria-describedby`는 제외하고, `title`은 글자 prop으로 쓴다).
- 호출자 소유 책임: 글자 문구, 눌렀을 때의 동작, 목록 배치.

## 상태와 동작

- Default: 배경 `surface-secondary`, 원형 배경 흰색.
- Pressed(`:active`): 카드와 원형 배경에 각각 `overlay-hover`(10%)를 배경 층으로 깐다. 아이콘·글자는 어두워지지 않는다. 75ms Ease Out 전환(동작 줄이기에서는 끔).
- 크기: 높이 최소 82px(Figma 고정 82px), 폭은 부모를 채운다(Figma 343px). 좌우 안쪽 여백 14px, 아이콘 원과 글자 사이 10px, 제목과 설명 사이 2px, radius 8px. 원은 안쪽 여백 10px에 24px 아이콘이라 44px다.
- 긴 글자: 단어 단위로 줄바꿈(`break-keep`, 한 단어가 넘치면 그 안에서 끊김)해서 카드 높이가 늘어난다(제안, Figma는 한 줄만 정의하고 `word-break: break-word`로 그려져 있다). 저장소의 한글 카피 컴포넌트(`PageHeader`, `Dialog`)와 같은 방식이다.

## 접근성

- Semantic element: native `<button type="button">`.
- Accessible name·label: 이름은 제목(`aria-labelledby`), 설명은 `aria-describedby`로 따로 읽힌다. 아이콘과 쉐브론은 장식(`aria-hidden`)이다.
- Keyboard·focus: Tab으로 들어오고 Enter·Space로 누른다. 포커스 윤곽선은 카드 바깥 2px `border-brand`다.
- 터치 영역: 카드 전체(높이 82px 이상)가 눌린다. `touch-manipulation`을 적용했다.
- 색만으로 전달하지 않는다: 오른쪽 쉐브론이 눌러서 이동·선택하는 항목임을 알려 준다.
- 이름은 제목만이라 `aria-label`로 덮을 수 없다(타입에서 제외).
- `button`이라 다른 화면으로 이동하는 용도로 쓸 때 URL 공유·새 탭 열기가 되지 않는다. 이동이 목적이면 호출하는 쪽이 링크로 감싸거나 다른 요소를 쓴다.
- 강제 색상 모드에서는 배경이 사라져 카드 경계가 보이지 않는다(다른 카드형 컴포넌트와 같은 구조, 실제 렌더는 미확인).

## Styling과 의존성

| Figma               | 값                   | 사용한 토큰·utility                                   |
| ------------------- | -------------------- | ----------------------------------------------------- |
| 높이·반경           | 82px, 8px            | `min-h-20.5 rounded-r4`                               |
| 안쪽 여백·간격      | 좌우 14px, 10px, 2px | `px-s7 gap-s5 gap-s1`                                 |
| 배경                | `#F5F5F5`            | `bg-surface-secondary`                                |
| 원형 배경·안쪽 여백 | 흰색, 10px           | `bg-surface-primary p-s5 rounded-full`                |
| 사진 아이콘         | 24px, `#121212`      | `FillPhotoLargeIcon` + `text-icon-primary`            |
| 쉐브론              | 20px, `#BCBEC2`      | `LineChevronRightMediumIcon` + `text-icon-quaternary` |
| 제목                | 16/24 Medium, -0.25  | `typography-body-1-medium text-text-primary`          |
| 설명                | 13/18 Regular        | `typography-body-4-regular text-text-tertiary`        |
| 눌림                | 검정 10%             | `bg-overlay-hover`(배경 층)                           |

- 타이포 이름: Figma `Body-4-Regular`(13/18)와 이름·값이 같은 `body-4-regular`를 쓴다(2026-10-31 토큰 이름을 Figma와 맞춤).
- dependency 추가 없음. 아이콘은 기존 `FillPhotoLargeIcon`, `LineChevronRightMediumIcon`을 쓴다.
- Storybook state matrix: `Default`, 긴 글자 `LongText`, 두 카드를 나란히 놓은 `List`. 눌림은 `:active`라 정지 화면으로 만들 수 없어 story로 두지 않았다.

## 확인할 항목

- 설명 색 (확인): Figma는 설명 글자를 변수 없이 `#777`로 칠했다. 같은 값의 토큰이 없어 가까운 `text-tertiary`(`#535A61`)를 썼다(조금 더 어둡다). 디자이너 확인이 필요하다.
- 제목 색 (확인): Figma는 제목을 변수 없이 `#111318`로 칠했다. 한 단계 차이라 `text-primary`(`#121212`)를 썼다.
- 아이콘 (제안): Figma에는 사진 아이콘만 있어 고정했다. 카메라 등 다른 방식이 같은 카드를 쓴다면 아이콘 교체 API가 필요하다.
- 비활성·hover (제외): Figma에 없어 만들지 않았다.
- 높이 (제안): Figma의 고정 82px를 최소 높이로 바꿔 긴 글자가 잘리지 않게 했다.

## 검증

- [x] 사용자 관찰 동작 test
- [x] 지원 variant·edge state story
- [x] public export 영향 확인
- [x] 실행 command와 결과

실행한 검증: `typecheck`, `lint`, `vitest run src/components/web/uploadOptionCard`(8개 통과), `gen:index:check`, Prettier 통과.

Storybook을 빌드해 Chrome에서 Figma 4배 내보내기와 Default·Pressed(마우스를 누른 채)를 비교했다(Pretendard 설치 환경). 카드 크기 343×82px, 아이콘 원(x 26.3..45.8, y 31.3..50.8)과 쉐브론의 위치·색(`#BCBEC2`)이 두 상태 모두 같고, 제목·설명의 가로 위치도 같다. 제목·설명의 세로 위치는 Figma보다 1px 위(제목 y 23.3 대 24.3, 설명 47.8 대 48.8)인데 줄 높이 24·18 텍스트에서 Figma와 브라우저의 글줄 배치 차이로 보이며 같은 차이가 다른 컴포넌트에서도 있었다. 기본 회색 배경은 토큰 `surface-secondary`가 렌더에서 `#F7F7F8`로 Figma `#F5F5F5`와 2단계 다른데, 토큰을 `#F5F5F5`로 고친 커밋(#103)이 합쳐지면 사라진다. 스크린 리더, 키보드 포커스 링 모양, 강제 색상 모드는 확인하지 않았다.
