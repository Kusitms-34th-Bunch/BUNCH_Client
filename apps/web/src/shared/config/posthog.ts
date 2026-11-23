import type { CaptureResult, PostHog, PostHogConfig, Properties } from 'posthog-js';

/** 주소·경로에서 query·hash(초대 코드·토큰)를 지우고 숫자 ID 구간(회원·번치·사진 등)을 `:id`로 바꿈 */
// 숫자 ID와 초대 링크의 토큰(`/invite/{토큰}`)은 경로 조각이라 값을 감춤
const cleanPath = (value: string) =>
  value
    .replace(/[?#].*$/, '')
    .replace(/\/\d+(?=\/|$)/g, '/:id')
    // 경로 맨 앞(전체 주소는 origin 바로 뒤)의 `/invite/`만 감춤. 다른 경로의 `invite` 조각은 건드리지 않음
    .replace(/^((?:https?:\/\/[^/]+)?)\/invite\/[^/]+/, '$1/invite/:token');

const cleanValue = (key: string, value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  // 누른 요소의 속성 묶음(링크 href 등)은 따옴표 안 값마다 정제
  if (key === '$elements_chain')
    return value.replace(/"([^"]*)"/g, (_, inner: string) => `"${cleanPath(inner)}"`);
  return /^https?:\/\//.test(value) || value.startsWith('/') ? cleanPath(value) : value;
};

const cleanProperties = (properties: Properties | undefined) => {
  if (!properties) return;
  for (const [key, value] of Object.entries(properties)) properties[key] = cleanValue(key, value);
  // 히트맵은 주소(location.href)를 객체 키로 보내므로 키도 정제
  const heatmap = properties.$heatmap_data as Record<string, unknown[]> | undefined;
  if (heatmap && typeof heatmap === 'object') {
    const cleaned: Record<string, unknown[]> = {};
    for (const [url, points] of Object.entries(heatmap)) {
      const key = cleanPath(url);
      cleaned[key] = [...(cleaned[key] ?? []), ...points];
    }
    properties.$heatmap_data = cleaned;
  }
};

/** 보내기 직전 이벤트·사용자 속성의 주소·경로 값 정제(현재·이전·최초 주소, 히트맵, 누른 요소 포함) */
export const sanitizeAnalyticsEvent = (event: CaptureResult | null) => {
  if (!event) return event;
  cleanProperties(event.properties);
  cleanProperties(event.$set);
  cleanProperties(event.$set_once);
  return event;
};

export const posthogOptions = {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  // SDK 기본값 묶음 고정(클릭 자동 수집·SPA 페이지 이동 수집 포함), 올릴 때 변경 내역 확인
  defaults: '2026-08-30',
  // 약관 동의 전에는 수집하지 않고, 동의한 회원만 setAnalyticsConsent로 켬(ADR 018)
  opt_out_capturing_by_default: true,
  // 닉네임·번들 제목·코멘트 같은 사용자 글자가 버튼 글자·접근성 이름으로 섞이므로 요소 글자는 보내지 않음
  mask_all_text: true,
  // 서명된 사진 주소(src)·사용자 글자(alt·aria-label·title)·이동 주소(href) 속성 제외
  autocapture: {
    element_attribute_ignorelist: ['src', 'srcset', 'alt', 'href', 'aria-label', 'title'],
  },
  before_send: sanitizeAnalyticsEvent,
  // 화면 녹화는 쓰지 않음(프로젝트 설정에서 켜도 이 앱은 녹화하지 않음)
  disable_session_recording: true,
  // 막힌 지점 확인용: 반응 없는 클릭·클릭 히트맵
  capture_dead_clicks: true,
  capture_heatmaps: true,
  // 오류 수집은 Sentry 담당(ADR 006)
  capture_exceptions: false,
  // 프로젝트 설정만으로 설문·위젯이 화면에 뜨거나 성능 수집이 늘지 않게 고정
  // Web Vitals는 PostHog 확장 스크립트 대신 Next가 잰 값을 `web_vitals` 이벤트로 보냄(captureWebVital, ADR 023)
  disable_surveys: true,
  disable_conversations: true,
  disable_product_tours: true,
  capture_performance: false,
} satisfies Partial<PostHogConfig>;

/** 운영 빌드(가짜 서버 끔)에서 키가 있을 때만. 개발·가짜 서버 빌드의 클릭이 운영 지표에 섞이지 않게 함 */
const analyticsKey = () =>
  process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_API_MOCKING !== 'enabled'
    ? process.env.NEXT_PUBLIC_POSTHOG_KEY || undefined
    : undefined;

let ready: Promise<PostHog | undefined> | undefined;

// 수집에 동의해 켜진 SDK(동의가 정해지기 전·동의하지 않았으면 없음)
let capturing: PostHog | undefined;
// 동의가 정해지기 전에 나온 성능 지표(첫 화면 LCP·FCP·TTFB는 로그인 확인보다 먼저 나옴). 동의하면 보내고 아니면 버림
const pendingVitals: Properties[] = [];
// 동의 여부가 한 번이라도 정해졌는지(미동의로 정해진 뒤의 지표는 나중에 동의해도 보내지 않게)
let vitalsDecided = false;
const MAX_PENDING_VITALS = 20;

/** 성능 지표 한 건을 `web_vitals` 이벤트로. 동의 전이면 잠시 모아 두고, 동의하지 않은 사용자면 보내지 않음 */
export const captureWebVital = (properties: Properties) => {
  if (capturing) {
    capturing.capture('web_vitals', properties);
    return;
  }
  if (!vitalsDecided && pendingVitals.length < MAX_PENDING_VITALS) pendingVitals.push(properties);
};

const settleVitals = (posthog: PostHog | undefined) => {
  capturing = posthog;
  vitalsDecided = true;
  const pending = pendingVitals.splice(0);
  if (posthog) pending.forEach((properties) => posthog.capture('web_vitals', properties));
};

/** 키가 있으면 PostHog를 늦게 불러와 초기화. 동의를 확인한 뒤에만 부름(이전 사용자의 저장된 동의로 먼저 수집되지 않게) */
const loadAnalytics = () =>
  (ready ??= (async () => {
    const key = analyticsKey();
    if (!key) return undefined;
    const { default: posthog } = await import('posthog-js');
    posthog.init(key, posthogOptions);
    return posthog;
  })().catch((error: unknown) => {
    // 청크 받기 실패는 다음 호출에서 다시 시도
    ready = undefined;
    throw error;
  }));

// 마지막으로 수집에 동의한 회원(이 기기에만 저장, 분석 도구로 보내지 않음)
const MEMBER_KEY = 'bunch.analytics.member';

const readMember = () => {
  try {
    return window.localStorage.getItem(MEMBER_KEY);
  } catch {
    return null;
  }
};

const writeMember = (memberId: string) => {
  try {
    window.localStorage.setItem(MEMBER_KEY, memberId);
  } catch {
    // 저장할 수 없으면 다음 실행에서 회원이 바뀐 것으로 보고 익명 ID를 새로 만듦
  }
};

/**
 * 약관에 동의한 회원이면(`memberId`) SDK를 불러와 수집을 켬. 이 기기에서 이전에 동의한 회원과 다르면 먼저 익명 ID를 새로 만듦
 * 동의하지 않았으면(비로그인·미동의) SDK를 불러오지 않고, 이미 켜져 있었으면 끄고 익명 ID를 새로 만듦
 * 로그아웃은 문서를 새로 열어 이 정리가 실행되지 않으므로, 다음 회원이 동의할 때 회원을 비교해 이어지지 않게 함
 */
// 마지막 동의 호출 순번(SDK 로딩을 기다리는 사이 상태가 바뀌면 앞선 호출은 아무것도 하지 않게)
let latestConsent = 0;

export async function setAnalyticsConsent(memberId: string | null) {
  const call = ++latestConsent;
  // 미동의는 기다리기 전에 확정(로딩 중에 들어온 지표가 앞선 동의 호출로 나가지 않게)
  if (memberId === null) settleVitals(undefined);
  if (memberId === null && !ready) return;
  const posthog = await loadAnalytics();
  if (call !== latestConsent) return;
  if (!posthog) {
    settleVitals(undefined);
    return;
  }
  if (memberId !== null) {
    if (readMember() !== memberId) {
      // reset은 opt_in 전에(뒤에 하면 기본값인 꺼짐으로 돌아감)
      posthog.reset();
      writeMember(memberId);
    }
    if (!posthog.has_opted_in_capturing()) posthog.opt_in_capturing();
    settleVitals(posthog);
    return;
  }
  if (posthog.has_opted_in_capturing()) {
    posthog.opt_out_capturing();
    posthog.reset();
  }
}
