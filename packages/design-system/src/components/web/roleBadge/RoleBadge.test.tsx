import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RoleBadge, type RoleBadgeRole, type RoleBadgeSize } from './RoleBadge';

const FILLS: Record<RoleBadgeRole, string> = {
  owner: '#FFA100',
  coOwner: '#BFBFBF',
  draftAuthor: '#BFBFBF',
};

const renderBadge = (memberRole?: RoleBadgeRole, size?: RoleBadgeSize) => {
  const { container } = render(
    <RoleBadge {...(memberRole && { memberRole })} {...(size && { size })} />,
  );
  return container.querySelector('svg');
};

describe('RoleBadge', () => {
  it('label을 주면 이미지로 읽히고 이름이 label이다', () => {
    render(<RoleBadge memberRole="owner" label="번치장" />);

    expect(screen.getByRole('img', { name: '번치장' })).toBeTruthy();
  });

  it('label이 없으면 장식으로 숨겨진다', () => {
    const svg = renderBadge('owner');

    expect(screen.queryByRole('img')).toBeNull();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('label이 빈 문자열이면 장식으로 숨겨진다', () => {
    const { container } = render(<RoleBadge label="" />);

    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('기본값은 owner·sm(16px)이다', () => {
    const svg = renderBadge();

    expect(svg?.getAttribute('width')).toBe('16');
    expect(svg?.innerHTML).toContain(FILLS.owner);
  });

  it('md는 20px, sm은 16px 원이다', () => {
    expect(renderBadge('owner', 'sm')?.getAttribute('width')).toBe('16');
    expect(renderBadge('owner', 'md')?.getAttribute('width')).toBe('20');
  });

  it.each(Object.entries(FILLS) as [RoleBadgeRole, string][])(
    '%s는 Figma 배경색 %s을 쓴다',
    (memberRole, fill) => {
      expect(renderBadge(memberRole)?.innerHTML).toContain(fill);
    },
  );

  it('같은 회색 배경이어도 coOwner(왕관)와 draftAuthor(연필)는 글리프가 다르다', () => {
    const crown = renderBadge('coOwner')?.innerHTML;
    const pencil = renderBadge('draftAuthor')?.innerHTML;

    expect(crown).not.toBe(pencil);
    expect(renderBadge('owner')?.innerHTML.replace(FILLS.owner, FILLS.coOwner)).toBe(crown);
  });

  it('className을 전달한다', () => {
    const { container } = render(<RoleBadge className="ml-2" />);

    expect(container.querySelector('svg')?.classList.contains('ml-2')).toBe(true);
  });
});
