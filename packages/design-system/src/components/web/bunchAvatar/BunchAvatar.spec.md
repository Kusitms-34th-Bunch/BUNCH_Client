# 컴포넌트: BunchAvatar

## 메타데이터

- 소유 경계: design-system `web`(`@app/design-system/web`으로 import)
- Status: 구현됨(Storybook 렌더를 Figma 값과 측정으로 대조함. 실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `온보딩 컴포넌트` 안 `CreateBunchCard/BunchAvatar`(node `637:3712`).

## 목적과 범위

### 제공하는 동작

- 번치 대표 이미지를 원형으로 보여 주고 오른쪽 아래에 카메라 버튼(42px 원, 어두운 회색, 흰 카메라 아이콘 24px)을 겹쳐 그린다.
- `onCameraClick`을 주면 카메라 버튼이 나오고, 주지 않으면 읽기 전용 아바타다.

### 제공하지 않는 동작

- 이미지 촬영·선택·업로드. 버튼을 누르면 `onCameraClick`만 호출하고 이후 처리(쉘의 네이티브 카메라, 파일 선택)는 호출하는 쪽이 한다.
- 기본 이미지(구름 마스코트). 디자인 시스템에 이미지 파일이 없어서 호출하는 쪽이 `src`로 넘긴다.

## Public API

- Props: `src`, `alt`(기본 빈 문자열), `onCameraClick`, `cameraLabel`(기본 「사진 변경」), 그리고 native `<div>` 속성(`className` 등).
- 호출자 소유 책임: 이미지 주소와 대체 글, 기본 이미지, 카메라 버튼의 동작, 버튼 이름 문구(i18n).

## 상태와 동작

- 이미지 있음: 154×158 원 안을 `object-cover object-bottom`으로 채운다.
- 이미지 없음(`src` 없음): 이미지 없이 빈 원(`surface-secondary`)이다. Figma에 정의된 상태가 아니다(확인할 항목).
- 카메라 버튼 있음/없음: `onCameraClick` 유무로 정해진다.
- 눌림·호버·비활성은 Figma에 없어 구현하지 않았다.

## 접근성

- 이미지: `alt`를 주면 `img`로 읽히고, 비우면 장식(`alt=""`)으로 숨겨진다.
- 카메라 버튼: native `<button type="button">`, 이름은 `cameraLabel`이다. form 안에서 눌러도 제출하지 않는다. 아이콘은 `aria-hidden`이다.
- Keyboard·focus: Tab으로 이동하고 Enter·Space로 누른다. 포커스 윤곽선 2px `border-brand`(저장소 공통 방식).

## Styling과 의존성

| Figma         | 값                           | 사용한 토큰·utility                                 |
| ------------- | ---------------------------- | --------------------------------------------------- |
| 크기          | 154×158, radius full         | `w-38.5 h-39.5 rounded-full`(토큰 없음, 기본 scale) |
| 카메라 버튼   | 42×42 원, `icon-tertiary`    | `size-10.5 rounded-full bg-icon-tertiary`           |
| 카메라 아이콘 | Fill Camera Large 24px, 흰색 | `FillCameraLargeIcon`, `text-icon-inversed`         |

- dependency 추가 없음. 아이콘은 기존 `FillCameraLargeIcon`을 쓴다.
- Storybook state matrix: 기본(이미지+카메라), 카메라 없음, 이미지 없음.

## 확인할 항목

- 크기 (확정 필요): Figma 프레임이 154×158이라 정원이 아니다(세로로 약간 긴 타원). 그대로 구현했다. 의도인지 디자이너 확인.
- 카메라 버튼 터치 영역 (확정 필요): 버튼이 42px라 `design-system-icons.md`의 Large 터치 영역(48px)보다 작다. Figma 값 그대로 두었다. 디자이너 확인.
- 터치 영역 확장 (미정): 보이는 크기는 두고 히트 영역만 넓히는 방법이 있다. 보이는 모양은 같지만 Figma에 없어 디자이너 협의 뒤 적용한다.
- 이미지 없음 상태 (제안): Figma에 없다. 이미지 없는 빈 원(`surface-secondary`)을 그렸다. 기본 이미지는 호출하는 쪽이 넘긴다. 디자이너 확인.
- 카메라 버튼 이름 (제안): 기본 「사진 변경」은 개발 쪽이 정한 문구다. 확정 문구는 기획 확인.
- 호버·눌림·비활성 (미정): Figma에 정의가 없다.

## 검증

- [x] 사용자 관찰 동작 test(이미지·alt, 카메라 버튼 유무·이름·클릭·키보드, form 제출 방지, 아이콘 숨김, className)
- [x] 지원 상태 story
- [x] public export 영향 확인(`yarn gen:index`로 `web/index.ts`에 export 추가)
- [x] `yarn workspace @app/design-system test`·lint·typecheck, `yarn check:generated` 통과
- [x] Storybook 빌드를 headless Chromium에서 측정해 크기·버튼 위치·색·아이콘 크기를 Figma와 대조
- [ ] 픽셀 단위 비교, 실기기(iOS WebView), 스크린 리더 낭독은 미검증
