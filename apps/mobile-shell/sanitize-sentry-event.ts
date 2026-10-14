import type { ErrorEvent } from '@sentry/react-native';

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
  // 사용자 행동·요청 원문 제거, 오류 설명의 민감한 값만 마스킹
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
