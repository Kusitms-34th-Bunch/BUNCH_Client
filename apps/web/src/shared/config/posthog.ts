import type { PostHogConfig } from 'posthog-js';

export const posthogOptions = {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  // SDK 기본값 묶음 고정(클릭 자동 수집·SPA 페이지 이동 수집 포함), 올릴 때 변경 내역 확인
  defaults: '2026-08-30',
  // 화면 녹화는 쓰지 않음(프로젝트 설정에서 켜도 이 앱은 녹화하지 않음)
  disable_session_recording: true,
  // 막힌 지점 확인용: 반응 없는 클릭·클릭 히트맵
  capture_dead_clicks: true,
  capture_heatmaps: true,
  // 오류 수집은 Sentry 담당(ADR 006)
  capture_exceptions: false,
  // 프로젝트 설정만으로 설문·위젯이 화면에 뜨거나 성능 수집이 늘지 않게 고정
  disable_surveys: true,
  disable_conversations: true,
  disable_product_tours: true,
  capture_performance: false,
} satisfies Partial<PostHogConfig>;

/** UT(가짜 서버) 빌드이고 키가 있을 때만 수집. 운영은 약관 동의 연동 전까지 키가 들어가도 수집하지 않음 */
const analyticsKey = () =>
  process.env.NEXT_PUBLIC_API_MOCKING === 'enabled'
    ? process.env.NEXT_PUBLIC_POSTHOG_KEY || undefined
    : undefined;

/**
 * UT 빌드에서 키가 있을 때만 PostHog를 늦게 불러와 클릭 흐름 수집 시작(아니면 SDK를 내려받지 않음)
 */
export async function initAnalytics() {
  const key = analyticsKey();
  if (!key) return;

  const { default: posthog } = await import('posthog-js');
  posthog.init(key, posthogOptions);
}

/** UT 회차를 새로 시작할 때 새 익명 사용자로 바꿈(회차별로 기록을 나눔) */
export async function startNewAnalyticsUser() {
  if (!analyticsKey()) return;
  const { default: posthog } = await import('posthog-js');
  posthog.reset();
}
