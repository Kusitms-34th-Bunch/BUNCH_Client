import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EditingAnimation } from './EditingAnimation';

describe('EditingAnimation', () => {
  it('label을 주면 이미지로 읽히고 이름이 label이다', () => {
    render(<EditingAnimation label="편집 중" />);

    expect(screen.getByRole('img', { name: '편집 중' })).toBeTruthy();
  });

  it('label이 없으면 장식으로 숨겨진다', () => {
    const { container } = render(<EditingAnimation />);

    expect(screen.queryByRole('img')).toBeNull();
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });

  it('label이 빈 문자열이나 공백이면 장식으로 숨겨진다', () => {
    const { container } = render(
      <>
        <EditingAnimation label="" />
        <EditingAnimation label="  " />
      </>,
    );

    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
  });

  it('타입을 우회해 넘긴 접근성 속성이 label 계약을 덮지 못한다', () => {
    const bypass = { role: 'button', 'aria-label': '덮어쓰기' } as object;
    const hidden = { 'aria-hidden': false } as object;
    const { container } = render(
      <>
        <EditingAnimation label="편집 중" {...bypass} />
        <EditingAnimation {...hidden} />
      </>,
    );

    expect(screen.getByRole('img', { name: '편집 중' })).toBeTruthy();
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1);
  });

  it('className을 병합하고 나머지 span 속성을 전달한다', () => {
    render(<EditingAnimation className="ml-2" data-testid="editing" />);

    expect(screen.getByTestId('editing').classList.contains('ml-2')).toBe(true);
  });
});
