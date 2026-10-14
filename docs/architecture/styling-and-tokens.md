# Styling And Design Tokens

Tailwind CSS는 app 스타일 구현 도구이고, `@app/design-system`은 여러 app이 공유하는 제품 비의존 UI primitive 경계다. 아직 확정되지 않은 색상·타이포그래피 체계를 token package나 임의 theme 이름으로 먼저 만들지 않는다. 실제 비주얼 아이덴티티가 정해지면 `.agents/templates/design-system-identity.md`로 정리한다.

## 소유 경계

- global reset, app shell, route 전용 layout은 각 app이 소유한다.
- 여러 app에서 같은 의미와 API로 재사용되는 UI primitive는 `packages/design-system`에 둔다.
- 색상, spacing, typography, radius, shadow, z-index가 여러 곳에서 같은 의미로 반복되고 디자인 기준이 확정되면 design-system token으로 승격한다.
- 제품 도메인 상태, route 전용 여백, 화면 문맥의 색상·copy는 app 또는 feature에 남긴다.

## Tailwind 사용 기준

- existing utility와 token을 우선 사용한다. 임의 값은 디자인 기준에 직접 대응하거나 기존 scale로 표현할 수 없을 때만 사용한다.
- 기본 scale로 표현되는 spacing·sizing 값은 임의 값 대신 scale class를 쓴다(`size-[10px]` 대신 `size-2.5`). 같은 임의 값이 반복되면 theme·token 승격을 검토한다.
- border-radius, border-width, ring·outline 두께처럼 Figma의 고정 수치에 대응하는 값은 root font-size의 영향을 받지 않도록 `rem` 대신 `px`나 token을 쓴다.
- 조건부 class는 읽기 가능한 variant 또는 class merge utility로 구성한다. 긴 문자열 결합과 중첩 ternary를 component 안에 쌓지 않는다.
- `!important`, inline style, 하드코딩된 z-index는 외부 라이브러리 또는 동적 계산 같은 명확한 예외에서만 쓴다.
- overlay, dialog, toast처럼 전역 stacking 관계가 반복되면 숫자 복사가 아니라 의미 기반 token을 도입할지 검토한다.
- workspace package의 class가 app build에서 누락되지 않도록, package component를 도입할 때 Tailwind source scanning 범위를 실제 build로 확인한다.

## token 승격 기준

아래가 모두 맞을 때만 공통 token을 만든다.

1. 둘 이상의 화면·component가 같은 의미로 사용한다.
2. Figma 또는 합의된 디자인 기준과 직접 대응한다.
3. 값 변경 시 호출부를 각각 수정하는 비용이 크다.
4. 이름이 제품 도메인이나 한 화면의 문구에 의존하지 않는다.

font·asset은 라이선스, 크기, preload·cache 전략이 확정된 뒤 도입한다. 외부 CDN font를 기본값으로 추가하지 않는다.

## 확인

- light/dark 또는 다른 theme을 지원한다면 token contract와 fallback을 명시한다. 지원하지 않는 theme은 class만 미리 만들지 않는다.
- 긴 텍스트, 좁은 viewport, disabled·error·selected 상태에서 contrast와 overflow를 확인한다.
- design-system component가 `className` 확장을 제공한다면 내부 접근성·상태 계약을 깨지 않는 범위인지 story와 consumer에서 확인한다.
