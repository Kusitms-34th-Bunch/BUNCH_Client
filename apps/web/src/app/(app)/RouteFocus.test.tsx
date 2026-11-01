import { act, render, screen, waitFor } from '@testing-library/react';
import { type ReactNode, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RouteFocus } from './RouteFocus';

const navigation = vi.hoisted(() => ({ pathname: '/bunch/menu' }));
vi.mock('next/navigation', () => ({ usePathname: () => navigation.pathname }));

function Screen({ title, leavingTitle }: { title?: string; leavingTitle?: string }) {
  return (
    <>
      {leavingTitle && (
        <div data-page-leaving="">
          <h1>{leavingTitle}</h1>
        </div>
      )}
      <div>
        {title && <h1>{title}</h1>}
        <button type="button">누른 버튼</button>
      </div>
    </>
  );
}

// 레이아웃처럼 화면이 바뀌어도 RouteFocus는 다시 마운트되지 않게 wrapper에 둠
function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <RouteFocus />
      {children}
    </>
  );
}
const renderScreen = (ui: ReactNode) => render(ui, { wrapper: Layout });

const navigate = (rerender: (_ui: ReactNode) => void, pathname: string, ui: ReactNode) => {
  navigation.pathname = pathname;
  rerender(ui);
};

beforeEach(() => {
  navigation.pathname = '/bunch/menu';
});

describe('RouteFocus', () => {
  it('처음 로드에는 초점을 옮기지 않는다', async () => {
    renderScreen(<Screen title="번치 더보기" />);

    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(document.body).toHaveFocus();
  });

  it('다른 화면으로 가면 나가는 화면이 아닌 새 화면의 h1으로 초점을 옮긴다', async () => {
    const { rerender } = renderScreen(<Screen title="번치 더보기" />);

    navigate(
      rerender,
      '/bunch/menu/blocked',
      <Screen title="차단 목록" leavingTitle="번치 더보기" />,
    );

    const heading = screen.getByRole('heading', { name: '차단 목록' });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(heading).toHaveAttribute('tabindex', '-1');
  });

  it('이동을 누른 버튼에 초점이 남아 있어도 새 화면의 h1으로 옮긴다', async () => {
    // 같은 DOM이 남아 나가는 화면이 되는 순서(누른 버튼에 초점이 그대로 있음)
    const Page = ({ leaving }: { leaving: boolean }) => (
      <>
        <div {...(leaving && { 'data-page-leaving': '' })}>
          <button type="button">메뉴 버튼</button>
        </div>
        {leaving && <h1>차단 목록</h1>}
      </>
    );
    const { rerender } = renderScreen(<Page leaving={false} />);
    const pressed = screen.getByRole('button', { name: '메뉴 버튼' });
    pressed.focus();

    navigate(rerender, '/bunch/menu/blocked', <Page leaving />);

    await waitFor(() => expect(screen.getByRole('heading', { name: '차단 목록' })).toHaveFocus());
  });

  it('초점을 준 제목에 나가는 화면 표식이 늦게 붙으면 새 화면의 h1으로 다시 옮긴다', async () => {
    function LateLeaving() {
      const [leaving, setLeaving] = useState(false);
      return (
        <>
          <div {...(leaving && { 'data-page-leaving': '' })}>
            <h1>번치 더보기</h1>
          </div>
          <h1>차단 목록</h1>
          <button type="button" onClick={() => setLeaving(true)}>
            전환 시작
          </button>
        </>
      );
    }
    const { rerender } = renderScreen(<Screen title="번치" />);
    navigate(rerender, '/bunch/menu/blocked', <LateLeaving />);
    await waitFor(() => expect(screen.getByRole('heading', { name: '번치 더보기' })).toHaveFocus());

    act(() => screen.getByRole('button', { name: '전환 시작' }).click());

    await waitFor(() => expect(screen.getByRole('heading', { name: '차단 목록' })).toHaveFocus());
  });

  it('기다리는 사이 초점이 다른 요소로 옮겨졌으면 제목으로 빼앗지 않는다', async () => {
    function LateTitle() {
      const [ready, setReady] = useState(false);
      return (
        <>
          {ready ? <Screen title="사진 상세" /> : <Screen />}
          <button type="button" onClick={() => setReady(true)}>
            준비
          </button>
        </>
      );
    }
    const { rerender } = renderScreen(<Screen title="사진함" />);
    navigate(rerender, '/photos/1', <LateTitle />);

    await new Promise((resolve) => requestAnimationFrame(resolve));
    const typing = screen.getByRole('button', { name: '누른 버튼' });
    typing.focus();
    act(() => screen.getByRole('button', { name: '준비' }).click());
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(typing).toHaveFocus();
  });

  it('제목을 늦게 그리는 화면도(1초가 지나도) 그려지면 초점을 옮긴다', async () => {
    function LateTitle() {
      const [ready, setReady] = useState(false);
      return (
        <>
          {ready ? <Screen title="번치를 소개해주세요" /> : <Screen />}
          <button type="button" onClick={() => setReady(true)}>
            준비
          </button>
        </>
      );
    }
    const { rerender } = renderScreen(<Screen title="어떤 번치를 만들까요?" />);
    navigate(rerender, '/onboarding/create/description', <LateTitle />);

    // 느린 서버 응답처럼 1초 넘게 제목이 없음
    await new Promise((resolve) => setTimeout(resolve, 1100));
    act(() => screen.getByRole('button', { name: '준비' }).click());

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: '번치를 소개해주세요' })).toHaveFocus(),
    );
  });

  it('하단 탭끼리 이동하면 누른 탭의 초점을 그대로 둔다', async () => {
    navigation.pathname = '/feed';
    const { rerender } = renderScreen(<Screen title="피드" />);
    const tab = screen.getByRole('button', { name: '누른 버튼' });
    tab.focus();

    navigate(rerender, '/photos', <Screen title="사진함" />);

    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(tab).toHaveFocus();
  });
});
