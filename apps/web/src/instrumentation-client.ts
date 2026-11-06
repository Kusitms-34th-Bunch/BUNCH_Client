import * as Sentry from '@sentry/nextjs';
import { initAnalytics } from './shared/config/posthog';
import { sentryOptions } from './shared/config/sentry';

Sentry.init(sentryOptions);
// 분석 실패(청크 받기 실패 등)는 사용자 영향이 없어 오류로 올리지 않음
initAnalytics().catch(() => {});
