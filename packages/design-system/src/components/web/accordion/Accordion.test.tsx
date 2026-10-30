import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Accordion } from './Accordion';

describe('Accordion', () => {
  it('제목이 버튼의 이름이고 닫힌 채 시작한다', () => {
    render(<Accordion title="촬영 날짜를 확인할 사진">내용</Accordion>);

    const button = screen.getByRole('button', { name: '촬영 날짜를 확인할 사진' });
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('닫는 동안에는 내용을 유지하되 접근성 트리에서 숨기는 클래스를 준다', async () => {
    render(
      <Accordion title="사진" defaultOpen>
        내용
      </Accordion>,
    );
    const panel = screen.getByRole('region', { name: '사진' });
    expect(panel.className.split(' ')).toContain('visible');

    await userEvent.click(screen.getByRole('button', { name: '사진' }));

    expect(panel.hidden).toBe(false);
    expect(panel.className.split(' ')).toContain('invisible');
    await waitFor(() => expect(panel.hidden).toBe(true));
  });

  it('개수는 이름에 포함되고 설명은 이름이 아니라 설명으로 연결된다', () => {
    render(
      <Accordion
        title="촬영 날짜를 확인할 사진"
        count="9장"
        description="날짜 확인하고 추억 정리하기"
      />,
    );

    const button = screen.getByRole('button', { name: '촬영 날짜를 확인할 사진 9장' });
    const describedBy = button.getAttribute('aria-describedby');
    expect(describedBy).not.toBeNull();
    expect(document.getElementById(describedBy ?? '')?.textContent).toBe(
      '날짜 확인하고 추억 정리하기',
    );
  });

  it('눌러서 펼치고 접으며 aria-expanded와 내용 표시가 함께 바뀐다', async () => {
    render(<Accordion title="사진">내용</Accordion>);
    const button = screen.getByRole('button', { name: '사진' });

    await userEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('region', { name: '사진' }).textContent).toBe('내용');

    await userEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    // 닫는 전환(340ms)이 끝나면 내용을 걷어냄
    await waitFor(() => expect(screen.queryByRole('region')).toBeNull());
  });

  it('키보드 Enter·Space로도 토글한다', async () => {
    render(<Accordion title="사진">내용</Accordion>);
    const button = screen.getByRole('button', { name: '사진' });

    await userEvent.tab();
    expect(document.activeElement).toBe(button);
    await userEvent.keyboard('{Enter}');
    expect(button.getAttribute('aria-expanded')).toBe('true');
    await userEvent.keyboard(' ');
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('defaultOpen이면 처음부터 펼쳐져 있다', () => {
    render(
      <Accordion title="사진" defaultOpen>
        내용
      </Accordion>,
    );

    expect(screen.getByRole('button', { name: '사진' }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('region', { name: '사진' })).toBeTruthy();
  });

  it('open을 주면 호출하는 쪽 값을 따르고 onOpenChange로 요청만 알린다', async () => {
    const onOpenChange = vi.fn();
    render(
      <Accordion title="사진" open={false} onOpenChange={onOpenChange}>
        내용
      </Accordion>,
    );
    const button = screen.getByRole('button', { name: '사진' });

    await userEvent.click(button);

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('controlled에서 열린 상태를 누르면 닫힘을 요청한다', async () => {
    const onOpenChange = vi.fn();
    render(
      <Accordion title="사진" open onOpenChange={onOpenChange}>
        내용
      </Accordion>,
    );

    await userEvent.click(screen.getByRole('button', { name: '사진' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('uncontrolled에서도 바뀔 때 onOpenChange를 부른다', async () => {
    const onOpenChange = vi.fn();
    render(
      <Accordion title="사진" onOpenChange={onOpenChange}>
        내용
      </Accordion>,
    );

    await userEvent.click(screen.getByRole('button', { name: '사진' }));

    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('open prop이 바뀌면 화면에 반영된다', () => {
    const { rerender } = render(
      <Accordion title="사진" open={false}>
        내용
      </Accordion>,
    );
    expect(screen.queryByRole('region')).toBeNull();

    rerender(
      <Accordion title="사진" open>
        내용
      </Accordion>,
    );

    expect(screen.getByRole('region', { name: '사진' })).toBeTruthy();
  });

  it('개수가 없으면 이름에 섞이지 않고 나머지 div 속성은 바깥 요소에 전달된다', () => {
    render(<Accordion title="사진" description="설명" data-testid="accordion" />);

    expect(screen.getByRole('button', { name: '사진' })).toBeTruthy();
    expect(screen.getByTestId('accordion').tagName).toBe('DIV');
  });

  it('여러 항목을 같이 그려도 id가 겹치지 않는다', () => {
    render(
      <>
        <Accordion title="첫째" defaultOpen>
          내용 1
        </Accordion>
        <Accordion title="둘째" defaultOpen>
          내용 2
        </Accordion>
      </>,
    );

    expect(screen.getByRole('region', { name: '첫째' }).textContent).toBe('내용 1');
    expect(screen.getByRole('region', { name: '둘째' }).textContent).toBe('내용 2');
  });

  it('내용이 없으면 aria-controls와 영역을 만들지 않는다', async () => {
    render(<Accordion title="사진" />);
    const button = screen.getByRole('button', { name: '사진' });

    await userEvent.click(button);

    expect(button.getAttribute('aria-controls')).toBeNull();
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('열려 있을 때 aria-controls가 내용 영역을 가리킨다', () => {
    render(
      <Accordion title="사진" defaultOpen>
        내용
      </Accordion>,
    );

    const controls = screen.getByRole('button', { name: '사진' }).getAttribute('aria-controls');

    expect(document.getElementById(controls ?? '')).toBe(screen.getByRole('region'));
  });

  it('제목 수준은 기본 3이고 headingLevel로 바꾼다', () => {
    const { rerender } = render(<Accordion title="사진" />);
    expect(screen.getByRole('heading', { level: 3, name: '사진' })).toBeTruthy();

    rerender(<Accordion title="사진" headingLevel={4} />);
    expect(screen.getByRole('heading', { level: 4, name: '사진' })).toBeTruthy();
  });

  it('쉐브론은 보조기기에서 숨기고 className은 바깥 요소에 적용한다', () => {
    const { container } = render(<Accordion title="사진" className="mt-2" />);

    expect(container.querySelector('button svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(container.firstElementChild?.classList.contains('mt-2')).toBe(true);
  });
});
