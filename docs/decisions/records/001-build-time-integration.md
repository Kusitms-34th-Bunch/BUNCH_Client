# 001: 빌드타임 모노레포 통합 유지

- 상태: accepted

## 배경

현재 저장소는 Next.js web, Vite admin, 공용 API·디자인 시스템 package를 한 Yarn workspace와 Turborepo에서 관리한다. 두 앱은 독립 배포 단위지만, 공용 코드는 같은 팀과 release 흐름 안에서 관리된다.

## 결정

공용 코드는 workspace package를 통한 빌드타임 통합으로 유지한다. Import Maps, Module Federation, single-spa 같은 런타임 통합은 도입하지 않는다.

## 대안

- Import Maps는 runtime 교체는 가볍지만 dependency version과 배포 URL을 수동으로 관리해야 한다.
- Module Federation은 remote의 독립 배포와 runtime 공유가 필요할 때 검토할 수 있지만, host·remote 운영, 오류 격리, 버전 호환, 관측성 비용이 추가된다.
- Nx 전환은 앱·패키지 수와 경계 운영 복잡도가 현재 Turbo boundary·generator보다 커질 때 검토한다.

## 결과와 재검토 신호

- 공용 package 변경은 사용하는 앱을 다시 build·deploy하는 흐름을 유지한다.
- webview, Expo shell, 모바일 앱 추가만으로는 runtime MFE 도입 근거가 되지 않는다. 공용 contract를 package로 공유하면 된다.
- 서로 다른 팀이 각 remote를 독립 release해야 하거나, host 재배포 없이 remote를 교체해야 하는 제품 요구가 생기면 runtime 통합을 다시 평가한다.
