import { cleanup, render, screen, within } from '@testing-library/react';
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
