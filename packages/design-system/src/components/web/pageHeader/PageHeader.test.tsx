import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Stepper } from '../stepper';
import { PageHeader } from './PageHeader';

const isBefore = (first: Element, second: Element) =>
  Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('PageHeader', () => {
  it('제목을 1단계 제목(h1)으로, 설명을 그 아래에 보여 준다', () => {
    render(<PageHeader title="함께 기록할 멤버를 초대해보세요" description="초대 링크를 보내면" />);

    const heading = screen.getByRole('heading', {
      level: 1,
      name: '함께 기록할 멤버를 초대해보세요',
    });
    expect(isBefore(heading, screen.getByText('초대 링크를 보내면'))).toBe(true);
  });

  it('설명이 없으면 설명 영역을 그리지 않는다', () => {
    const { container } = render(<PageHeader title="제목" />);

    expect(container.querySelector('p')).toBeNull();
  });

  it('진행 표시를 제목 위에 보여 준다', () => {
    render(<PageHeader title="제목" progress={<Stepper total={3} current={1} />} />);

    expect(isBefore(screen.getByRole('progressbar'), screen.getByRole('heading'))).toBe(true);
  });

  it('진행 표시가 없으면 progressbar를 그리지 않는다', () => {
    render(<PageHeader title="제목" description="설명" />);

    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});
