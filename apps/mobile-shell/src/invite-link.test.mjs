import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isLinkDomainUrl, toInviteWebPath } from './invite-link.ts';

const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-AbCde';

test('초대 링크는 토큰만 꺼내 웹 경로로 바꾼다', () => {
  assert.equal(toInviteWebPath(`https://app.bunch.kr/invite/${TOKEN}`), `/invite/${TOKEN}`);
  assert.equal(toInviteWebPath('https://app.bunch.kr/invite/ABCD2345/'), '/invite/ABCD2345');
  // 호스트·스킴 대소문자는 구분하지 않음(토큰 대소문자는 그대로)
  assert.equal(toInviteWebPath('HTTPS://APP.BUNCH.KR/invite/AbCd2345'), '/invite/AbCd2345');
});

test('앱 열기 도메인(open.bunch.kr)의 초대 링크도 같은 웹 경로로 바꾼다', () => {
  assert.equal(toInviteWebPath(`https://open.bunch.kr/invite/${TOKEN}`), `/invite/${TOKEN}`);
  assert.equal(toInviteWebPath('https://open.bunch.kr.evil.example/invite/ABCD2345'), null);
  assert.equal(toInviteWebPath('https://evil.bunch.kr/invite/ABCD2345'), null);
  assert.equal(isLinkDomainUrl('https://open.bunch.kr/invite/short'), true);
  assert.equal(isLinkDomainUrl('https://evil.bunch.kr/invite/short'), false);
});

test('쿼리와 해시는 버린다', () => {
  assert.equal(
    toInviteWebPath('https://app.bunch.kr/invite/ABCD2345?next=https://evil.example#x'),
    '/invite/ABCD2345',
  );
  assert.equal(toInviteWebPath('https://app.bunch.kr/invite/ABCD2345?x=a:b@c'), '/invite/ABCD2345');
});

test('다른 도메인·스킴·포트·계정 정보가 붙은 주소는 받지 않는다', () => {
  assert.equal(toInviteWebPath('https://evil.example/invite/ABCD2345'), null);
  assert.equal(toInviteWebPath('https://app.bunch.kr.evil.example/invite/ABCD2345'), null);
  assert.equal(toInviteWebPath('http://app.bunch.kr/invite/ABCD2345'), null);
  assert.equal(toInviteWebPath('https://app.bunch.kr:8443/invite/ABCD2345'), null);
  assert.equal(toInviteWebPath('https://user@app.bunch.kr/invite/ABCD2345'), null);
  assert.equal(toInviteWebPath('kr.bunch.app://invite/ABCD2345'), null);
  // 표준과 다른 런타임 URL 파서가 호스트를 app.bunch.kr로 읽는 모양
  assert.equal(toInviteWebPath('https://evil.example?@app.bunch.kr/invite/ABCD2345'), null);
  assert.equal(toInviteWebPath('https://evil.example#@app.bunch.kr/invite/ABCD2345'), null);
});

test('초대가 아닌 경로와 토큰 형식이 아닌 값은 받지 않는다', () => {
  assert.equal(toInviteWebPath('https://app.bunch.kr/bunch'), null);
  assert.equal(toInviteWebPath('https://app.bunch.kr/invite/'), null);
  assert.equal(toInviteWebPath('https://app.bunch.kr/invite/short'), null);
  assert.equal(toInviteWebPath('https://app.bunch.kr/invite/ABCD2345/extra'), null);
  assert.equal(toInviteWebPath('https://app.bunch.kr/invite/..%2Fapi%2Fauth'), null);
  assert.equal(toInviteWebPath('https://app.bunch.kr/invite/ABCD%2F2345'), null);
  assert.equal(toInviteWebPath(`https://app.bunch.kr/invite/${'a'.repeat(65)}`), null);
});

test('주소가 아니면 null', () => {
  assert.equal(toInviteWebPath('/invite/ABCD2345'), null);
  assert.equal(toInviteWebPath(''), null);
});

test('연결 도메인 주소는 초대 형식이 아니어도 알아본다(화면을 옮기지 않기 위해)', () => {
  assert.equal(isLinkDomainUrl('https://app.bunch.kr/invite/short'), true);
  assert.equal(isLinkDomainUrl('https://app.bunch.kr/invite/'), true);
  assert.equal(isLinkDomainUrl('https://APP.BUNCH.KR/invite/ABCD2345/extra'), true);
  assert.equal(isLinkDomainUrl('https://app.bunch.kr'), true);
  assert.equal(isLinkDomainUrl('https://app.bunch.kr.evil.example/invite/x'), false);
  assert.equal(isLinkDomainUrl('https://evil.example?@app.bunch.kr/invite/x'), false);
  assert.equal(isLinkDomainUrl('kakaoabc://oauth'), false);
  assert.equal(isLinkDomainUrl('/bunch'), false);
});
