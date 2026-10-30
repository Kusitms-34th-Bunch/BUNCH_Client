import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders its children as text', () => {
    render(<Badge>TIP</Badge>);

    expect(screen.getByText('TIP').tagName).toBe('SPAN');
  });

  it('defaults to weak brand large', () => {
    render(<Badge>TIP</Badge>);
    const badge = screen.getByText('TIP');

    expect(badge.className).toContain('bg-chip-blue-bg');
    expect(badge.className).toContain('text-chip-blue-fg');
    expect(badge.className).toContain('typography-body-3-semi-bold');
  });

  it.each([
    ['weak', 'gray', 'bg-chip-gray-bg', 'text-chip-gray-fg'],
    ['strong', 'brand', 'bg-chip-blue-fg', 'text-text-inversed'],
    ['strong', 'gray', 'bg-chip-gray-fg', 'text-chip-gray-bg'],
  ] as const)('applies %s %s colors', (variant, color, bg, fg) => {
    render(
      <Badge variant={variant} color={color}>
        TIP
      </Badge>,
    );
    const badge = screen.getByText('TIP');

    expect(badge.className).toContain(bg);
    expect(badge.className).toContain(fg);
  });

  it.each([
    ['md', 'typography-body-4-semi-bold'],
    ['sm', 'typography-caption-1-medium'],
  ] as const)('applies %s typography', (size, typography) => {
    render(<Badge size={size}>TIP</Badge>);

    expect(screen.getByText('TIP').className).toContain(typography);
  });

  it('merges className and native attributes', () => {
    render(
      <Badge className="ml-2" data-testid="badge">
        TIP
      </Badge>,
    );

    expect(screen.getByTestId('badge').className).toContain('ml-2');
  });
});
