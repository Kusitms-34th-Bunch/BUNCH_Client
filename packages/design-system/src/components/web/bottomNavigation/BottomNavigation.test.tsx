import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FillConfettiLargeIcon,
  FillHomeLargeIcon,
  FillPhotoLargeIcon,
  FillUserLargeIcon,
  LineConfettiLargeIcon,
  LineHomeLargeIcon,
  LinePhotoLargeIcon,
  LineUserLargeIcon,
} from '../../../icons';
import { BottomNavigation, type BottomNavigationItem } from './BottomNavigation';

afterEach(cleanup);

const items: BottomNavigationItem[] = [
  { id: 'feed', label: '피드', icon: <LineHomeLargeIcon />, selectedIcon: <FillHomeLargeIcon /> },
  {
    id: 'photos',
    label: '사진함',
    icon: <LinePhotoLargeIcon />,
    selectedIcon: <FillPhotoLargeIcon />,
  },
  {
    id: 'bunch',
    label: '번치',
    icon: <LineConfettiLargeIcon />,
    selectedIcon: <FillConfettiLargeIcon />,
  },
  {
    id: 'my',
    label: '마이페이지',
    icon: <LineUserLargeIcon />,
    selectedIcon: <FillUserLargeIcon />,
  },
];

describe('BottomNavigation', () => {
  it('이름 있는 nav 안에 항목을 순서대로 보여 준다', () => {
    render(<BottomNavigation aria-label="주요 메뉴" items={items} selectedId="feed" />);

    const nav = screen.getByRole('navigation', { name: '주요 메뉴' });
    const labels = Array.from(nav.querySelectorAll('li')).map((li) => li.textContent);
    expect(labels).toEqual(['피드', '사진함', '번치', '마이페이지']);
  });

  it('선택된 항목만 aria-current를 갖는다', () => {
    render(<BottomNavigation aria-label="주요 메뉴" items={items} selectedId="bunch" />);

    expect(screen.getByRole('button', { name: '번치' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: '피드' }).getAttribute('aria-current')).toBeNull();
  });

  it('선택된 항목은 Fill 아이콘, 선택되지 않은 항목은 Line 아이콘을 그린다', () => {
    const marked: BottomNavigationItem[] = ['feed', 'photos'].map((id) => ({
      id,
      label: id,
      icon: <svg data-testid={`line-${id}`} />,
      selectedIcon: <svg data-testid={`fill-${id}`} />,
    }));
    render(<BottomNavigation aria-label="주요 메뉴" items={marked} selectedId="feed" />);

    const feed = screen.getByRole('button', { name: 'feed' });
    const photos = screen.getByRole('button', { name: 'photos' });
    expect(within(feed).queryByTestId('fill-feed')).toBeTruthy();
    expect(within(feed).queryByTestId('line-feed')).toBeNull();
    expect(within(photos).queryByTestId('line-photos')).toBeTruthy();
    expect(within(photos).queryByTestId('fill-photos')).toBeNull();
  });

  it('selectedId가 목록에 없으면 모두 미선택이다', () => {
    render(<BottomNavigation aria-label="주요 메뉴" items={items} selectedId="none" />);

    expect(screen.queryAllByRole('button').some((b) => b.hasAttribute('aria-current'))).toBe(false);
  });

  it('button 항목을 누르면 onItemSelect에 id를 넘긴다', async () => {
    const onItemSelect = vi.fn();
    render(
      <BottomNavigation
        aria-label="주요 메뉴"
        items={items}
        selectedId="feed"
        onItemSelect={onItemSelect}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '사진함' }));

    expect(onItemSelect).toHaveBeenCalledWith('photos');
  });

  it('이름 있는 아이콘을 넘겨도 항목 이름에 중복되지 않는다', () => {
    render(
      <BottomNavigation
        aria-label="주요 메뉴"
        items={[
          {
            ...items[0]!,
            icon: <LineHomeLargeIcon aria-label="홈 아이콘" />,
            selectedIcon: <FillHomeLargeIcon aria-label="홈 아이콘" />,
          },
        ]}
        selectedId="none"
      />,
    );

    expect(screen.getByRole('button', { name: '피드' })).toBeTruthy();
  });

  it.each([
    ['Enter', '{Enter}'],
    ['Space', ' '],
  ])('키보드로 항목에 이동해 %s로 실행한다', async (_name, key) => {
    const onItemSelect = vi.fn();
    render(
      <BottomNavigation
        aria-label="주요 메뉴"
        items={items}
        selectedId="feed"
        onItemSelect={onItemSelect}
      />,
    );

    await userEvent.tab();
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '사진함' }));
    await userEvent.keyboard(key);

    expect(onItemSelect).toHaveBeenCalledWith('photos');
  });

  it('renderItem으로 링크를 그리면 같은 className·aria-current·children이 전달된다', () => {
    render(
      <BottomNavigation
        aria-label="주요 메뉴"
        items={items}
        selectedId="photos"
        renderItem={(item, { className, children, 'aria-current': current }) => (
          <a href={`/${item.id}`} className={className} aria-current={current}>
            {children}
          </a>
        )}
      />,
    );

    const current = screen.getByRole('link', { name: '사진함' });
    expect(current.getAttribute('href')).toBe('/photos');
    expect(current.getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: '피드' }).getAttribute('aria-current')).toBeNull();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('renderItem을 쓰면 onItemSelect를 호출하지 않는다', async () => {
    const onItemSelect = vi.fn();
    render(
      <BottomNavigation
        aria-label="주요 메뉴"
        items={items}
        selectedId="feed"
        onItemSelect={onItemSelect}
        renderItem={(item, { className, children }) => (
          <a href={`/${item.id}`} className={className} onClick={(e) => e.preventDefault()}>
            {children}
          </a>
        )}
      />,
    );

    await userEvent.click(screen.getByRole('link', { name: '번치' }));

    expect(onItemSelect).not.toHaveBeenCalled();
  });

  it('glass 옵션을 켜면 반투명 배경과 블러를 쓴다', () => {
    render(<BottomNavigation aria-label="주요 메뉴" items={items} selectedId="feed" glass />);

    const nav = screen.getByRole('navigation', { name: '주요 메뉴' });
    expect(nav.className).toContain('backdrop-blur');
    expect(nav.className).not.toMatch(/(^| )bg-surface-primary( |$)/);
  });

  const pillOf = (nav: HTMLElement) => nav.querySelector<HTMLElement>('div[aria-hidden="true"]');

  it('선택 알약은 선택된 항목 위치로 이동한다', () => {
    const { rerender } = render(
      <BottomNavigation aria-label="주요 메뉴" items={items} selectedId="feed" />,
    );
    const nav = screen.getByRole('navigation', { name: '주요 메뉴' });
    expect(pillOf(nav)?.style.transform).toBe('translateX(0%)');

    rerender(<BottomNavigation aria-label="주요 메뉴" items={items} selectedId="bunch" />);

    expect(pillOf(nav)?.style.transform).toBe('translateX(200%)');
    expect(pillOf(nav)?.style.width).toBe('25%');
  });

  it('selectedId가 목록에 없으면 알약을 그리지 않는다', () => {
    render(<BottomNavigation aria-label="주요 메뉴" items={items} selectedId="none" />);

    expect(pillOf(screen.getByRole('navigation', { name: '주요 메뉴' }))).toBeNull();
  });

  it('알약 이동은 모션 감소 설정에서 즉시 일어난다', () => {
    render(<BottomNavigation aria-label="주요 메뉴" items={items} selectedId="feed" />);

    const pill = pillOf(screen.getByRole('navigation', { name: '주요 메뉴' }));
    expect(pill?.className).toContain('motion-reduce:transition-none');
  });

  it('glass 옵션에서는 알약이 더 진한 회색이다', () => {
    const { rerender } = render(
      <BottomNavigation aria-label="주요 메뉴" items={items} selectedId="feed" />,
    );
    const nav = screen.getByRole('navigation', { name: '주요 메뉴' });
    const solid = pillOf(nav)?.firstElementChild?.className;
    rerender(<BottomNavigation aria-label="주요 메뉴" items={items} selectedId="feed" glass />);
    const glass = pillOf(nav)?.firstElementChild?.className;

    expect(solid).toContain('bg-surface-secondary');
    expect(glass).not.toContain('bg-surface-secondary');
  });

  it('선택이 바뀌면 알약이 도착한 뒤에 새 항목의 아이콘이 활성으로 바뀐다', async () => {
    const marked: BottomNavigationItem[] = ['feed', 'photos'].map((id) => ({
      id,
      label: id,
      icon: <svg data-testid={`line-${id}`} />,
      selectedIcon: <svg data-testid={`fill-${id}`} />,
    }));
    const { rerender } = render(
      <BottomNavigation aria-label="주요 메뉴" items={marked} selectedId="feed" />,
    );
    rerender(<BottomNavigation aria-label="주요 메뉴" items={marked} selectedId="photos" />);

    expect(screen.getByRole('button', { name: 'photos' }).getAttribute('aria-current')).toBe(
      'page',
    );
    expect(screen.queryByTestId('fill-feed')).toBeTruthy();
    await waitFor(() => expect(screen.queryByTestId('fill-photos')).toBeTruthy());
    expect(screen.queryByTestId('fill-feed')).toBeNull();
  });

  describe('누른 채 끌어서 선택', () => {
    const mockRect = () =>
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        right: 400,
        top: 0,
        bottom: 56,
        width: 400,
        height: 56,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });
    const drag = (from: HTMLElement, xs: number[]) => {
      const nav = screen.getByRole('navigation', { name: '주요 메뉴' });
      fireEvent.pointerDown(from, { pointerId: 1, pointerType: 'touch', clientX: 20 });
      for (const x of xs)
        fireEvent.pointerMove(nav, { pointerId: 1, pointerType: 'touch', clientX: x });
      return nav;
    };

    afterEach(() => vi.restoreAllMocks());

    it('끌다가 손을 떼면 그 위치의 항목을 한 번 선택한다', () => {
      mockRect();
      const onItemSelect = vi.fn();
      render(
        <BottomNavigation
          aria-label="주요 메뉴"
          items={items}
          selectedId="feed"
          onItemSelect={onItemSelect}
        />,
      );
      const nav = drag(screen.getByRole('button', { name: '피드' }), [120, 330]);

      fireEvent.pointerUp(nav, { pointerId: 1, pointerType: 'touch', clientX: 330 });
      fireEvent.click(screen.getByRole('button', { name: '피드' }));

      expect(onItemSelect).toHaveBeenCalledTimes(1);
      expect(onItemSelect).toHaveBeenCalledWith('my');
    });

    it('외부 nav 이벤트 핸들러를 전달해도 끌기 선택과 중복 클릭 방지가 동작한다', () => {
      mockRect();
      const onItemSelect = vi.fn();
      const onPointerDown = vi.fn();
      const onPointerMove = vi.fn();
      const onPointerUp = vi.fn();
      const onClickCapture = vi.fn();
      render(
        <BottomNavigation
          aria-label="주요 메뉴"
          items={items}
          selectedId="feed"
          onItemSelect={onItemSelect}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClickCapture={onClickCapture}
        />,
      );
      const nav = drag(screen.getByRole('button', { name: '피드' }), [330]);
      fireEvent.pointerUp(nav, { pointerId: 1, pointerType: 'touch', clientX: 330 });
      fireEvent.click(screen.getByRole('button', { name: '피드' }));

      expect(onPointerDown).toHaveBeenCalledTimes(1);
      expect(onPointerMove).toHaveBeenCalledTimes(1);
      expect(onPointerUp).toHaveBeenCalledTimes(1);
      expect(onClickCapture).toHaveBeenCalled();
      expect(onItemSelect).toHaveBeenCalledTimes(1);
      expect(onItemSelect).toHaveBeenCalledWith('my');
    });

    it('다른 손가락의 입력과 종료는 진행 중인 끌기를 방해하지 않는다', () => {
      mockRect();
      const onItemSelect = vi.fn();
      render(
        <BottomNavigation
          aria-label="주요 메뉴"
          items={items}
          selectedId="feed"
          onItemSelect={onItemSelect}
        />,
      );
      const nav = drag(screen.getByRole('button', { name: '피드' }), [210]);
      fireEvent.pointerDown(nav, { pointerId: 2, pointerType: 'touch', clientX: 320 });
      fireEvent.pointerLeave(nav, { pointerId: 2, pointerType: 'touch', clientX: 320 });
      fireEvent.pointerUp(nav, { pointerId: 2, pointerType: 'touch', clientX: 320 });
      fireEvent.pointerUp(nav, { pointerId: 1, pointerType: 'touch', clientX: 210 });

      expect(onItemSelect).toHaveBeenCalledOnce();
      expect(onItemSelect).toHaveBeenCalledWith('bunch');
      expect(pillOf(nav)?.style.transform).toBe('translateX(0%)');
    });

    it('끌기 전에 막대 밖에서 손을 떼어도 다음 끌기를 시작할 수 있다', () => {
      mockRect();
      const onItemSelect = vi.fn();
      render(
        <BottomNavigation
          aria-label="주요 메뉴"
          items={items}
          selectedId="feed"
          onItemSelect={onItemSelect}
        />,
      );
      const nav = screen.getByRole('navigation', { name: '주요 메뉴' });
      fireEvent.pointerDown(nav, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 20 });
      fireEvent.pointerLeave(nav, { pointerId: 1, pointerType: 'mouse', clientX: 20 });
      fireEvent.pointerUp(document.body, { pointerId: 1, pointerType: 'mouse', clientX: 20 });

      fireEvent.pointerDown(nav, { pointerId: 2, pointerType: 'mouse', button: 0, clientX: 20 });
      fireEvent.pointerMove(nav, { pointerId: 2, pointerType: 'mouse', clientX: 210 });
      fireEvent.pointerUp(nav, { pointerId: 2, pointerType: 'mouse', clientX: 210 });

      expect(onItemSelect).toHaveBeenCalledOnce();
      expect(onItemSelect).toHaveBeenCalledWith('bunch');
    });

    it('끄는 동안 알약은 손가락을 따라가지만 도착한 항목이 활성으로 보이고 현재 항목 표시는 그대로다', () => {
      mockRect();
      const marked: BottomNavigationItem[] = ['feed', 'photos', 'bunch', 'my'].map((id) => ({
        id,
        label: id,
        icon: <svg data-testid={`line-${id}`} />,
        selectedIcon: <svg data-testid={`fill-${id}`} />,
      }));
      render(<BottomNavigation aria-label="주요 메뉴" items={marked} selectedId="feed" />);
      const nav = drag(screen.getByRole('button', { name: 'feed' }), [210]);

      const pill = nav.querySelector<HTMLElement>('div[aria-hidden="true"]');
      expect(pill?.style.transform).toBe('translateX(160px)');
      // 끌기 미리보기(bunch)와 실제 선택(feed)의 분리 확인
      expect(screen.getByTestId('fill-bunch')).toBeTruthy();
      expect(screen.queryByTestId('fill-feed')).toBeNull();
      expect(screen.getByRole('button', { name: 'feed' }).getAttribute('aria-current')).toBe(
        'page',
      );
    });

    it('알약을 누르거나 끄는 동안 알약이 커지고 손을 떼면 돌아온다', () => {
      mockRect();
      render(<BottomNavigation aria-label="주요 메뉴" items={items} selectedId="feed" />);
      const nav = screen.getByRole('navigation', { name: '주요 메뉴' });
      const inner = () => nav.querySelector('div[aria-hidden="true"] > span');

      expect(inner()?.className).toContain('scale-100');
      fireEvent.pointerDown(screen.getByRole('button', { name: '피드' }), {
        pointerId: 1,
        clientX: 20,
      });
      expect(inner()?.className).toContain('scale-[1.12]');
      fireEvent.pointerUp(nav, { pointerId: 1, clientX: 20 });
      expect(inner()?.className).toContain('scale-100');
    });

    it('다른 탭을 누를 때는 알약이 커지지 않는다', () => {
      mockRect();
      render(<BottomNavigation aria-label="주요 메뉴" items={items} selectedId="feed" />);
      const nav = screen.getByRole('navigation', { name: '주요 메뉴' });

      fireEvent.pointerDown(screen.getByRole('button', { name: '번치' }), {
        pointerId: 1,
        clientX: 250,
      });

      expect(nav.querySelector('div[aria-hidden="true"] > span')?.className).not.toContain(
        'scale-[1.12]',
      );
    });

    it('움직임이 작으면 끌기가 아니라 일반 탭이다', () => {
      mockRect();
      const onItemSelect = vi.fn();
      render(
        <BottomNavigation
          aria-label="주요 메뉴"
          items={items}
          selectedId="feed"
          onItemSelect={onItemSelect}
        />,
      );
      const nav = drag(screen.getByRole('button', { name: '사진함' }), [22]);

      fireEvent.pointerUp(nav, { pointerId: 1, pointerType: 'touch', clientX: 22 });
      fireEvent.click(screen.getByRole('button', { name: '사진함' }));

      expect(onItemSelect).toHaveBeenCalledTimes(1);
      expect(onItemSelect).toHaveBeenCalledWith('photos');
    });

    it('끌기를 취소하면 선택하지 않는다', () => {
      mockRect();
      const onItemSelect = vi.fn();
      render(
        <BottomNavigation
          aria-label="주요 메뉴"
          items={items}
          selectedId="feed"
          onItemSelect={onItemSelect}
        />,
      );
      const nav = drag(screen.getByRole('button', { name: '피드' }), [330]);

      fireEvent.pointerCancel(nav, { pointerId: 1, pointerType: 'touch', clientX: 330 });

      expect(onItemSelect).not.toHaveBeenCalled();
    });
  });

  it('className과 native nav 속성을 전달한다', () => {
    render(
      <BottomNavigation
        aria-label="주요 메뉴"
        items={items}
        selectedId="feed"
        className="mx-s6"
        data-testid="nav"
      />,
    );

    expect(screen.getByTestId('nav').className).toContain('mx-s6');
  });
});
