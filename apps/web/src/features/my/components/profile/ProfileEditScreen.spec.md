# 페이지: 개인 프로필 수정

## 메타데이터

- Route: `/my/profile`(`app/(app)/my/profile/page.tsx`, 하단 탭 없음)
- Status: UI 구현됨(Figma 값과 측정으로 대조함. 프로필 수정 API 연결 전, 실기기 검증 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `개인 프로필 편집(1)`(node `4096:75004` 외), 화면 설계서 `MY(1)` 4~8번(node `4096:48291`)
- 이슈: #213

## 목적과 범위

### 포함

- 지금 값을 채운 닉네임(필수)·출생연도·성별 입력과 비공개 안내 문구. 입력 칸 묶음과 검증 규칙은 가입 프로필과 같은 `src/shared/components/profile/ProfileFields`·`useProfileFields`를 쓴다.
- 프로필 사진: 가입과 같은 `ProfilePhotoField`(선택지 → 원형 조정 → 미리보기, `shared/components/profile/ProfilePhotoField.spec.md`). 사진이 지금 값과 달라지면(기본 이미지로 되돌리기 포함) 변경으로 본다.
- 「프로필 수정하기」: 바뀐 값이 있고 모두 유효할 때만 활성. 누르면 MY로 돌아가고 토스트 「프로필을 수정했어요.」를 띄운다. 누른 뒤에는 다시 누를 수 없다.

### 범위 외

- 프로필 수정·이미지 업로드 API와 저장 실패 처리. 지금은 저장 없이 이동과 토스트만 한다. 지금 값은 page가 Figma 예시 값(`myProfileFixture`)으로 넘긴다. 연결할 때 저장 실패면 수정하기를 다시 누를 수 있게 되돌린다.
- 닉네임 중복 확인 호출. `checkNickname`을 넘기지 않아 확인하지 않는다(가입 화면과 같음). 연결할 때 내 지금 닉네임은 중복으로 보지 않게 해야 한다.

## Route와 접근

- Path·params·search: `/my/profile`, 없음.
- 접근 권한·guard: `(app)` 그룹 기준을 따른다. 추가한 guard는 없다.
- Layout·redirect·navigation: `(main)` 밖이라 하단 탭이 없다. page가 전환 경계(`data-ssgoi-transition="/my/profile"`)를 두고 MY와 slide로 오간다. 뒤로 가기와 저장 뒤 이동 모두 `useBackOr(MY_PATHS.home)`(MY에서 들어왔으면 그 기록으로 돌아가고, 기록이 없으면 MY로 바꿈). 저장 뒤 `replace`를 쓰면 MY 기록이 두 번 쌓여 뒤로 가기가 한 번 헛돈다. 기록 유무만 보므로 MY 밖에서 들어오면 직전 페이지로 돌아간다(지금 입구는 MY 프로필 행뿐).

## 상태와 흐름

- 초기 진입: 닉네임·출생연도·성별을 지금 값으로 채우고 수정하기는 비활성.
- 변경 판단: 닉네임은 앞뒤 공백을 지우고 NFC로 맞춘 값, 출생연도·성별은 그대로 비교한다. 원래 값으로 되돌리면 다시 비활성.
- Disabled·invalid: 닉네임 규칙 위반(허용 문자, 1~12자), 출생연도 범위 밖이면 비활성. 오류 문구는 가입과 같다.
- Success·완료 후 이동: MY로 이동하고 토스트.

## 데이터 의존성

- Query·mutation: 없음. 화면은 `profile`(`nickname`, `imageSrc?`, `birthYear?`, `gender?`)을 prop으로 받는다.
- API 계약 확인 항목: `MemberResponse`의 `gender`는 `FEMALE`·`MALE`이고 화면은 `female`·`male`을 쓴다. 연결할 때 변환한다.

## UI와 접근성

| Figma               | 값                               | 사용한 컴포넌트·토큰                    |
| ------------------- | -------------------------------- | --------------------------------------- |
| 헤더                | 뒤로 가기만                      | `Header` + `HeaderIconButton`(subtle)   |
| 헤더와 사진 사이    | 49                               | `pt-s18`(48)                            |
| 사진·사진 변경      | 90, 버튼 28(64,62)               | `ProfilePhotoField`(가입과 같은 배치)   |
| 사진과 입력 칸 사이 | 32                               | `pt-s14`                                |
| 입력 칸             | 닉네임(필수, n/12)·출생연도·성별 | `ProfileFields showOptional={false}`    |
| 수정하기            | Primary L, 위 여백 14            | `Button`, `px-padding-p8 pt-padding-p7` |

- Keyboard·focus·accessible name: 숨긴 `h1` 「개인 프로필 수정」, 사진 변경 버튼 이름 「프로필 사진 변경」. 입력 칸 접근성은 `ProfileFields`(가입과 같음). 빈 영역을 누르면 키보드를 닫고, 포커스된 입력 칸은 보이게 스크롤한다. 출생연도·성별은 「선택」 글자를 숨기지만, 닉네임만 `aria-required`라 보조기기에는 둘이 필수가 아닌 칸으로 전달된다.
- Responsive·긴 텍스트·overflow: 입력 칸은 화면 폭을 채우고, 본문은 `PageShell`에서 스크롤된다.

## 검증

- [x] direct URL·params/search: 개발 서버에서 `/my/profile` 직접 열기
- [ ] 권한·redirect: 이 화면이 바꾸지 않아 확인하지 않음
- [x] 상태별 UI: 초기 비활성, 변경·되돌림, 닉네임 오류, 출생연도 범위 밖, 저장 뒤 이동(테스트)
- [x] 관련 test 또는 E2E
- [x] 실행 command와 결과

실행한 검증: `vitest run src/features/my src/features/auth src/shared`(253개 통과), `yarn workspace @app/web typecheck`, `lint`, 루트 `check:tailwind`, `check:generated`. 개발 서버에서 `/my/profile`을 열어 헤더 48, 사진 위 48·크기 90, 카메라 버튼 위치, 「선택」 표시 없음, 닉네임 글자 수, 초기 비활성을 Figma와 대조했다. 스크린 리더와 실기기는 확인하지 않았다.

## 확인할 항목

- 성별과 안내 문구 사이 (제안): MY Figma는 16, 가입 Figma는 8이다. 같은 입력 칸 묶음을 쓰려고 가입 기준(8)을 따랐다. 그래서 안내 문구가 Figma보다 6px, 성별이 2px 위에 있다.
- 헤더와 사진 사이 (제안): Figma 49를 가장 가까운 토큰 `s18`(48)로 맞췄다.
- 화면 전환 (결정): 화면 설계서에 정의가 없어, 번치 프로필 편집과 같은 미는 slide(Ease out, 300ms)를 양방향으로 쓴다(2026-11-05 사용자 결정, `AppTransitions`의 `menuSubSlide`).
- 바꾸지 않고 나가기: 수정 중 뒤로 가도 확인 없이 나간다(화면 설계서에 정의 없음).
- 앱 안 뒤로 가기 (실기기 확인 필요): `useBackOr`는 `history.length > 1`로 기록을 판단한다. 쉘이 딥링크로 이 화면을 바로 열 때 WebView 기록이 남아 있으면 저장·뒤로 가기가 MY가 아닌 곳으로 갈 수 있다.
- 비로그인 접근: `(app)` 그룹에는 페이지 guard가 없어 지금은 누구나 열린다. 내 정보 API를 연결할 때 401 처리와 로그인 이동 위치를 정한다.
