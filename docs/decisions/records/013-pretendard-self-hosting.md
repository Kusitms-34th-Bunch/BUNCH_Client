# 013: Pretendard는 직접 호스팅하고, 앱 화면은 한 파일·처음 오는 웹 화면은 동적 서브셋을 쓴다

- 상태: accepted
- 기록일: 2026-10-22
- 구현 상태(2026-11-19 확인): 가변 폰트 한 파일(`apps/web/src/app/fonts/pretendard.ts`)을 앱 화면(`(app)`)·초대장(`app/invite`)·루트 not-found가 함께 쓴다. 초대장의 동적 서브셋은 미구현이다. iOS 쉘 탭 바 라벨은 2026-11-19 #462에서 지정을 해제했다.

## 배경

디자인 시스템 타이포그래피는 모두 Pretendard다(토큰 `--primitive-font-family-pretendard: "Pretendard"`). 그동안 글꼴 파일을 불러오지 않아 웹은 기기 기본 한글 글꼴로 그려졌다. 한글을 모두 담은 글꼴은 커서(가변 폰트 woff2 약 2MB) 불러오는 방식을 정해야 했다. 쉘 앱 화면은 WebView가 반복해서 쓰지만, 웹 초대장처럼 처음 오는 사람이 보는 화면은 첫 로드가 중요하다.

## 결정

- CDN이 아니라 저장소에 글꼴 파일을 두고 직접 호스팅한다. 버전은 Pretendard 1.3.9(npm `pretendard`, 레지스트리 sha512 확인)이고 SIL OFL 1.1 라이선스를 파일과 함께 둔다.
- **앱 화면**(`apps/web`의 `(app)` route group): 가변 폰트 한 파일(`PretendardVariable.woff2`, 굵기 45~920)을 `next/font/local`로 불러온다. 한 번 받으면 캐시되고 Next의 preload를 쓴다.
- **처음 오는 사용자가 보는 웹 화면**(웹 초대장 등): `(app)` group 밖에 두고 Pretendard 동적 서브셋(글자 범위별 woff2 조각)을 쓴다. 화면에 쓰인 글자 조각만 받는다.
- 토큰의 글꼴 변수는 layout이 불러온 글꼴로 바꾼다. 모달·토스트가 body에 portal로 그려지므로 래퍼 class가 아니라 문서 전체(`:root`)에 적용한다. `typography-*` 유틸리티는 그대로 쓴다.
- iOS 쉘의 시스템 탭 바 라벨은 네이티브라 Pretendard Regular(otf)를 `expo-font` config plugin으로 앱에 넣고 PostScript 이름(`Pretendard-Regular`)으로 지정한다.
  - 2026-11-19 변경(#462): iOS 26 Liquid Glass 탭 바가 미선택 라벨을 아래로 밀고 잘라 그려(실기기 제보) 지정을 빼고 시스템 기본 글꼴을 쓴다. 쉘의 글꼴 파일과 plugin 설정도 지웠다.

## 비교한 대안

- **CDN(jsDelivr 등)**: 설정이 가장 쉽지만 외부 서버 장애·지연에 글꼴이 묶이고, 첫 방문에 다른 도메인 연결 시간이 더해지며, 사용자 접속 정보가 외부로 나간다.
- **모든 화면에 가변 폰트 한 파일**: 설정이 하나라 단순하지만 처음 오는 사용자가 약 2MB를 받아야 글꼴이 적용된다.
- **모든 화면에 동적 서브셋**: 첫 로드가 가볍지만 `next/font`의 preload를 못 쓰고 `@font-face` CSS를 직접 관리해야 한다. 앱 화면에서는 한 파일 캐시로 충분하다.

## 결과

- 웹 앱 화면에서 Pretendard가 로드되고 제목·본문에 적용되는 것을 브라우저에서 확인했다.
- 동적 서브셋을 붙이면 글꼴 설정이 두 벌(앱 화면·처음 오는 웹 화면)이 된다. 지금은 한 벌이라 Pretendard 버전을 올릴 때 `apps/web/src/app/fonts/`의 `PretendardVariable.woff2`와 `Pretendard-LICENSE.txt`를 바꾼다.
- 웹에서 초대장 화면에서 앱 화면으로 바로 넘어가면 큰 파일을 따로 받는다. 초대장은 앱이나 App Store로 보내는 흐름이라 드물다고 본다.
- admin과 Storybook에는 아직 글꼴을 연결하지 않았다. 디자인 검수에서 필요해지면 같은 파일을 연결한다.

## 다시 검토할 조건

- 앱 화면의 첫 실행이 느리다고 측정되면 앱 화면도 동적 서브셋으로 바꾼다.
- 디자인 시스템이 다른 글꼴이나 굵기 일부만 쓰기로 바뀌면 파일 구성을 다시 정한다.
