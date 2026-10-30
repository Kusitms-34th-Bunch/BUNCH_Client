import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PhotoBoxData, PhotoBoxPhoto, PhotoBoxState } from '../lib/types';
import { PHOTO_BOX_PATHS } from '../constants/paths';
import { photoBoxFixture } from '../fixtures/photoBox.fixture';
import { PhotoBoxScreen } from './PhotoBoxScreen';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const ready = (data: PhotoBoxData = photoBoxFixture): PhotoBoxState => ({ kind: 'ready', data });
const renderScreen = (state: PhotoBoxState = ready(), props = {}) =>
  render(<PhotoBoxScreen state={state} currentYear={2026} {...props} />);

const emptyData = { ...photoBoxFixture, photos: [] } satisfies PhotoBoxData;

beforeEach(() => {
  push.mockClear();
});

describe('PhotoBoxScreen 목록', () => {
  it('보통 모드에서 사진은 사진 상세로 가는 링크다', () => {
    renderScreen();

    const links = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.startsWith('/photos/'));
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]?.getAttribute('href')).toMatch(/^\/photos\/photo-\d+$/);
  });

  it('화면 제목(h1)과 헤더의 번치 이름·선택 버튼이 있다', () => {
    renderScreen();

    expect(screen.getByRole('heading', { level: 1, name: '사진함' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '여행가조' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '선택' })).toBeTruthy();
  });

  it('번치 이름은 호출 지점의 콜백을 부른다', async () => {
    const user = userEvent.setup();
    const onBunchClick = vi.fn();
    renderScreen(ready(), { onBunchClick });

    await user.click(screen.getByRole('button', { name: '여행가조' }));

    expect(onBunchClick).toHaveBeenCalledTimes(1);
  });

  it('날짜 섹션을 최신 날짜가 위로 보이고 올해가 아니면 연도를 붙인다', () => {
    renderScreen();
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);

    expect(headings.filter((text) => text?.includes('요일') || text?.includes('년'))).toEqual([
      '9월 27일 일요일',
      '9월 26일 토요일',
      '2025년 12월 24일',
    ]);
  });

  it('섹션마다 사진 목록이 있고 이미지에 대체 텍스트가 있다', () => {
    renderScreen();
    const list = screen.getByRole('list', { name: '9월 27일 일요일' });

    expect(within(list).getAllByRole('listitem')).toHaveLength(6);
    expect(within(list).getAllByRole('img').length).toBeGreaterThan(0);
  });

  it('처리 중이거나 불러오지 못한 사진은 회색 자리표시로 보인다', () => {
    renderScreen();

    expect(screen.getByRole('img', { name: '처리 중인 사진' })).toBeTruthy();
    expect(screen.getByRole('img', { name: '불러오지 못한 사진' })).toBeTruthy();
  });

  it('이미지를 불러오지 못하면 그 사진만 회색 자리표시로 바꾼다', () => {
    const only: PhotoBoxPhoto = {
      id: 'x',
      src: '/missing.jpg',
      alt: '깨진 사진',
      takenAt: '2026-09-27T10:00',
      uploadedAt: '2026-10-01T00:00:00',
      uploaderIds: ['eunwoo'],
      status: 'ready',
    };
    renderScreen(ready({ ...photoBoxFixture, photos: [only] }));

    fireEvent.error(screen.getByRole('img', { name: '깨진 사진' }));

    expect(screen.queryByRole('img', { name: '깨진 사진' })).toBeNull();
    expect(screen.getByRole('img', { name: '불러오지 못한 사진' })).toBeTruthy();
  });

  it('「+」 버튼이 있고 누르면 올리기 호출 지점을 부른다', async () => {
    const user = userEvent.setup();
    const onUploadClick = vi.fn();
    renderScreen(ready(), { onUploadClick });

    await user.click(screen.getByRole('button', { name: '사진 올리기' }));

    expect(onUploadClick).toHaveBeenCalledTimes(1);
  });
});

describe('PhotoBoxScreen 날짜 미확인 아코디언', () => {
  const toggle = () => screen.getByRole('button', { name: /촬영 날짜를 확인할 사진/ });

  it('개수와 설명을 보이고 기본은 접혀 있다', () => {
    renderScreen();

    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(toggle().textContent).toContain('9장');
    expect(toggle().textContent).toContain('날짜 확인하고 추억 정리하기');
    expect(screen.queryByRole('list', { name: '촬영 날짜를 확인할 사진' })).toBeNull();
  });

  it('누르면 펼쳐지고 3열 사진 9장이 보이며 다시 누르면 접힌다', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(toggle());
    const list = screen.getByRole('list', { name: '촬영 날짜를 확인할 사진' });

    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(within(list).getAllByRole('listitem')).toHaveLength(9);
    expect(list.className).toContain('grid-cols-3');

    await user.click(toggle());
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
  });

  it('날짜 미확인 사진이 없으면 영역을 숨긴다', () => {
    const dated = photoBoxFixture.photos.filter((p) => p.takenAt !== null);
    renderScreen(ready({ ...photoBoxFixture, photos: dated }));

    expect(screen.queryByRole('button', { name: /촬영 날짜를 확인할 사진/ })).toBeNull();
  });

  it('선택한 멤버 기준으로 장수가 바뀐다', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('radio', { name: '은우' }));

    expect(toggle().textContent).toContain('3장');
  });
});

describe('PhotoBoxScreen 멤버 필터', () => {
  it('전체와 멤버를 하나만 고르는 radio 그룹이고 전체가 선택돼 있다', () => {
    renderScreen();
    const group = screen.getByRole('radiogroup', { name: '멤버 필터' });
    const radios = within(group).getAllByRole('radio');

    expect(radios.map((r) => r.textContent)).toEqual([
      '전체',
      '은우',
      '경진',
      '수인',
      '지예',
      '효찬',
      '경준',
    ]);
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual([
      'true',
      'false',
      'false',
      'false',
      'false',
      'false',
      'false',
    ]);
  });

  it('Tab은 선택된 칩 하나에만 머문다', () => {
    renderScreen();
    const radios = screen.getAllByRole('radio');

    expect(radios.map((r) => r.tabIndex)).toEqual([0, -1, -1, -1, -1, -1, -1]);
  });

  it('칩을 누르면 선택이 바뀌고 aria-pressed는 쓰지 않는다', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('radio', { name: '경진' }));

    expect(screen.getByRole('radio', { name: '경진' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: '전체' }).getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('radio', { name: '경진' }).hasAttribute('aria-pressed')).toBe(false);
  });

  it('방향키로 이동하면 바로 선택되고 처음·끝에서 순환한다', async () => {
    const user = userEvent.setup();
    renderScreen();
    screen.getByRole('radio', { name: '전체' }).focus();

    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: '은우' }));
    expect(screen.getByRole('radio', { name: '은우' }).getAttribute('aria-checked')).toBe('true');

    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: '경준' }));

    await user.keyboard('{Home}');
    expect(screen.getByRole('radio', { name: '전체' }).getAttribute('aria-checked')).toBe('true');

    await user.keyboard('{End}');
    expect(screen.getByRole('radio', { name: '경준' }).getAttribute('aria-checked')).toBe('true');
  });

  it('멤버를 고르면 그 멤버가 올린 사진만 남고 함께 올린 사진도 보인다', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('radio', { name: '수인' }));
    const list = screen.getByRole('list', { name: '9월 27일 일요일' });

    // 수인: 단독 1(처리 중)·함께 올린 1
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
  });

  it('칩 높이는 Figma 화면 값 40px이다', () => {
    renderScreen();

    expect(screen.getByRole('radio', { name: '전체' }).className).toContain('h-10');
  });

  it('사진이 없는 멤버도 칩을 보인다', () => {
    renderScreen(ready({ ...photoBoxFixture, photos: [] }));

    expect(screen.getAllByRole('radio')).toHaveLength(7);
  });
});

describe('PhotoBoxScreen 빈 상태', () => {
  it('번치에 사진이 없으면 「첫 번째 사진을 공유해 보세요」를 보이고 칩과 「+」는 그대로다', () => {
    renderScreen(ready(emptyData));

    expect(screen.getByText('첫 번째 사진을 공유해 보세요')).toBeTruthy();
    expect(screen.getByRole('radiogroup', { name: '멤버 필터' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '사진 올리기' })).toBeTruthy();
  });

  it('선택한 멤버의 사진이 없으면 「첫 사진을 기다리고 있어요!」를 보인다', async () => {
    const user = userEvent.setup();
    renderScreen(ready(emptyData));

    await user.click(screen.getByRole('radio', { name: '지예' }));

    expect(screen.getByText('첫 사진을 기다리고 있어요!')).toBeTruthy();
    expect(screen.queryByText('첫 번째 사진을 공유해 보세요')).toBeNull();
  });

  it('멤버를 다시 「전체」로 돌리면 번치 빈 상태 문구로 돌아온다', async () => {
    const user = userEvent.setup();
    renderScreen(ready(emptyData));

    await user.click(screen.getByRole('radio', { name: '지예' }));
    await user.click(screen.getByRole('radio', { name: '전체' }));

    expect(screen.getByText('첫 번째 사진을 공유해 보세요')).toBeTruthy();
  });

  it('날짜 미확인 사진만 있으면 빈 상태 문구 없이 아코디언만 보인다', () => {
    const undatedOnly = photoBoxFixture.photos.filter((p) => p.takenAt === null);
    renderScreen(ready({ ...photoBoxFixture, photos: undatedOnly }));

    expect(screen.queryByText('첫 번째 사진을 공유해 보세요')).toBeNull();
    expect(screen.getByRole('button', { name: /촬영 날짜를 확인할 사진/ })).toBeTruthy();
  });
});

describe('PhotoBoxScreen 번치 없음', () => {
  it('안내 문구와 두 버튼을 보이고 헤더·필터·「+」는 없다', () => {
    renderScreen({ kind: 'no-bunch' });

    expect(screen.getByText('참여 중인 번치가 없어요')).toBeTruthy();
    expect(screen.getByText('새 번치를 만들거나 초대받은 번치에 참여해보세요.')).toBeTruthy();
    expect(screen.queryByRole('banner')).toBeNull();
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.queryByRole('button', { name: '사진 올리기' })).toBeNull();
  });

  it('버튼은 번치 만들기·초대 링크 참여로 이동한다', async () => {
    const user = userEvent.setup();
    renderScreen({ kind: 'no-bunch' });

    await user.click(screen.getByRole('button', { name: '새 번치 만들기' }));
    expect(push).toHaveBeenLastCalledWith(PHOTO_BOX_PATHS.createBunch);

    await user.click(screen.getByRole('button', { name: '초대 링크로 참여하기' }));
    expect(push).toHaveBeenLastCalledWith(PHOTO_BOX_PATHS.joinBunch);
  });

  it('화면 중앙에 두려고 본문 높이를 채운다', () => {
    renderScreen({ kind: 'no-bunch' });

    const content = screen.getByText('참여 중인 번치가 없어요').closest('div.min-h-full');
    expect(content).toBeTruthy();
  });
});

describe('PhotoBoxScreen 로딩·오류', () => {
  it('로딩 중에는 상태 안내를 두고 사진 목록은 없다', () => {
    renderScreen({ kind: 'loading' });

    const status = screen.getByRole('status');
    expect(status.textContent).toContain('사진함을 불러오는 중이에요');
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });

  it('오류면 alert 안내와 다시 시도 버튼을 보이고 누르면 호출 지점을 부른다', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    renderScreen({ kind: 'error' }, { onRetry });

    expect(screen.getByRole('alert').textContent).toContain('일시적인 오류가 발생했어요');
    await user.click(screen.getByRole('button', { name: '다시 시도' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
