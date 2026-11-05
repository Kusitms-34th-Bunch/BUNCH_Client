import { describe, expect, it } from 'vitest';
import { isInviteLink } from './inviteLink';

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
