import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppFrame } from './AppFrame';
import { PageShell } from './PageShell';

describe('PageShell', () => {
  it('헤더, 본문, 하단 영역을 이 순서로 그린다', () => {
    render(
      <PageShell header={<p>헤더</p>} bottom={<p>하단</p>}>
        <p>본문</p>
      </PageShell>,
    );

    const header = screen.getByText('헤더');
    const body = screen.getByText('본문');
    const bottom = screen.getByText('하단');

    expect(header.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(body.compareDocumentPosition(bottom) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('기본 배경은 흰색이고 className으로 배경색을 바꿀 수 있다', () => {
    const { container, rerender } = render(
      <PageShell>
        <p>본문</p>
      </PageShell>,
    );
    expect(container.firstElementChild?.className).toContain('bg-surface-primary');

    rerender(
      <PageShell className="bg-surface-brand-subtle-1">
        <p>본문</p>
      </PageShell>,
    );

    const shell = container.firstElementChild;
    expect(shell?.className).toContain('bg-surface-brand-subtle-1');
    expect(shell?.className).not.toContain('bg-surface-primary');
  });

  it('본문만 main 영역에 두고 스크롤을 맡긴다', () => {
    render(
      <PageShell header={<p>헤더</p>} bottom={<p>하단</p>}>
        <p>본문</p>
      </PageShell>,
    );

    const main = screen.getByRole('main');

    expect(main).toContainElement(screen.getByText('본문'));
    expect(main).not.toContainElement(screen.getByText('헤더'));
    expect(main).not.toContainElement(screen.getByText('하단'));
  });

  it('header와 bottom을 생략하면 본문만 그린다', () => {
    const { container } = render(
      <PageShell>
        <p>본문</p>
      </PageShell>,
    );

    expect(screen.getByRole('main')).toHaveTextContent('본문');
    // 빈 header·bottom 영역 없이 DOM에 main만 남는지 확인
    expect(container.firstElementChild?.children).toHaveLength(1);
  });
});

describe('AppFrame', () => {
  it('Safe Area 변수로 상하좌우 여백을 두고 하위 화면을 그대로 그린다', () => {
    const { container } = render(
      <AppFrame>
        <p>화면</p>
      </AppFrame>,
    );

    expect(screen.getByText('화면')).toBeInTheDocument();
    const frame = container.firstElementChild;
    expect(frame).toHaveClass(
      'pt-(--safe-area-top)',
      'pr-(--safe-area-right)',
      'pl-(--safe-area-left)',
    );
    // 아래 Safe Area는 화면이 다른 색을 줄 수 있도록 마지막 자식 요소가 차지
    expect(frame?.lastElementChild).toHaveClass('h-(--safe-area-bottom)');
  });
});
