import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BundleCommentCard, type BundleCommentCardProps } from './BundleCommentCard';

const renderCard = (props?: Partial<BundleCommentCardProps>) =>
  render(<BundleCommentCard userName="지예" {...props} />);

describe('BundleCommentCard', () => {
  it('이름을 보여 주고 입력창 이름은 "{이름} 코멘트"다', () => {
    renderCard();

    expect(screen.getByText('지예')).toBeTruthy();
    expect(screen.getByRole('textbox', { name: '지예 코멘트' })).toBeTruthy();
  });

  it('label로 입력창 이름을 바꾼다', () => {
    renderCard({ label: 'Comment' });

    expect(screen.getByRole('textbox', { name: 'Comment' })).toBeTruthy();
  });

  it('currentUser면 이름 뒤에 "(나)"가 붙고 currentUserLabel로 바꿀 수 있다', () => {
    const { rerender } = renderCard();

    expect(screen.queryByText('(나)')).toBeNull();

    rerender(<BundleCommentCard userName="지예" currentUser />);

    expect(screen.getByText('(나)')).toBeTruthy();

    rerender(<BundleCommentCard userName="지예" currentUser currentUserLabel="(me)" />);

    expect(screen.getByText('(me)')).toBeTruthy();
  });

  it('안내 문구 기본값이 있고 placeholder로 바꿀 수 있다', () => {
    const { rerender } = renderCard();

    expect(screen.getByPlaceholderText('코멘트를 남기면 번들을 발행할 수 있어요.')).toBeTruthy();

    rerender(<BundleCommentCard userName="지예" placeholder="Leave a comment" />);

    expect(screen.getByPlaceholderText('Leave a comment')).toBeTruthy();
  });

  it('프로필은 24px 원에 테두리가 있고 src가 있으면 사진을 그린다', () => {
    const { container } = renderCard({ profileSrc: 'avatar.png' });
    const profile = container.querySelector('img')?.parentElement as HTMLElement;

    expect(profile.classList.contains('size-6')).toBe(true);
    expect(profile.classList.contains('size-22.5')).toBe(false);
    expect(profile.classList.contains('border-border-tertiary')).toBe(true);
    expect(container.querySelector('img')?.getAttribute('src')).toBe('avatar.png');
  });

  it('카드는 흰 배경에 border-tertiary 1px, 반경 r5, 여백 14px이고 포커스 시 강한 테두리다', () => {
    const { container } = renderCard();
    const card = container.querySelector('textarea')?.parentElement?.parentElement as HTMLElement;

    expect(card.classList.contains('bg-surface-primary')).toBe(true);
    expect(card.classList.contains('border')).toBe(true);
    expect(card.classList.contains('border-border-tertiary')).toBe(true);
    expect(card.classList.contains('rounded-r5')).toBe(true);
    expect(card.classList.contains('px-padding-p7')).toBe(true);
    expect(card.classList.contains('py-s7')).toBe(true);
    expect(card.classList.contains('focus-within:border-primitive-gray-700')).toBe(true);
  });

  it('입력창은 14/21 Regular이고 안내 문구는 흐린 SemiBold, 포커스 시 안내 문구를 숨긴다', () => {
    renderCard();
    const { classList } = screen.getByRole('textbox');

    expect(classList.contains('typography-body-3-regular')).toBe(true);
    expect(classList.contains('text-text-secondary')).toBe(true);
    expect(classList.contains('placeholder:text-text-quinary')).toBe(true);
    expect(classList.contains('focus:placeholder:text-transparent')).toBe(true);
    expect(classList.contains('resize-none')).toBe(true);
  });

  it('입력하면 onChange를 부른다', () => {
    let changed = '';
    renderCard({ onChange: (event) => (changed = event.target.value) });

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '좋아요' } });

    expect(changed).toBe('좋아요');
  });

  it('error가 없으면 오류 안내와 aria-invalid가 없다', () => {
    renderCard();
    const input = screen.getByRole('textbox');

    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(input.hasAttribute('aria-describedby')).toBe(false);
  });

  it('error를 주면 카드 아래에 빨간 안내가 보이고 입력창이 잘못된 값으로 표시된다', () => {
    renderCard({ error: '입력 가능한 글자수를 초과했어요' });
    const input = screen.getByRole('textbox');
    const visible = document.getElementById(input.getAttribute('aria-describedby') ?? '');

    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(visible?.textContent).toBe('입력 가능한 글자수를 초과했어요');
    expect(visible?.classList.contains('text-system-fail-text')).toBe(true);
    expect(visible?.classList.contains('typography-caption-1-medium')).toBe(true);
    expect(visible?.classList.contains('h-5.5')).toBe(true);
  });

  it('오류 문구는 status 영역에서 한 번만 읽힌다', () => {
    const { rerender } = renderCard();

    expect(screen.getByRole('status').textContent).toBe('');

    rerender(<BundleCommentCard userName="지예" error="입력 가능한 글자수를 초과했어요" />);

    expect(screen.getByRole('status').textContent).toBe('입력 가능한 글자수를 초과했어요');
    expect(
      document
        .getElementById(screen.getByRole('textbox').getAttribute('aria-describedby') ?? '')
        ?.getAttribute('aria-hidden'),
    ).toBe('true');
  });

  it('editing이면 점 3개 애니메이션을 그리고 입력창은 숨겨서 남긴다', () => {
    const { container } = renderCard({ editing: true, editingLabel: '지예님이 작성 중' });

    // 입력창이 사라지면 uncontrolled 값이 유실되므로 숨김 클래스로만 가림
    expect(screen.getByRole('textbox').parentElement?.classList.contains('hidden')).toBe(true);
    expect(screen.getByRole('img', { name: '지예님이 작성 중' })).toBeTruthy();
    expect(container.querySelectorAll('[role="img"] > span')).toHaveLength(3);
  });

  it('editing이어도 editingLabel이 없으면 애니메이션은 장식으로 숨겨진다', () => {
    const { container } = renderCard({ editing: true });

    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('[aria-hidden="true"]:not(svg)')).toBeTruthy();
  });

  it('editing이 아니면 입력창이 숨겨지지 않고 애니메이션이 없다', () => {
    const { container } = renderCard();

    expect(screen.getByRole('textbox').parentElement?.classList.contains('hidden')).toBe(false);
    expect(container.querySelector('[class*="root"]')).toBeNull();
  });

  it('defaultValue만 쓰는 입력은 입력할 때마다 내용 높이에 맞춘다', () => {
    renderCard({ defaultValue: '초안' });
    const input = screen.getByRole<HTMLTextAreaElement>('textbox');
    let contentHeight = 25;
    Object.defineProperty(input, 'scrollHeight', { configurable: true, get: () => contentHeight });

    contentHeight = 46;
    fireEvent.input(input, { target: { value: '두 줄이 되는 긴 코멘트' } });

    expect(input.style.height).toBe('46px');
  });

  it('value로 제어하는 입력은 input 이벤트가 아니라 value 변경으로 높이를 맞춘다', () => {
    const { rerender } = render(
      <BundleCommentCard userName="지예" value="초안" onChange={() => {}} />,
    );
    const input = screen.getByRole<HTMLTextAreaElement>('textbox');
    let contentHeight = 25;
    Object.defineProperty(input, 'scrollHeight', { configurable: true, get: () => contentHeight });

    contentHeight = 46;
    fireEvent.input(input);

    expect(input.style.height).not.toBe('46px');

    rerender(
      <BundleCommentCard userName="지예" value="두 줄이 되는 긴 코멘트" onChange={() => {}} />,
    );

    expect(input.style.height).toBe('46px');
  });

  it('editing을 켰다 꺼도 defaultValue로 입력한 값이 유지된다', () => {
    const { rerender } = render(<BundleCommentCard userName="지예" defaultValue="초안" />);
    const input = screen.getByRole<HTMLTextAreaElement>('textbox');

    fireEvent.change(input, { target: { value: '수정한 코멘트' } });
    rerender(<BundleCommentCard userName="지예" editing defaultValue="초안" />);
    rerender(<BundleCommentCard userName="지예" defaultValue="초안" />);

    expect(screen.getByRole<HTMLTextAreaElement>('textbox').value).toBe('수정한 코멘트');
  });

  it('currentUser면 입력창 접근성 이름에 "(나)"가 들어간다', () => {
    renderCard({ currentUser: true });

    expect(screen.getByRole('textbox', { name: '지예 (나) 코멘트' })).toBeTruthy();
  });

  it('className은 바깥 요소에 적용된다', () => {
    const { container } = renderCard({ className: 'mt-2' });

    expect((container.firstElementChild as HTMLElement).className).toContain('mt-2');
    expect(screen.getByRole('textbox').className).not.toContain('mt-2');
  });

  it('id를 주면 입력창 id로 쓰고 오류 안내 id가 파생된다', () => {
    renderCard({ id: 'comment', error: '오류' });

    expect(screen.getByRole('textbox').getAttribute('id')).toBe('comment');
    expect(screen.getByRole('textbox').getAttribute('aria-describedby')).toBe('comment-error');
  });
});
