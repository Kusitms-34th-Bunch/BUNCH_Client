import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MenuTabs } from './MenuTabs';

afterEach(cleanup);

const Example = ({ withCount = true }: { withCount?: boolean }) => (
  <MenuTabs.Root defaultValue="followers">
    <MenuTabs.List aria-label="팔로우 목록">
      <MenuTabs.Tab value="followers" label="팔로워" {...(withCount ? { count: 120 } : {})} />
      <MenuTabs.Tab value="following" label="팔로잉" {...(withCount ? { count: 98 } : {})} />
    </MenuTabs.List>
    <MenuTabs.Panel value="followers">팔로워 목록</MenuTabs.Panel>
    <MenuTabs.Panel value="following">팔로잉 목록</MenuTabs.Panel>
  </MenuTabs.Root>
);

describe('MenuTabs', () => {
  it('탭 이름과 숫자가 탭의 접근성 이름이고 첫 탭이 선택된다', () => {
    render(<Example />);

    expect(screen.getByRole('tablist', { name: '팔로우 목록' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: '팔로워 120' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(screen.getByRole('tabpanel').textContent).toBe('팔로워 목록');
  });

  it('다른 탭을 누르면 선택과 패널이 바뀐다', () => {
    render(<Example />);

    fireEvent.click(screen.getByRole('tab', { name: '팔로잉 98' }));

    expect(screen.getByRole('tab', { name: '팔로잉 98' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(screen.getByRole('tabpanel').textContent).toBe('팔로잉 목록');
  });

  // Enter·Space 선택은 버튼의 기본 클릭이라 실제 브라우저에서 확인(테스트 DOM은 keydown으로 click을 만들지 않음)
  it('방향키는 초점만 옮기고 선택은 바꾸지 않는다', async () => {
    render(<Example />);
    const first = screen.getByRole('tab', { name: '팔로워 120' });
    const second = screen.getByRole('tab', { name: '팔로잉 98' });
    first.focus();

    fireEvent.keyDown(first, { key: 'ArrowRight' });

    await vi.waitFor(() => expect(document.activeElement).toBe(second));
    expect(first.getAttribute('aria-selected')).toBe('true');
    expect(second.getAttribute('aria-selected')).toBe('false');
  });

  it('숫자가 없으면 이름만 보여 준다', () => {
    render(<Example withCount={false} />);

    expect(screen.getByRole('tab', { name: '팔로워' })).toBeTruthy();
  });

  it('아이콘 탭은 label이 접근성 이름이고 선택되면 채운 아이콘을 보여 준다', () => {
    render(
      <MenuTabs.Root defaultValue="photos">
        <MenuTabs.List aria-label="보기">
          <MenuTabs.IconTab
            value="photos"
            label="사진"
            icon={<svg data-testid="line" />}
            selectedIcon={<svg data-testid="fill" />}
          />
          <MenuTabs.IconTab
            value="bundles"
            label="번들"
            icon={<svg data-testid="line" />}
            selectedIcon={<svg data-testid="fill" />}
          />
        </MenuTabs.List>
      </MenuTabs.Root>,
    );

    const photos = screen.getByRole('tab', { name: '사진' });
    expect(photos.getAttribute('aria-selected')).toBe('true');
    // 두 아이콘은 장식이고 보이는 쪽은 CSS(data-active)가 고름
    expect(photos.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);

    fireEvent.click(screen.getByRole('tab', { name: '번들' }));

    expect(screen.getByRole('tab', { name: '번들' }).getAttribute('aria-selected')).toBe('true');
    expect(photos.getAttribute('aria-selected')).toBe('false');
  });

  it('서버 HTML에도 선택 밑줄 위치를 넣는 스크립트를 둔다(hydration 전 밑줄 표시)', () => {
    const html = renderToString(<Example />);

    expect(html).toContain('<script');
  });
});
