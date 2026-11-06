import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BunchAccordion } from './BunchAccordion';

const NAME = '퇴근런클럽';

describe('BunchAccordion', () => {
  it('번치 이름이 버튼의 이름이고 닫힌 채 시작한다', () => {
    render(<BunchAccordion name={NAME}>멤버 목록</BunchAccordion>);

    const button = screen.getByRole('button', { name: NAME });
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('누르면 펼쳐 내용 영역을 버튼과 연결하고, 다시 누르면 접는다', async () => {
    const onOpenChange = vi.fn();
    render(
      <BunchAccordion name={NAME} onOpenChange={onOpenChange}>
        멤버 목록
      </BunchAccordion>,
    );
    const button = screen.getByRole('button', { name: NAME });

    await userEvent.click(button);
    const panel = screen.getByRole('region', { name: NAME });
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.textContent).toContain('멤버 목록');

    await userEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(panel.hasAttribute('inert')).toBe(true);
    await waitFor(() => expect(panel.hidden).toBe(true));
    expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
  });

  it('open을 주면 호출하는 쪽 값을 따르고 바꿀 값만 알린다', async () => {
    const onOpenChange = vi.fn();
    render(
      <BunchAccordion name={NAME} open onOpenChange={onOpenChange}>
        멤버 목록
      </BunchAccordion>,
    );

    await userEvent.click(screen.getByRole('button', { name: NAME }));

    expect(screen.getByRole('button', { name: NAME }).getAttribute('aria-expanded')).toBe('true');
    expect(onOpenChange.mock.calls).toEqual([[false]]);
  });

  it('키보드로 포커스를 받고 Enter로 펼친다', async () => {
    render(<BunchAccordion name={NAME}>멤버 목록</BunchAccordion>);

    await userEvent.tab();
    await userEvent.keyboard('{Enter}');

    expect(screen.getByRole('button', { name: NAME }).getAttribute('aria-expanded')).toBe('true');
  });

  it('disabled이면 누를 수 없고 열리지 않는다', async () => {
    const onOpenChange = vi.fn();
    render(
      <BunchAccordion name={NAME} disabled onOpenChange={onOpenChange}>
        멤버 목록
      </BunchAccordion>,
    );
    const button = screen.getByRole<HTMLButtonElement>('button', { name: NAME });

    await userEvent.click(button);

    expect(button.disabled).toBe(true);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('펼친 채 disabled이면 내용도 inert로 막는다', () => {
    render(
      <BunchAccordion name={NAME} defaultOpen disabled>
        멤버 목록
      </BunchAccordion>,
    );

    expect(screen.getByRole('region', { name: NAME }).hasAttribute('inert')).toBe(true);
  });

  it('내용이 없으면 aria-controls와 내용 영역을 만들지 않는다', () => {
    render(<BunchAccordion name={NAME} defaultOpen />);

    expect(screen.getByRole('button', { name: NAME }).hasAttribute('aria-controls')).toBe(false);
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('번치 이미지는 장식으로 숨기고 className은 카드에 적용한다', () => {
    const { container } = render(
      <BunchAccordion name={NAME} imageSrc="/bunch.png" className="mt-2" />,
    );

    expect(container.querySelector('img')?.getAttribute('alt')).toBe('');
    expect(container.firstElementChild?.classList.contains('mt-2')).toBe(true);
  });

  it('selected면 접혔을 때만 브랜드 배경·테두리로 표시하고, 고른 값을 이름 뒤에 읽는다', async () => {
    const { container } = render(
      <BunchAccordion name="퇴근런클럽" selected selectedLabel="새 관리자: 서현">
        <p>멤버</p>
      </BunchAccordion>,
    );
    const card = container.firstElementChild as HTMLElement;
    const header = screen.getByRole('button', { name: /^퇴근런클럽\s?, 새 관리자: 서현$/ });

    expect(card.className).toContain('bg-surface-brand-subtle-1');
    expect(card.className).toContain('outline-border-brand-subtle');

    await userEvent.click(header);
    expect(card.className).toContain('bg-surface-primary');
    expect(card.className).not.toContain('bg-surface-brand-subtle-1');
  });

  it('selected가 아니면 고른 값 문구를 읽지 않는다', () => {
    render(<BunchAccordion name="퇴근런클럽" selectedLabel="새 관리자: 서현" />);

    expect(screen.getByRole('button', { name: '퇴근런클럽' })).toBeTruthy();
  });
});
