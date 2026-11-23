'use client';

import type { NextWebVitalsMetric } from 'next/app';
import { useReportWebVitals } from 'next/web-vitals';
import { isNativeShell } from '@/shared/bridge/client';
import { captureWebVital } from '@/shared/config/posthog';

// 보낼 지표(Next 전용 지표는 뺌)
const VITALS = new Set(['LCP', 'INP', 'CLS', 'FCP', 'TTFB']);
// 보낼 페이지 방문 비율. 사용자가 적은 지금은 전부, 이벤트 한도(ADR 018)에 다가가면 줄임
const SAMPLE_RATE = 1;
// 방문(문서)마다 한 번 정함(같은 방문의 지표가 일부만 빠지지 않게)
const sampled = typeof window !== 'undefined' && Math.random() < SAMPLE_RATE;

// Next 공개 타입에 없지만 실제 값(web-vitals Metric)에 있는 필드
type Metric = NextWebVitalsMetric & {
  rating?: string;
  navigationType?: string;
  navigationURL?: string;
};

// 측정한 화면의 경로(지원 브라우저는 화면 이동마다 navigationURL을 줌). 없으면 보고 시점 경로
const metricPath = (metric: Metric) => {
  try {
    if (metric.navigationURL) return new URL(metric.navigationURL).pathname;
  } catch {
    // 잘못된 주소면 아래로
  }
  return window.location.pathname;
};

const report = (metric: Metric) => {
  if (!sampled || !VITALS.has(metric.name)) return;
  captureWebVital({
    metric: metric.name,
    // 같은 방문에서 CLS·INP가 값이 바뀌어 다시 보고되면 같은 ID(집계는 ID별 마지막 값)
    metric_id: metric.id,
    // CLS는 단위 없는 점수, 나머지는 ms
    value:
      metric.name === 'CLS' ? Math.round(metric.value * 1000) / 1000 : Math.round(metric.value),
    rating: metric.rating,
    navigation_type: metric.navigationType,
    // 경로의 ID·초대 토큰은 보내기 직전 정제(sanitizeAnalyticsEvent)
    path: metricPath(metric),
    surface: isNativeShell() ? 'app' : 'web',
  });
};

/**
 * 실제 사용자 기기의 Web Vitals를 제품 분석으로 보냄(ADR 023 4번). 제품 분석에 동의한 회원만 실제로 전송됨
 * 동의가 정해지기 전에 나온 첫 화면 지표는 captureWebVital이 잠시 모아 둠
 */
export function WebVitalsReporter() {
  useReportWebVitals(report);
  return null;
}
