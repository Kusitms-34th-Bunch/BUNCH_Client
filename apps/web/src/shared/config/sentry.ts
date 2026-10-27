import type { ErrorEvent, init } from '@sentry/nextjs';

function sanitizeErrorMessage(message: string): string {
  // 패턴 밖 개인정보는 탐지할 수 없으므로 오류 생성 시 사용자 원문 포함 금지
  return message
    .replace(/https?:\/\/[^\s<>"']+/gi, '[redacted-url]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/(\b(?:authorization|cookie)\s*:\s*)[^\r\n]*/gi, '$1[redacted]')
    .replace(/\bBearer\s+[^\s,;"']+/gi, 'Bearer [redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[redacted]')
    .replace(
      /(\b(?:access[_-]?token|refresh[_-]?token|id[_-]?token|token|password|passwd|secret|api[_-]?key|authorization|cookie|invite[_-]?(?:token|code)|otp)["']?\s*[:=]\s*)(?:"(?:\\.|[^"\\])*(?:"|$)|'(?:\\.|[^'\\])*(?:'|$)|Bearer \[redacted\]|\[redacted\]|[^\s,;&}\]]+)/gi,
      '$1[redacted]',
    )
    .replace(/\b01[016789][- .]?\d{3,4}[- .]?\d{4}\b/g, '[redacted-phone]');
}

export function sanitizeSentryEvent(event: ErrorEvent): ErrorEvent {
  // 요청·사용자·오류 메시지에 포함될 수 있는 초대 토큰과 개인정보 전송 방지
  delete event.request;
  delete event.user;
  delete event.extra;
  delete event.contexts;
  delete event.breadcrumbs;
  if (typeof event.message === 'string') {
    event.message = sanitizeErrorMessage(event.message);
  } else {
    delete event.message;
  }
  for (const exception of event.exception?.values ?? []) {
    if (typeof exception.value === 'string') {
      exception.value = sanitizeErrorMessage(exception.value);
    }
  }
  return event;
}

export const sentryOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? '',
  enabled: process.env.NODE_ENV === 'production' && Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    stackFrameVariables: false,
    databaseQueryData: false,
    genAI: { inputs: false, outputs: false },
    graphQL: { document: false, variables: false },
    queues: false,
  },
  tracePropagationTargets: [],
  beforeSend: sanitizeSentryEvent,
  beforeSendLog: () => null,
  beforeSendMetric: () => null,
} satisfies Parameters<typeof init>[0];
