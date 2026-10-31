import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BundleTitle, type BundleTitleProps } from './BundleTitle';

const renderTitle = (props?: Partial<BundleTitleProps>) =>
  render(<BundleTitle title="사진" {...props} />);

const makeMembers = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ name: `멤버${index + 1}`, src: `m${index}.png` }));

describe('BundleTitle', () => {
  it('제목 글자를 SemiBold 14/21 토큰으로 보여 준다', () => {
    renderTitle();
    const title = screen.getByText('사진');

    expect(title.classList.contains('typography-body-3-semi-bold')).toBe(true);
    expect(title.classList.contains('text-text-secondary')).toBe(true);
  });

  it('variant=weak면 제목 글자가 Regular 14/21 토큰이다', () => {
    renderTitle({ variant: 'weak' });
    const title = screen.getByText('사진');

    expect(title.classList.contains('typography-body-3-regular')).toBe(true);
    expect(title.classList.contains('typography-body-3-semi-bold')).toBe(false);
    expect(title.classList.contains('text-text-secondary')).toBe(true);
  });

  it('줄은 높이 25px(h-6.25)에 간격 8px(gap-s4)이다', () => {
    const { container } = renderTitle();
    const { classList } = container.firstElementChild as HTMLElement;

    expect(classList.contains('h-6.25')).toBe(true);
    expect(classList.contains('gap-s4')).toBe(true);
  });

  it('기본으로 위치 핀 아이콘이 있고 icon=false면 없다', () => {
    const { container, rerender } = renderTitle();

    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');

    rerender(<BundleTitle title="사진" icon={false} />);

    expect(container.querySelector('svg')).toBeNull();
  });

  it('titleId를 주면 제목 글자 요소의 id가 된다', () => {
    renderTitle({ titleId: 'photo-title' });

    expect(screen.getByText('사진').getAttribute('id')).toBe('photo-title');
  });

  it('required가 아니면 별표가 없고 required면 별표는 숨기고 필수를 읽어 준다', () => {
    const { rerender } = renderTitle();

    expect(screen.queryByText('*')).toBeNull();

    rerender(<BundleTitle title="사진" required />);
    const star = screen.getByText('*');

    expect(star.getAttribute('aria-hidden')).toBe('true');
    expect(star.classList.contains('text-icon-brand')).toBe(true);
    expect(screen.getByText('필수').classList.contains('sr-only')).toBe(true);
  });

  it('requiredLabel로 읽어 주는 글자를 바꾼다', () => {
    renderTitle({ required: true, requiredLabel: 'required' });

    expect(screen.getByText('required')).toBeTruthy();
  });

  it('members가 없거나 비어 있으면 아바타 목록이 없다', () => {
    const { rerender } = renderTitle();

    expect(screen.queryByRole('list')).toBeNull();

    rerender(<BundleTitle title="사진" members={[]} />);

    expect(screen.queryByRole('list')).toBeNull();
  });

  it('members를 주면 이름이 대체 텍스트인 아바타가 목록으로 나온다', () => {
    renderTitle({ members: makeMembers(3) });
    const list = screen.getByRole('list', { name: '멤버' });

    expect(list.querySelectorAll('li')).toHaveLength(3);
    expect(screen.getByRole('img', { name: '멤버1' }).getAttribute('src')).toBe('m0.png');
  });

  it('아바타는 24px 원에 테두리가 있고 첫째를 뺀 나머지는 8px씩 겹친다', () => {
    renderTitle({ members: makeMembers(3) });
    const items = screen.getAllByRole('listitem');
    const avatar = screen.getByRole('img', { name: '멤버2' }).parentElement as HTMLElement;

    expect(avatar.classList.contains('size-6')).toBe(true);
    expect(avatar.classList.contains('size-22.5')).toBe(false);
    expect(avatar.classList.contains('border-border-tertiary')).toBe(true);
    expect(items.map((item) => item.classList.contains('-ml-2'))).toEqual([false, true, true]);
  });

  it('아바타는 최대 8명만 보인다', () => {
    renderTitle({ members: makeMembers(10) });

    expect(screen.getAllByRole('listitem')).toHaveLength(8);
    expect(screen.queryByRole('img', { name: '멤버9' })).toBeNull();
  });

  it('membersLabel로 아바타 목록 이름을 바꾼다', () => {
    renderTitle({ members: makeMembers(1), membersLabel: 'Members' });

    expect(screen.getByRole('list', { name: 'Members' })).toBeTruthy();
  });

  it('src가 없는 멤버는 이미지 없이 배경 원만 그린다', () => {
    const { container } = renderTitle({ members: [{ name: '지예' }] });

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('src가 없는 멤버도 이름은 스크린 리더용 글자로 전달되고 사진이 있으면 중복하지 않는다', () => {
    renderTitle({ members: [{ name: '지예' }, { name: '경진', src: 'k.png' }] });

    expect(screen.getByText('지예').classList.contains('sr-only')).toBe(true);
    expect(screen.getByRole('img', { name: '경진' })).toBeTruthy();
    expect(screen.queryByText('경진')).toBeNull();
  });

  it('className과 div 속성이 줄에 합쳐진다', () => {
    const { container } = renderTitle({ className: 'mt-2', 'data-testid': 'row' } as never);

    expect((container.firstElementChild as HTMLElement).className).toContain('mt-2');
    expect(screen.getByTestId('row')).toBeTruthy();
  });
});
