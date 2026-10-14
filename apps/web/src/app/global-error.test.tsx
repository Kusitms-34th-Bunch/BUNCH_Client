import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GlobalError from './global-error';

const { captureException } = vi.hoisted(() => ({ captureException: vi.fn() }));
vi.mock('@sentry/nextjs', () => ({ captureException }));

describe('GlobalError', () => {
  it('captures the error without rendering its message and lets the user retry', () => {
    const error = new Error('private error details');
    const reset = vi.fn();
    render(<GlobalError error={error} reset={reset} />);
    expect(captureException).toHaveBeenCalledWith(error);
    expect(screen.queryByText(error.message)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
