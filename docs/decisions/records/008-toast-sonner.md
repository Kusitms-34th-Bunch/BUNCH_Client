# 008: Toast는 sonner에 알림 동작을 맡기고 모양은 디자인 시스템이 입힌다

- 상태: accepted
- 구현 상태(2026-10-17 확인): 구현됨(`@app/design-system`의 `Toast`·`Toaster`·`toast`). iOS WebView 실기기 확인 전.

## 배경

BUNCH는 복사 완료, 저장 실패처럼 작업 결과를 잠깐 알리는 토스트가 여러 화면에 필요하다. Figma는 아이콘 유무 × 액션 버튼 유무의 네 가지 모양만 정하고, 알림이 쌓이는 방식·자동으로 닫히는 시간·스와이프·스크린 리더 안내는 정하지 않는다. 이 동작을 직접 만들면 큐, 타이머, 포인터 제스처, live region을 모두 구현하고 검증해야 한다.

## 결정

알림 동작(큐, 자동 닫힘, 스와이프, `aria-live` 영역)은 `sonner`에 맡기고, 모양과 액션 버튼은 우리 토큰·`tv`·기존 `Button`으로 그린다. 앱은 우리 `toast()`와 `<Toaster />`만 쓰고 `sonner`의 타입이나 옵션은 공개 API에 노출하지 않는다.

- `sonner`는 `@app/design-system`의 `dependencies`에 둔다(`^2.0.8`). Toast에서만 쓴다.
- 토스트는 `toast.custom`으로 우리 `Toast`를 그린다. 그러면 sonner의 기본 스타일이 붙지 않고, 액션 버튼에 `Button`(secondary, sm)을 그대로 재사용한다.
- 한 번에 하나만 보인다. 새 토스트는 이전 것을 닫고 대체한다.
- 다른 UI 컴포넌트(Dialog 등)에는 이 결정을 적용하지 않는다. 확인 모달 등은 별도로 결정한다.

## 검토한 대안

- **직접 구현**: 의존성이 없고 모양을 모두 제어하지만 큐·타이머·스와이프·live region을 우리가 만들고 접근성까지 검증해야 한다. 토스트 하나에 쓰기에는 비용이 크다.
- **react-hot-toast**: 가볍지만 액션 버튼을 기본으로 제공하지 않는다(문서 확인). Figma의 「공유」 버튼 형태에 맞추려면 직접 만들어야 한다.
- **Base UI 등 headless 라이브러리의 토스트**: 접근성 설계가 좋지만 이 프로젝트에서 Toast만을 위해 UI 라이브러리를 도입하는 비용이 크고, 안정성(React Aria Toast)을 확인하지 못했다.
- **Mantine·Chakra 같은 컴포넌트 라이브러리**: 자체 스타일·테마 시스템이 우리 토큰 체계와 충돌하므로 제외했다.

## 영향

- 번들: `sonner` 배포 파일은 `index.mjs` 약 68KB(gzip 약 14KB), 스타일 17KB(gzip 3KB)다. tree-shaking 전 수치이며 실제 앱 번들 증가는 측정하지 않았다. MIT 라이선스이고 런타임 의존성이 없으며 `react` 18·19를 peer로 받는다.
- 웹: `'use client'` 모듈이라 서버 컴포넌트인 root layout이 `Toaster`를 import해도 `apps/web` 빌드가 통과한다(Next 16, `--webpack`).
- 접근성: sonner 영역은 `aria-live="polite"`이다. 키보드 포커스 중에도 자동 닫힘이 멈추지 않으므로, 액션이 있는 토스트의 지속 시간은 정책으로 정한다(`Toast.spec.md`).
- 제약: `Dialog`가 native `<dialog>`의 modal이면 top layer에 놓여 토스트가 가려질 수 있다. Dialog 구현에서 함께 확인한다.
- 제약: `apps/web`은 디자인 시스템 소스를 Tailwind `@source`로 등록하지 않아, 웹에서 디자인 시스템 컴포넌트를 처음 쓰기 전에 등록이 필요하다(빌드로 확인함).

## 검증 / 후속 작업

1. 구현에서 확인함: 단위 테스트(14개: 메시지, 액션 호출·닫힘, 3초·5초 자동 닫힘, `Infinity`, 대체와 시간 재시작, live region), Storybook 렌더의 치수·위치·타이밍, `apps/web` 빌드.
2. iOS WebView에서 스와이프·터치·소프트 키보드와의 간격을 실기기로 확인한다.
3. 액션이 있는 토스트의 지속 시간은 팀이 수용했다(근거는 `Toast.spec.md`). 남은 일은 VoiceOver 낭독 확인이다.
4. 앱의 실제 번들 증가량을 측정한다.

## 재검토 조건

- 실기기에서 스와이프·터치 동작이 WebView에서 불안정할 때.
- 토스트 종류가 늘어 sonner를 거치는 이득보다 옵션을 감싸는 비용이 커질 때.
- 접근성 요구(자동 닫힘 제어, 닫기 버튼)를 sonner가 충족하지 못할 때.
- 번들 크기가 문제로 측정될 때.
