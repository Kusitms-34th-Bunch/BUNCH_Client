import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, type ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { VisibilityOption } from './VisibilityOption';

const icon = <svg data-testid="icon" />;

const Group = ({ onChange }: { onChange?: ComponentProps<'input'>['onChange'] }) => (
  <fieldset>
    <legend>공개 범위</legend>
    <VisibilityOption
      name="visibility"
      value="private"
      title="비공개 번치"
      description="승인된 팔로워만 볼 수 있어요"
      icon={icon}
      onChange={onChange}
    />
    <VisibilityOption
      name="visibility"
      value="public"
      title="공개 번치"
      description="누구나 볼 수 있어요"
      icon={icon}
      onChange={onChange}
    />
  </fieldset>
);

describe('VisibilityOption', () => {
  it('제목을 이름으로, 설명을 부가 설명으로 가진 라디오다', () => {
    render(<Group />);

    const radio = screen.getByRole('radio', { name: '비공개 번치' });
    expect(radio.getAttribute('aria-describedby')).toBeTruthy();
    expect(radio).toHaveProperty('checked', false);
    expect(document.getElementById(radio.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
      '승인된 팔로워만 볼 수 있어요',
    );
  });

  it('카드를 누르면 그 카드가 선택되고 같은 그룹의 다른 카드는 해제된다', async () => {
    const onChange = vi.fn();
    render(<Group onChange={onChange} />);

    await userEvent.click(screen.getByText('비공개 번치'));
    expect(screen.getByRole('radio', { name: '비공개 번치' })).toHaveProperty('checked', true);

    await userEvent.click(screen.getByText('공개 번치'));
    expect(screen.getByRole('radio', { name: '공개 번치' })).toHaveProperty('checked', true);
    expect(screen.getByRole('radio', { name: '비공개 번치' })).toHaveProperty('checked', false);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('키보드 방향키로 그룹 안에서 선택을 옮긴다', async () => {
    render(<Group />);

    await userEvent.tab();
    await userEvent.keyboard('{ArrowDown}');

    expect(screen.getByRole('radio', { name: '공개 번치' })).toHaveProperty('checked', true);
  });

  it('fieldset의 legend로 그룹 이름을 가진다', () => {
    render(<Group />);

    expect(screen.getByRole('group', { name: '공개 범위' })).toBeTruthy();
  });

  it('아이콘은 접근성에서 숨기고 className은 카드에 전달한다', () => {
    const { container } = render(
      <VisibilityOption
        name="visibility"
        title="공개 번치"
        description="누구나 볼 수 있어요"
        icon={icon}
        className="custom"
      />,
    );

    expect(screen.getByTestId('icon').closest('[aria-hidden="true"]')).toBeTruthy();
    expect(container.querySelector('label')?.className).toContain('custom');
  });

  it('ref는 라디오 input에 연결된다', () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <VisibilityOption
        ref={ref}
        name="visibility"
        title="공개 번치"
        description="누구나 볼 수 있어요"
        icon={icon}
      />,
    );

    expect(ref.current?.tagName).toBe('INPUT');
  });

  it('id를 넘기면 제목·설명 요소 id가 거기서 파생되고, 안 넘기면 카드마다 달라 이름이 섞이지 않는다', () => {
    const { unmount } = render(
      <VisibilityOption
        id="custom"
        name="a"
        title="공개 번치"
        description="누구나 볼 수 있어요"
        icon={icon}
      />,
    );
    const radio = screen.getByRole('radio', { name: '공개 번치' });
    expect(radio.getAttribute('aria-labelledby')).toBe('custom-title');
    expect(radio.getAttribute('aria-describedby')).toBe('custom-description');
    unmount();

    render(<Group />);
    const ids = screen.getAllByRole('radio').map((item) => item.getAttribute('aria-labelledby'));
    expect(new Set(ids).size).toBe(2);
  });

  it('checked를 넘겨 선택을 제어할 수 있다', () => {
    const { rerender } = render(
      <VisibilityOption
        name="a"
        title="공개 번치"
        description="설명"
        icon={icon}
        checked={false}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('radio')).toHaveProperty('checked', false);

    rerender(
      <VisibilityOption
        name="a"
        title="공개 번치"
        description="설명"
        icon={icon}
        checked
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('radio')).toHaveProperty('checked', true);
  });
});
