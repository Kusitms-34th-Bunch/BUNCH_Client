import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MenuDivider } from './MenuDivider';

describe('MenuDivider', () => {
  it('role=separator이고 0.4px border-secondary 선이다', () => {
    render(<MenuDivider />);
    const line = screen.getByRole('separator');
    expect(line.className).toContain('h-[0.4px]');
    expect(line.className).toContain('bg-border-secondary');
  });
});
