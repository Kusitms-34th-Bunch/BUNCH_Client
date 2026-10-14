import type { ErrorEvent } from '@sentry/nextjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sanitizeSentryEvent } from './sentry';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('Sentry error monitoring', () => {
  it('removes contextual data and masks sensitive values while keeping the error stack', () => {
    const event: ErrorEvent = {
      type: undefined,
      request: {
        url: 'https://example.com/invite?token=secret',
        headers: { Authorization: 'Bearer secret' },
      },
      user: { email: 'person@example.com' },
      extra: { token: 'secret' },
      contexts: { custom: { email: 'person@example.com' } },
      breadcrumbs: [{ message: 'secret' }],
      message: 'person@example.com',
      exception: {
        values: [
          {
            type: 'TypeError',
            value: 'Login failed: token=secret',
            stacktrace: { frames: [{ filename: 'app.js', lineno: 12 }] },
          },
        ],
      },
      release: 'web@1',
    };
    expect(sanitizeSentryEvent(event)).toEqual({
      type: undefined,
      message: '[redacted-email]',
      exception: {
        values: [
          {
            type: 'TypeError',
            value: 'Login failed: token=[redacted]',
            stacktrace: { frames: [{ filename: 'app.js', lineno: 12 }] },
          },
        ],
      },
      release: 'web@1',
    });
    expect(sanitizeSentryEvent({ type: undefined })).toEqual({ type: undefined });
  });

  it.each([
    [
      "Cannot read properties of undefined (reading 'id')",
      "Cannot read properties of undefined (reading 'id')",
    ],
    ['Request failed: 401 Unauthorized', 'Request failed: 401 Unauthorized'],
    ['Upload failed for person@example.com', 'Upload failed for [redacted-email]'],
    [
      'Fetch failed: https://example.com/invite/private?token=secret',
      'Fetch failed: [redacted-url]',
    ],
    ['Authorization: Bearer abc.def', 'Authorization: [redacted]'],
    ['Authorization: Basic dXNlcjpwYXNz', 'Authorization: [redacted]'],
    ['Cookie: session=private-session; refresh=private-refresh', 'Cookie: [redacted]'],
    ['password="abc\\"secret-tail"', 'password=[redacted]'],
    ['password="unterminated secret', 'password=[redacted]'],
    [
      'Login failed {"password":"two words","access_token":"abc"}',
      'Login failed {"password":[redacted],"access_token":[redacted]}',
    ],
    [
      'Invite rejected inviteCode=abc; otp=123456',
      'Invite rejected inviteCode=[redacted]; otp=[redacted]',
    ],
    ['Invalid eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature', 'Invalid [redacted]'],
    ['SMS failed 010-1234-5678', 'SMS failed [redacted-phone]'],
  ])('keeps diagnostic text and masks secrets: %s', (input, expected) => {
    const event = sanitizeSentryEvent({
      type: undefined,
      message: input,
      exception: { values: [{ value: input }] },
    });
    expect(event.message).toBe(expected);
    expect(event.exception?.values?.[0]?.value).toBe(expected);
  });

  it('preserves exceptions without a message', () => {
    expect(
      sanitizeSentryEvent({ type: undefined, exception: { values: [{ type: 'Error' }] } }).exception
        ?.values,
    ).toEqual([{ type: 'Error' }]);
  });

  it.each([
    ['development', 'https://public@example.com/1', false],
    ['production', '', false],
    ['production', 'https://public@example.com/1', true],
  ])('only enables configured production monitoring (%s, %s)', async (mode, dsn, enabled) => {
    vi.stubEnv('NODE_ENV', mode);
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', dsn);
    vi.resetModules();
    const { sentryOptions } = await import('./sentry');
    expect(sentryOptions.enabled).toBe(enabled);
    expect(sentryOptions.beforeSendLog()).toBeNull();
    expect(sentryOptions.beforeSendMetric()).toBeNull();
  });
});
