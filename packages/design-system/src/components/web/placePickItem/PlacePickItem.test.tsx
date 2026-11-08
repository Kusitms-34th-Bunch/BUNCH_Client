import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PlacePickItem } from './PlacePickItem';

describe('PlacePickItem', () => {
  it('이름·주소를 보여 주고, 버튼은 장소 이름을 설명으로 갖는다', async () => {
    const onPick = vi.fn();
    render(
      <PlacePickItem
        name="애월 한담해변"
        address="제주 제주시 애월읍"
        picked={false}
        onPick={onPick}
      />,
    );
    const button = screen.getByRole('button', { name: '콕하기' });

    expect(screen.getByText('제주 제주시 애월읍')).toBeTruthy();
    const describedBy = button.getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(describedBy)?.textContent).toBe('애월 한담해변');
    await userEvent.click(button);
    expect(onPick).toHaveBeenCalledTimes(1);
  });

  it('담긴 장소는 「콕 했어요」, 주소가 없으면 그 줄이 없다', () => {
    render(<PlacePickItem name="애월 한담해변" picked onPick={() => {}} />);

    expect(screen.getByRole('button', { name: '콕 했어요' })).toBeTruthy();
    expect(screen.queryByText('제주 제주시 애월읍')).toBeNull();
  });
});
