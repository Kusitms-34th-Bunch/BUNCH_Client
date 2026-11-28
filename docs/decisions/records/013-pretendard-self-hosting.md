# 013: Pretendard는 직접 호스팅하고, 앱 화면은 한 파일·처음 오는 웹 화면은 동적 서브셋을 쓴다

- 상태: accepted
- 기록일: 2026-10-22
- 구현 상태(2026-11-24 #534 갱신): 가변 폰트 한 파일(`apps/web/src/app/fonts/pretendard.ts`, 굵기 400~700·글자 범위로 줄인 수정본 `BunchSansVariable.woff2`)을 앱 화면(`(app)`)·초대장(`app/invite`)·루트 not-found가 함께 쓴다. 초대장의 동적 서브셋은 미구현이다. iOS 쉘 탭 바 라벨은 2026-11-19 #462에서 지정을 해제했다.

## 배경

디자인 시스템 타이포그래피는 모두 Pretendard다(토큰 `--primitive-font-family-pretendard: "Pretendard"`). 그동안 글꼴 파일을 불러오지 않아 웹은 기기 기본 한글 글꼴로 그려졌다. 한글을 모두 담은 글꼴은 커서(가변 폰트 woff2 약 2MB) 불러오는 방식을 정해야 했다. 쉘 앱 화면은 WebView가 반복해서 쓰지만, 웹 초대장처럼 처음 오는 사람이 보는 화면은 첫 로드가 중요하다.

## 결정

- CDN이 아니라 저장소에 글꼴 파일을 두고 직접 호스팅한다. 버전은 Pretendard 1.3.9(npm `pretendard`, 레지스트리 sha512 확인)이고 SIL OFL 1.1 라이선스를 파일과 함께 둔다.
- **앱 화면**(`apps/web`의 `(app)` route group): 가변 폰트 한 파일(`PretendardVariable.woff2`, 굵기 45~920)을 `next/font/local`로 불러온다. 한 번 받으면 캐시되고 Next의 preload를 쓴다.
  - 2026-11-24 변경(#534): 원본(2,009KB, 굵기 45~930, 글자 14,336자·글리프 14,757개)을 모든 화면이 preload해 Lighthouse 모바일 LCP가 14~17초였다. 토큰이 굵기 400·500·600·700만 쓰므로 굵기 축을 400~700으로 자르고, 쓰지 않는 문자 범위(키릴·그리스 확장·IPA·일본 가나·사용자 정의 영역 등)를 빼 글자 14,336자 → 12,819자(글리프 13,639개)가 됐다. 한글 완성형 11,172자와 자모, 라틴, 문장 부호·위아래 첨자·화살표·원문자·도형·㈜㎡ 같은 기호는 남겼다. 사용자가 일본 가나·키릴 문자 등 뺀 글자를 쓰면 그 글자만 기기 글꼴로 보인다(깨지지 않고 모양만 섞임). 결과 1,287KB(-36%). 원문자(약관 문서), `・`(번치 문구), `⋯`(멤버 화면)은 화면 문구에서 실제로 쓰여 범위에 넣었다.
  - 이름: 예약 글꼴 이름(Reserved Font Name Pretendard)이 있어 OFL상 수정본은 그 이름을 쓸 수 없다. 글꼴 이름 항목(name ID 1·3·4·6·16·17·25와 인스턴스 이름)만 `BunchSans`로 바꾸고 저작권·상표·디자이너 표기와 라이선스 파일은 그대로 둔다. 버전 문자열(name ID 5) 끝에 수정 내역을 붙였다.
  - 만드는 방법(fontTools 4.60): `python3 -m fontTools.varLib.instancer PretendardVariable.woff2 wght=400:700 -o step1.ttf` → `python3 -m fontTools.subset step1.ttf --unicodes="U+0020-03FF,U+1100-11FF,U+2000-209F,U+20A0-20CF,U+2100-23FF,U+2460-24FF,U+2500-27BF,U+3000-303F,U+30FB,U+3130-318F,U+3200-33FF,U+AC00-D7A3,U+FF00-FFEF" --layout-features='*' --name-IDs='*' --notdef-outline --output-file=step2.ttf` → 위 이름 항목을 바꿔 woff2로 저장. 원본은 Pretendard 1.3.9 배포본의 `dist/web/variable/woff2/PretendardVariable.woff2`다.
- **처음 오는 사용자가 보는 웹 화면**(웹 초대장 등): `(app)` group 밖에 두고 Pretendard 동적 서브셋(글자 범위별 woff2 조각)을 쓴다. 화면에 쓰인 글자 조각만 받는다.
- 토큰의 글꼴 변수는 layout이 불러온 글꼴로 바꾼다. 모달·토스트가 body에 portal로 그려지므로 래퍼 class가 아니라 문서 전체(`:root`)에 적용한다. `typography-*` 유틸리티는 그대로 쓴다.
- iOS 쉘의 시스템 탭 바 라벨은 네이티브라 Pretendard Regular(otf)를 `expo-font` config plugin으로 앱에 넣고 PostScript 이름(`Pretendard-Regular`)으로 지정한다.
  - 2026-11-19 변경(#462): iOS 26 Liquid Glass 탭 바가 미선택 라벨을 아래로 밀고 잘라 그려(실기기 제보) 지정을 빼고 시스템 기본 글꼴을 쓴다. 쉘의 글꼴 파일과 plugin 설정도 지웠다.
  - 2026-11-22 변경(#503): 쉘이 그리는 네이티브 토스트(030)에 Pretendard Regular·SemiBold otf(1.3.9)를 다시 넣었다. config plugin이 아니라 `useFonts`로 실행 중에 불러와 Expo Go에서도 동작하고 탭 바 라벨에는 쓰지 않는다.

## 비교한 대안

- **CDN(jsDelivr 등)**: 설정이 가장 쉽지만 외부 서버 장애·지연에 글꼴이 묶이고, 첫 방문에 다른 도메인 연결 시간이 더해지며, 사용자 접속 정보가 외부로 나간다.
- **모든 화면에 가변 폰트 한 파일**: 설정이 하나라 단순하지만 처음 오는 사용자가 약 2MB를 받아야 글꼴이 적용된다.
- **모든 화면에 동적 서브셋**: 첫 로드가 가볍지만 `next/font`의 preload를 못 쓰고 `@font-face` CSS를 직접 관리해야 한다. 앱 화면에서는 한 파일 캐시로 충분하다.

## 결과

- 웹 앱 화면에서 Pretendard가 로드되고 제목·본문에 적용되는 것을 브라우저에서 확인했다.
- 동적 서브셋을 붙이면 글꼴 설정이 두 벌(앱 화면·처음 오는 웹 화면)이 된다. 지금은 한 벌이라 Pretendard 버전을 올릴 때 원본으로 위 방법을 다시 실행해 `BunchSansVariable.woff2`를 만들고 `Pretendard-LICENSE.txt`를 바꾼다. 화면 문구에 남긴 범위 밖 글자를 새로 쓰면 범위에 넣는다(빠진 글자는 기기 글꼴로 보임).
- 웹에서 초대장 화면에서 앱 화면으로 바로 넘어가면 큰 파일을 따로 받는다. 초대장은 앱이나 App Store로 보내는 흐름이라 드물다고 본다.
- admin과 Storybook에는 아직 글꼴을 연결하지 않았다. 디자인 검수에서 필요해지면 같은 파일을 연결한다.
  - 2026-11-27 변경(#590): admin은 같은 파일을 복사해 `apps/admin/src/index.css`의 `@font-face`로 불러온다. 앱끼리 import할 수 없어 파일이 두 벌이므로, 글꼴을 다시 만들면 두 위치(`apps/web/src/app/fonts/`, `apps/admin/src/assets/fonts/`)를 함께 바꾼다.

## 다시 검토할 조건

- 앱 화면의 첫 실행이 느리다고 측정되면 앱 화면도 동적 서브셋으로 바꾼다.
- 디자인 시스템이 다른 글꼴이나 굵기 일부만 쓰기로 바뀌면 파일 구성을 다시 정한다.
