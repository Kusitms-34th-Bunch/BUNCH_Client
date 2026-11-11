import { describe, expect, it } from 'vitest';
import { isInviteInput, isInviteLink } from './inviteLink';

describe('isInviteLink', () => {
  it.each([
    'https://bunch.app/invite/7xK9mP2q',
    'https://bunch.app/invite/7xK9mP2q/',
    '  https://bunch.app/invite/7xK9mP2q  ',
    'https://bunch.app/invite/정상링크',
  ])('초대 링크 형식이면 true: %s', (value) => {
    expect(isInviteLink(value)).toBe(true);
  });

  it.each([
    '',
    '   ',
    'bunch.app/invite/7xK9mP2q',
    'http://bunch.app/invite/7xK9mP2q',
    'https://bunch.app/invite/',
    'https://bunch.app/invite',
    'https://bunch.app/other/7xK9mP2q',
    'https://bunch.app/invite/a/b',
    '잘못된 링크',
  ])('형식이 아니면 false: %s', (value) => {
    expect(isInviteLink(value)).toBe(false);
  });
});

describe('isInviteInput', () => {
  it.each([
    'https://bunch.app/invite/7xK9mP2q',
    'ABCD2345',
    '  abcd2345  ',
    'x'.repeat(43),
    'x_-'.repeat(14) + 'x',
  ])('링크 URL이거나 토큰·보조 코드면 true: %s', (value) => {
    expect(isInviteInput(value)).toBe(true);
  });

  it.each([
    '',
    '   ',
    'abc',
    'ABCD 2345',
    'https://bunch.app/other/x',
    '잘못된 링크',
    'x'.repeat(9),
    'x'.repeat(44),
    'ABCD_345',
  ])('형식이 아니면 false: %s', (value) => {
    expect(isInviteInput(value)).toBe(false);
  });
});
