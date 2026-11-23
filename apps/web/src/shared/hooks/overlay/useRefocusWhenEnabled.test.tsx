import { render } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { useRefocusWhenEnabled } from '@/shared/hooks/overlay/useRefocusWhenEnabled';

function Retry({
  enabled,
  failed,
  buttonDisabled = !enabled,
}: {
  enabled: boolean;
  failed: boolean;
  buttonDisabled?: boolean;
}) {
  const [ref, refocus] = useRefocusWhenEnabled<HTMLButtonElement>(enabled);
  useEffect(() => {
    if (failed) refocus();
  }, [failed, refocus]);
  return (
    <button ref={ref} type="button" disabled={buttonDisabled}>
      다시
    </button>
  );
}

describe('useRefocusWhenEnabled', () => {
  it('실패한 뒤 버튼이 다시 활성이 되면 그 버튼으로 초점을 돌려준다', () => {
    const { rerender, getByRole } = render(<Retry enabled={false} failed={false} />);
    rerender(<Retry enabled={false} failed />);
    expect(document.activeElement).not.toBe(getByRole('button'));

    rerender(<Retry enabled failed />);
    expect(document.activeElement).toBe(getByRole('button'));
  });

  it('실패하지 않았으면 활성이 되어도 초점을 옮기지 않는다', () => {
    const { rerender, getByRole } = render(<Retry enabled={false} failed={false} />);
    rerender(<Retry enabled failed={false} />);
    expect(document.activeElement).not.toBe(getByRole('button'));
  });

  it('요청이 끝났을 때 버튼이 다른 이유로 꺼져 있으면 요청만 끝내고 나중에 초점을 옮기지 않는다', () => {
    const { rerender, getByRole } = render(<Retry enabled={false} failed={false} />);
    rerender(<Retry enabled={false} failed />);
    // 요청은 끝났지만 고른 사진이 없어 버튼은 꺼진 채
    rerender(<Retry enabled failed buttonDisabled />);
    expect(document.activeElement).not.toBe(getByRole('button'));

    rerender(<Retry enabled failed buttonDisabled={false} />);
    expect(document.activeElement).not.toBe(getByRole('button'));
  });

  it('그사이 사용자가 다른 곳(입력란)에 초점을 뒀으면 빼앗지 않는다', () => {
    const { rerender, getByRole } = render(
      <>
        <input aria-label="입력" />
        <Retry enabled={false} failed={false} />
      </>,
    );
    rerender(
      <>
        <input aria-label="입력" />
        <Retry enabled={false} failed />
      </>,
    );
    const input = getByRole('textbox', { name: '입력' });
    input.focus();
    rerender(
      <>
        <input aria-label="입력" />
        <Retry enabled failed />
      </>,
    );
    expect(document.activeElement).toBe(input);
  });
});
