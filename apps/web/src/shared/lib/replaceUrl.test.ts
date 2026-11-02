import { afterEach, describe, expect, it } from 'vitest';
import { replaceUrl } from './replaceUrl';

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('replaceUrl', () => {
  it('주소만 바꾸고 history 항목은 늘리지 않는다', () => {
    const before = window.history.length;

    replaceUrl('/photos/photo-2');

    expect(window.location.pathname).toBe('/photos/photo-2');
    expect(window.history.length).toBe(before);
  });

  it('history.state에 있던 값(Next 내부 값)을 지우지 않는다', () => {
    window.history.replaceState({ __NA: true, tree: ['a'] }, '', '/photos/photo-1');

    replaceUrl('/photos/photo-2');

    expect(window.history.state).toEqual({ __NA: true, tree: ['a'] });
  });

  it('화면이 따로 적어 둘 값을 더한다', () => {
    window.history.replaceState({ __NA: true }, '', '/photos/photo-1');

    replaceUrl('/photos/photo-2', { photoId: 'photo-2' });

    expect(window.history.state).toEqual({ __NA: true, photoId: 'photo-2' });
  });

  it('state가 비어 있어도 동작한다', () => {
    window.history.replaceState(null, '', '/photos/photo-1');

    replaceUrl('/photos/photo-3', { photoId: 'photo-3' });

    expect(window.history.state).toEqual({ photoId: 'photo-3' });
  });
});
