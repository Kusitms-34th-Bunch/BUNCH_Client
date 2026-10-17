import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Header } from './Header';

describe('Header', () => {
  it('shows leading, title and trailing in order', () => {
    render(
      <Header
        leading={<button type="button">뒤로</button>}
        title="제목"
        trailing={<button type="button">버튼</button>}
      />,
    );

    const items = [
      screen.getByRole('button', { name: '뒤로' }),
      screen.getByText('제목'),
      screen.getByRole('button', { name: '버튼' }),
    ];

    expect(items[0]!.compareDocumentPosition(items[1]!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(items[1]!.compareDocumentPosition(items[2]!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('renders children in the center when there is no title', () => {
    render(
      <Header>
        <input aria-label="검색" />
      </Header>,
    );

    expect(screen.getByRole('textbox', { name: '검색' })).toBeTruthy();
  });

  it('prefers title over children', () => {
    render(
      <Header title="제목">
        <input aria-label="검색" />
      </Header>,
    );

    expect(screen.getByText('제목')).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: '검색' })).toBeNull();
  });

  it('keeps trailing on the right even without a title', () => {
    render(<Header leading={<span>계정</span>} trailing={<button type="button">설정</button>} />);

    expect(screen.getByRole('button', { name: '설정' }).parentElement?.className).toContain(
      'ml-auto',
    );
  });

  it('exposes a banner landmark', () => {
    render(<Header title="제목" />);

    expect(screen.getByRole('banner')).toBeTruthy();
  });
});
