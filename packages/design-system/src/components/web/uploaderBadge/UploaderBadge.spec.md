# 컴포넌트: UploaderBadge

## 메타데이터

- 소유 경계: design-system `web`(`@app/design-system/web`으로 import). 사진을 올린 사람을 사진 위에 보여 주는 BUNCH 사용자 앱의 표시라 `web`에 둔다.
- Status: 구현됨(Chrome 렌더 대조·실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `사진함, 번들 작성 컴포넌트` 안 `UploaderBadge`(node `1474:15929`). 상태는 하나뿐이다.
- 이슈: #81

## 목적과 범위

### 제공하는 동작

- 반투명 흰 알약 안에 26px 원형 프로필 사진과 이름(14px)을 한 줄로 보여 주는 표시. 사진 위에 겹쳐 놓고 누가 올렸는지 알리는 용도다.
- 이름이 길면 한 줄로 두고 말줄임한다.

### 제공하지 않는 동작

- 사진 위의 위치(`absolute` 등). 호출하는 쪽이 `className`으로 정한다. Figma에 배치 값이 없어 story의 좌측 하단은 임의로 정한 예시일 뿐이다.
- 클릭·hover 같은 상호작용. 표시일 뿐이다.
- 프로필 이미지 가져오기와 이름. 호출하는 쪽이 `name`과 `avatarSrc`로 넘긴다.

## Public API

- Props: `name`(필수), `avatarSrc`, 그리고 native `<span>`의 속성(`className` 등. `children`은 제외).
- 호출자 소유 책임: 이름·이미지 주소, 사진 위의 위치, 이름 문구(i18n), "올린 사람"이라는 문맥을 접근성 이름에 넣는 일(아래 "접근성").

## 상태와 동작

- 모양: `surface-primary`(흰색) 64%(`bg-surface-primary/64`)와 `backdrop-blur-[4.7px]`, radius full. 좌우 안쪽 여백 8px, 위아래 6px, 사진과 이름 사이 8px.
- 사진: 26px 원, `object-cover`. `avatarSrc`가 없으면 사진 없이 배경색 원(`surface-brand-subtle-2`)만 보인다(`ProfileImage`와 같은 방식, Figma에 정의되지 않은 상태). 사용자별 대표 이미지가 들어갈 예정이라 별도 기본 이미지는 만들지 않았다.
- 이름: 14px Regular, `text-primary`, 한 줄 말줄임. 알약 높이는 사진 26px + 위아래 6px로 38px다.
- 폭은 내용에 맞고 부모를 넘지 않는다(`max-w-full`).

## 접근성

- Semantic element: `<span>`(역할 없는 표시용). 이름 글자가 그대로 읽힌다.
- 사진은 이름 옆에 같은 사람이 글자로 나와 있어 장식(`alt=""`)이다.
- Keyboard·focus: 상호작용이 없어 focus 대상이 아니다.
- 색 대비: 이름 `#121212`는 뒤 사진이 가장 어두워도 합성 배경이 약 `#A3A3A3`이라 약 7.4:1(계산한 추정)이고 밝은 사진 위에서는 더 높다. 글자 대비는 어떤 사진에서도 AA를 넘는다. 밝은 사진 위에서 알약의 경계(비텍스트 대비)만 확인하지 못했다.
- `backdrop-filter`를 지원하지 않는 환경에서는 블러 없이 반투명 흰색만 보인다.
- 업로더 의미("올린 사람")는 글자로 나오지 않는다. 역할 없는 `<span>`의 `aria-label`은 스크린 리더가 무시하므로 쓰지 않고, 사용하는 카드가 접근 가능한 이름에 "경진이 올림" 같은 문맥을 넣거나 `name`에 문구를 합쳐 넘긴다.
- 말줄임으로 잘린 이름도 전체 글자가 DOM에 있어 스크린 리더는 전체를 읽는다. 잘린 이름을 눈으로 확인할 수단(`title` 등)은 장식용 표시에 중복 낭독을 만들 수 있어 넣지 않았고, 필요하면 상세 화면에서 보여 준다.

## Styling과 의존성

| Figma          | 값                        | 사용한 토큰·utility                           |
| -------------- | ------------------------- | --------------------------------------------- |
| 배경           | 흰색 64%, 블러 4.7px      | `bg-surface-primary/64 backdrop-blur-[4.7px]` |
| 반경           | full                      | `rounded-full`                                |
| 안쪽 여백·간격 | 좌우 8px, 위아래 6px, 8px | `px-s4 py-s3 gap-s4`                          |
| 사진           | 26px 원                   | `size-6.5 rounded-full object-cover`          |
| 이름           | 14/21 Regular, `#121212`  | `typography-body-3-regular text-text-primary` |

- 타이포 이름: Figma `Body-3-Regular`(14/21)와 이름·값이 같은 `body-3-regular`를 쓴다(2026-10-31 토큰 이름을 Figma와 맞춤).
- 64%는 토큰에 없어 `bg-surface-primary/64`로 투명도만 지정했다(가장 가까운 토큰은 `white-alpha-60`).
- dependency 추가 없음. `ProfileImage`는 90px 고정에 루트가 `<div>`라 `<span>` 안에 둘 수 없어 쓰지 않고 이 컴포넌트 안에서 26px 원을 직접 그렸다.
- Storybook state matrix: `Default`(사진 있음), `WithoutAvatar`(사진 없음), 긴 이름 `LongName`, 사진 위에 얹은 `OnPhoto`.

## 확인할 항목

- 사진 없음 (제안): Figma에 없는 상태라 `ProfileImage`와 같은 배경색 원으로 두었다. 사용자별 대표 이미지가 들어갈 예정이므로 기본 이미지는 그 이미지가 정해진 뒤 필요 여부를 확인한다.
- 흰색 64%와 블러 (제안): Figma 값 64%와 4.7px를 그대로 옮겼다. 토큰 `white-alpha-60`(60%)과 4%p 차이다.
- 실제 사진 위 알약 경계 (미검증): 글자 대비는 계산으로 확인했지만 경계선이 없어 밝은 사진 위에서 알약의 경계가 보이는지는 확인하지 못했다.
- 최대 폭 (제안): Figma에 최대 폭이 없어 부모를 넘지 않게만 했다. 사진 위에 놓을 때의 최대 폭은 화면 구현 때 정한다.

## 검증

- [x] 사용자 관찰 동작 test
- [x] 지원 variant·edge state story
- [x] public export 영향 확인
- [x] 실행 command와 결과

실행한 검증: `typecheck`, `lint`, `vitest run src/components/web/uploaderBadge`(4개 통과), `gen:index:check`, Prettier 통과.

Storybook을 빌드해 Chrome에서 Figma 4배 내보내기(배경 `#3A3A3A`)와 같은 프로필 사진·Pretendard 설치 환경으로 비교했다. 알약 크기 75×38px이 같고, 알약 배경(흰색 64% 위 `#B8B8B8`)과 프로필 사진 중심색이 같다. 사진 영역 평균 차이는 2.0(최대 43, 리샘플링 차이), 글자는 가로 위치가 같고 세로가 0.5px 다르며 그 만큼 옮기면 평균 차이가 23.3에서 1.5로 줄어 나머지는 안티앨리어싱이다. 실제 사진 위 대비, 스크린 리더, 실기기, `backdrop-filter` 미지원 환경은 확인하지 않았다.
