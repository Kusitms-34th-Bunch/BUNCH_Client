import { Calendar } from '@app/design-system';
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';

// 어드민이 디자인 시스템 core(캘린더)를 가져다 쓸 수 있는지(#562에서 core로 옮김)
it('디자인 시스템 캘린더를 그린다', () => {
  render(<Calendar defaultMonth={new Date(2026, 10, 1)} />);
  expect(screen.getByRole('grid')).toBeInTheDocument();
});
