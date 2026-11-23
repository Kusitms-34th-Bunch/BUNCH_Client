'use client';

import { useReportWebVitals } from 'next/web-vitals';
import { useEffect } from 'react';
import { onINP } from 'web-vitals/attribution';
import { isNativeShell } from '@/shared/bridge/client';
import { captureWebVital } from '@/shared/config/posthog';

// 보낼 지표(Next 전용 지표는 뺌)
const VITALS = new Set(['LCP', 'INP', 'CLS', 'FCP', 'TTFB']);
// 보낼 페이지 방문 비율. 사용자가 적은 지금은 전부, 이벤트 한도(ADR 018)에 다가가면 줄임
const SAMPLE_RATE = 1;
// 방문(문서)마다 한 번 정함(같은 방문의 지표가 일부만 빠지지 않게)
const sampled = typeof window !== 'undefined' && Math.random() < SAMPLE_RATE;

// 보내는 데 쓰는 지표 값(Next hook과 web-vitals attribution이 주는 값의 공통 부분)
type Metric = {
  id: string;
  name: string;
  value: number;
  rating?: string;
  navigationType?: string;
  navigationURL?: string;
  attribution?: InpAttribution;
};

// INP 원인(web-vitals attribution 빌드의 onINP)에서 쓰는 값
type InpAttribution = {
  interactionTarget?: string;
  interactionType?: string;
  inputDelay?: number;
  processingDuration?: number;
  presentationDelay?: number;
  loadState?: string;
  longestScript?: { entry?: { invokerType?: string; sourceURL?: string } };
};

// 누른 요소 선택자의 길이 상한(긴 class 묶음으로 이벤트가 커지지 않게)
const TARGET_MAX_LENGTH = 120;

/** 누른 요소 선택자(태그·class·id): 댓글 번호 같은 숫자 ID는 가리고(경로 정제와 같은 기준) 길이를 자름 */
const cleanTarget = (target: string) => target.replace(/\d+/g, ':n').slice(0, TARGET_MAX_LENGTH);

/**
 * 가장 오래 걸린 스크립트: 앱 청크(같은 출처 `/_next/static/`)만 파일 이름, 그 밖은 종류만
 * 인라인 스크립트는 주소가 문서 주소라 파일 이름 자리에 초대 토큰·ID가 올 수 있음
 */
const scriptSource = (sourceURL: string | undefined) => {
  if (!sourceURL) return undefined;
  try {
    const url = new URL(sourceURL, window.location.href);
    if (url.origin !== window.location.origin) return 'external';
    return url.pathname.startsWith('/_next/static/') ? url.pathname.split('/').pop() : 'inline';
  } catch {
    return undefined;
  }
};

/** 어떤 조작이 느렸는지(INP만): 누른 요소, 입력 대기·처리·그리기 시간, 가장 오래 걸린 스크립트 파일 */
const inpDetails = (metric: Metric) => {
  const attribution = metric.name === 'INP' ? metric.attribution : undefined;
  if (!attribution) return {};
  const script = attribution.longestScript?.entry;
  const round = (value: number | undefined) =>
    value === undefined ? undefined : Math.round(value);
  return {
    inp_target: attribution.interactionTarget
      ? cleanTarget(attribution.interactionTarget)
      : undefined,
    inp_type: attribution.interactionType,
    inp_input_delay: round(attribution.inputDelay),
    inp_processing: round(attribution.processingDuration),
    inp_presentation: round(attribution.presentationDelay),
    inp_load_state: attribution.loadState,
    inp_script_type: script?.invokerType,
    inp_script_source: scriptSource(script?.sourceURL),
  };
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
    ...inpDetails(metric),
  });
};

// INP는 원인 정보가 붙은 onINP로만 보냄(Next hook은 원인 없는 web-vitals 빌드라 같은 값이 두 번 가지 않게)
// 모듈 수준 함수: Next hook은 넘긴 함수가 바뀌면 측정을 다시 등록함
const reportExceptInp = (metric: Metric) => {
  if (metric.name !== 'INP') report(metric);
};

/**
 * 실제 사용자 기기의 Web Vitals를 제품 분석으로 보냄(ADR 023 4번). 제품 분석에 동의한 회원만 실제로 전송됨
 * 동의가 정해지기 전에 나온 첫 화면 지표는 captureWebVital이 잠시 모아 둠
 */
export function WebVitalsReporter() {
  useReportWebVitals(reportExceptInp);
  useEffect(() => onINP(report, { reportSoftNavs: true }), []);
  return null;
}
