---
name: diagnose-performance
description: 측정된 React, Vite, bundle, rendering, network 성능 문제를 조사하고 근거 기반 개선안을 제시한다. 페이지 지연, bundle 증가, request waterfall에 사용한다.
---

# 성능 진단

## 입력과 기준선

`docs/workflows/performance.md`, 대상 route·network·component·build 설정을 읽고 증상, 사용자 영향, device/network/cache 조건, baseline을 기록한다.
LCP/FCP/CLS/TBT, bundle size, request 수는 서로 다른 지표이므로 사용자 증상에 맞는 측정값을 고른다.

## 조사 순서

1. network waterfall과 독립 요청의 직렬 await를 확인한다.
2. render profiler 또는 재현 조건으로 re-render, derived state effect, 무거운 목록·계산을 좁힌다.
3. build output으로 route chunk, third-party SDK, image·font asset을 확인한다.
4. 외부 API/CDN/extension/cache처럼 통제하지 못하는 요인을 분리한다.
5. root cause confidence와 최소 변경 가설을 제시한다.

## 개선 선택

- 독립 요청 병렬화, 실제 진입 시점 lazy/dynamic import, derived state의 render 계산, event 기반 side effect, 무거운 목록 분리는 근거가 있을 때 선택한다.
- memoization, `startTransition`, Set/Map, cache는 측정된 비용과 trade-off가 있을 때만 적용한다.
- async UI는 공간을 예약하고 loading/error/empty를 숨겨 속도가 빨라 보이게 만들지 않는다.

## 검증과 출력

같은 시나리오에서 전후를 재측정하고 baseline, 개선값, 환경 caveat, UX trade-off, 남은 외부 blocker를 보고한다. 측정 없이 일괄 `useMemo`·code splitting을 적용하지 않는다.
