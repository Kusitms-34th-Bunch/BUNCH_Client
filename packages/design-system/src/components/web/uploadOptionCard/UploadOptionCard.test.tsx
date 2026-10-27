import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UploadOptionCard } from './UploadOptionCard';

const renderCard = (props: Partial<Parameters<typeof UploadOptionCard>[0]> = {}) =>
  render(
    <UploadOptionCard title="앨범에서 선택" description="여러 장을 한 번에 올려요" {...props} />,
  );

describe('UploadOptionCard', () => {
  it('제목이 버튼의 이름이다', () => {
    renderCard();

    expect(screen.getByRole('button', { name: '앨범에서 선택' })).toBeTruthy();
  });

  it('설명은 이름이 아니라 설명으로 연결된다', () => {
    renderCard();
    const button = screen.getByRole('button', { name: '앨범에서 선택' });
    const describedBy = button.getAttribute('aria-describedby');

    expect(document.getElementById(describedBy ?? '')?.textContent).toBe(
      '여러 장을 한 번에 올려요',
    );
  });

  it('눌러서 onClick을 부른다', async () => {
    const onClick = vi.fn();
    renderCard({ onClick });

    await userEvent.click(screen.getByRole('button', { name: '앨범에서 선택' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('키보드 Enter·Space로도 누른다', async () => {
    const onClick = vi.fn();
    renderCard({ onClick });

    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button'));
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');

    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('form 안에서 눌러도 제출하지 않는다', async () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <UploadOptionCard title="앨범에서 선택" description="여러 장을 한 번에 올려요" />
      </form>,
    );

    await userEvent.click(screen.getByRole('button'));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('타입을 우회해 넘긴 type·aria 속성이 이름·설명 계약을 덮지 못한다', () => {
    const bypass = {
      type: 'submit',
      'aria-labelledby': 'other',
      'aria-describedby': 'other',
    } as object;
    render(
      <UploadOptionCard title="앨범에서 선택" description="여러 장을 한 번에 올려요" {...bypass} />,
    );

    const button = screen.getByRole('button', { name: '앨범에서 선택' });
    expect(button.getAttribute('type')).toBe('button');
    expect(
      document.getElementById(button.getAttribute('aria-describedby') ?? '')?.textContent,
    ).toBe('여러 장을 한 번에 올려요');
  });

  it('title이 DOM title 속성(툴팁)으로 새지 않는다', () => {
    renderCard();

    expect(screen.getByRole('button').hasAttribute('title')).toBe(false);
  });

  it('className과 나머지 button 속성을 전달한다', () => {
    render(
      <UploadOptionCard
        title="앨범에서 선택"
        description="여러 장을 한 번에 올려요"
        className="mt-2"
        data-testid="card"
      />,
    );

    const button = screen.getByTestId('card');
    expect(button.classList.contains('mt-2')).toBe(true);
    expect(button.getAttribute('type')).toBe('button');
  });
});
