import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isSdkCallbackUrl } from './sdk-callback-url.ts';

test('카카오·구글 로그인 복귀 주소는 화면 이동에서 거른다', () => {
  assert.equal(isSdkCallbackUrl('kakaobd919a319bfa9fb5c5659250c2aea92b://oauth?code=abc'), true);
  assert.equal(
    isSdkCallbackUrl('com.googleusercontent.apps.1234-abc:/oauth2redirect?code=x'),
    true,
  );
});

test('앱 자체 주소와 웹 주소는 그대로 둔다', () => {
  assert.equal(isSdkCallbackUrl('com.kyeongjooni.mobile-shell://'), false);
  assert.equal(isSdkCallbackUrl('exp+mobile-shell://expo-development-client/?url=x'), false);
  assert.equal(isSdkCallbackUrl('https://app.bunch.kr/bunch'), false);
  assert.equal(isSdkCallbackUrl('/bunch'), false);
});
