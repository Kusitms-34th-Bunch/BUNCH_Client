import * as Sentry from '@sentry/react-native';
import { sanitizeSentryEvent } from './sanitize-sentry-event';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  enabled: !__DEV__ && Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN),
  environment: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ?? 'production',
  sendDefaultPii: false,
  maxBreadcrumbs: 0,
  enableAutoPerformanceTracing: false,
  enableAutoSessionTracking: false,
  enableLogs: false,
  tracesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  tracePropagationTargets: [],
  beforeSend: sanitizeSentryEvent,
});
