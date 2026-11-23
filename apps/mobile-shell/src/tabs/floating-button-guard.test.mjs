import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFloatingButtonGuard } from './floating-button-guard.ts';

const BUTTON = { icon: 'add', label: '사진 올리기' };
const setup = () => {
  const shown = [];
  const guard = createFloatingButtonGuard({
    isRoot: (tab, url) => new URL(url).pathname === `/${tab}`,
    show: (tab, button) => shown.push([tab, button]),
  });
  return { guard, shown };
};

test('주소를 아직 모르거나 첫 화면이면 버튼을 바로 그린다', () => {
  const { guard, shown } = setup();
  guard.request('photos', BUTTON);
  guard.reportUrl('photos', 'http://localhost:3000/photos');
  guard.request('photos', null);
  assert.deepEqual(shown, [
    ['photos', BUTTON],
    ['photos', null],
  ]);
});

test('주소가 빈 값이면 첫 화면으로 본다(이전 동작과 같음)', () => {
  const { guard, shown } = setup();
  guard.reportUrl('photos', '');
  guard.request('photos', BUTTON);
  assert.deepEqual(shown.at(-1), ['photos', BUTTON]);
});

test('하위 화면에서 온 요청은 그리지 않고 보관했다가 첫 화면으로 돌아오면 그린다', () => {
  const { guard, shown } = setup();
  guard.reportUrl('photos', 'http://localhost:3000/photos/12');
  guard.request('photos', BUTTON);
  assert.deepEqual(shown, [['photos', null]]);

  guard.reportUrl('photos', 'http://localhost:3000/photos');
  assert.deepEqual(shown.at(-1), ['photos', BUTTON]);
});

test('첫 화면을 떠나면 웹이 지우지 않아도 버튼을 지운다', () => {
  const { guard, shown } = setup();
  guard.request('bunch', BUTTON);
  guard.reportUrl('bunch', 'http://localhost:3000/bunch/menu');
  assert.deepEqual(shown.at(-1), ['bunch', null]);
});

test('보관 중에 지우는 요청이 오면 첫 화면으로 돌아와도 그리지 않는다', () => {
  const { guard, shown } = setup();
  guard.reportUrl('photos', 'http://localhost:3000/photos/12');
  guard.request('photos', BUTTON);
  guard.request('photos', null);
  guard.reportUrl('photos', 'http://localhost:3000/photos');
  assert.deepEqual(shown.at(-1), ['photos', null]);
});
