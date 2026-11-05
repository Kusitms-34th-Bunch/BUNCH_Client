import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sanitizeSentryEvent } from './sanitize-sentry-event.ts';

test('민감한 값과 부가 데이터를 가리고 오류 설명·타입·스택은 보존한다', () => {
  const event = sanitizeSentryEvent({
    type: undefined,
    message: 'Invite rejected: token=private',
    request: { url: 'https://example.com/?token=private' },
    user: { email: 'private@example.com' },
    extra: { token: 'private' },
    contexts: { custom: { token: 'private' } },
    breadcrumbs: [{ message: 'private' }],
    exception: {
      values: [
        {
          type: 'Error',
          value: 'Invite rejected: token=private',
          stacktrace: { frames: [{ filename: 'App.tsx', lineno: 1 }] },
        },
      ],
    },
  });
  for (const key of ['request', 'user', 'extra', 'contexts', 'breadcrumbs']) {
    assert.equal(key in event, false);
  }
  assert.equal(event.message, 'Invite rejected: token=[redacted]');
  assert.equal(event.exception?.values?.[0]?.value, 'Invite rejected: token=[redacted]');
  assert.equal(event.exception?.values?.[0]?.type, 'Error');
  assert.equal(event.exception?.values?.[0]?.stacktrace?.frames?.[0]?.filename, 'App.tsx');
});

test('exception 없는 이벤트도 처리한다', () => {
  assert.deepEqual(sanitizeSentryEvent({ type: undefined, message: 'private' }), {
    type: undefined,
    message: 'private',
  });
});

for (const [input, expected] of [
  [
    "Cannot read properties of undefined (reading 'id')",
    "Cannot read properties of undefined (reading 'id')",
  ],
  ['Request failed: 401 Unauthorized', 'Request failed: 401 Unauthorized'],
  ['Upload failed for person@example.com', 'Upload failed for [redacted-email]'],
  ['Fetch failed: https://example.com/invite/private?token=secret', 'Fetch failed: [redacted-url]'],
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
]) {
  test(`오류 설명의 민감한 값 마스킹: ${input}`, () => {
    const event = sanitizeSentryEvent({
      type: undefined,
      message: input,
      exception: { values: [{ value: input }] },
    });
    assert.equal(event.message, expected);
    assert.equal(event.exception?.values?.[0]?.value, expected);
  });
}

test('메시지 없는 exception을 유지한다', () => {
  assert.deepEqual(
    sanitizeSentryEvent({ type: undefined, exception: { values: [{ type: 'Error' }] } }).exception
      ?.values,
    [{ type: 'Error' }],
  );
});
