import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SelectionField, type SelectionFieldProps } from './SelectionField';

const renderField = (props?: Partial<SelectionFieldProps>) =>
  render(<SelectionField label="위치 추가" {...props} />);

describe('SelectionField', () => {
  it('제목 글자를 이름으로 갖는 버튼이고 type은 button이다', () => {
    renderField();
    const button = screen.getByRole('button', { name: '위치 추가' });

    expect(button.getAttribute('type')).toBe('button');
  });

  it('누르면 onFieldClick을 부른다', () => {
    const onFieldClick = vi.fn();
    renderField({ onFieldClick });

    fireEvent.click(screen.getByRole('button', { name: '위치 추가' }));

    expect(onFieldClick).toHaveBeenCalledTimes(1);
  });

  it('카드는 secondary 배경에 테두리 없이 반경 r5다', () => {
    const { container } = renderField();
    const { classList } = container.firstElementChild as HTMLElement;

    expect(classList.contains('bg-surface-secondary')).toBe(true);
    expect(classList.contains('bg-surface-primary')).toBe(false);
    expect(classList.contains('border')).toBe(false);
    expect(classList.contains('rounded-r5')).toBe(true);
    expect(classList.contains('py-s5')).toBe(true);
  });

  it('제목은 Regular 14/21 토큰이고 아이콘은 모두 숨겨진다', () => {
    const { container } = renderField();

    expect(screen.getByText('위치 추가').classList.contains('typography-body-3-regular')).toBe(
      true,
    );
    for (const svg of container.querySelectorAll('svg')) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    }
    expect(container.querySelectorAll('svg')).toHaveLength(2);
  });

  it('required가 아니면 별표가 없고 required면 별표는 숨기고 필수를 읽어 준다', () => {
    const { rerender } = renderField();

    expect(screen.queryByText('*')).toBeNull();

    rerender(<SelectionField label="위치 추가" required />);

    expect(screen.getByText('*').getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByRole('button', { name: '위치 추가 필수' })).toBeTruthy();
  });

  it('fieldLabel을 주면 화면에는 안 보이고 버튼 이름 앞에 붙어 어떤 필드인지 알려 준다', () => {
    renderField({
      fieldLabel: '위치',
      label: '서울특별시 여의도동',
      selected: true,
      required: true,
    });

    expect(screen.getByRole('button', { name: '위치: 서울특별시 여의도동 필수' })).toBeTruthy();
    expect(screen.getByText('위치:', { exact: false }).classList.contains('sr-only')).toBe(true);
  });

  it('fieldLabel이 없으면 이름에 아무것도 붙지 않는다', () => {
    renderField({ label: '위치 추가' });

    expect(screen.getByRole('button', { name: '위치 추가' })).toBeTruthy();
  });

  it('requiredLabel로 읽어 주는 글자를 바꾼다', () => {
    renderField({ required: true, requiredLabel: 'required' });

    expect(screen.getByRole('button', { name: '위치 추가 required' })).toBeTruthy();
  });

  it('선택 전에는 지우기 버튼이 없다', () => {
    renderField();

    expect(screen.queryByRole('button', { name: /지우기/ })).toBeNull();
  });

  it('selected면 지우기 버튼이 생기고 "{label} 지우기" 이름으로 onClear를 부른다', () => {
    const onClear = vi.fn();
    const onFieldClick = vi.fn();
    renderField({ label: '서울특별시 여의도동', selected: true, onClear, onFieldClick });
    const clear = screen.getByRole('button', { name: '서울특별시 여의도동 지우기' });

    fireEvent.click(clear);

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onFieldClick).not.toHaveBeenCalled();
  });

  it('clearLabel로 지우기 버튼 이름을 바꾼다', () => {
    renderField({ selected: true, clearLabel: 'Clear location' });

    expect(screen.getByRole('button', { name: 'Clear location' })).toBeTruthy();
  });

  it('지우기 버튼은 16px 아이콘에 32px 터치 영역을 가진다', () => {
    renderField({ selected: true });
    const { classList } = screen.getByRole('button', { name: /지우기/ });

    expect(classList.contains('size-4')).toBe(true);
    expect(classList.contains('before:-inset-2')).toBe(true);
    expect(classList.contains('z-10')).toBe(true);
  });

  it('suggestions가 없거나 비어 있으면 추천 목록이 없다', () => {
    const { rerender } = renderField();

    expect(screen.queryByRole('list')).toBeNull();

    rerender(<SelectionField label="위치 추가" suggestions={[]} />);

    expect(screen.queryByRole('list')).toBeNull();
  });

  it('suggestions를 주면 추천 목록이 칩 버튼으로 나오고 카드가 세로 배치(py-s8)로 바뀐다', () => {
    const { container } = renderField({ suggestions: ['서울특별시', '여의도동'] });
    const list = screen.getByRole('list', { name: '추천' });

    expect(list.querySelectorAll('li')).toHaveLength(2);
    expect(screen.getByRole('button', { name: '서울특별시' })).toBeTruthy();
    const { classList } = container.firstElementChild as HTMLElement;

    expect(classList.contains('py-s8')).toBe(true);
    expect(classList.contains('flex-col')).toBe(true);
  });

  it('추천 칩은 36px 높이의 흰 배경 원형이고 누르면 그 값으로 onSuggestionClick을 부른다', () => {
    const onSuggestionClick = vi.fn();
    const onFieldClick = vi.fn();
    renderField({ suggestions: ['서울특별시'], onSuggestionClick, onFieldClick });
    const chip = screen.getByRole('button', { name: '서울특별시' });

    expect(chip.classList.contains('h-9')).toBe(true);
    expect(chip.classList.contains('bg-surface-primary')).toBe(true);
    expect(chip.classList.contains('bg-surface-secondary')).toBe(false);
    expect(chip.classList.contains('rounded-full')).toBe(true);

    fireEvent.click(chip);

    expect(onSuggestionClick).toHaveBeenCalledWith('서울특별시');
    expect(onFieldClick).not.toHaveBeenCalled();
  });

  it('추천 목록의 빈 영역은 클릭을 통과시키되 칩은 눌린다', () => {
    renderField({ suggestions: ['서울특별시'] });
    const list = screen.getByRole('list', { name: '추천' });

    expect(list.classList.contains('pointer-events-none')).toBe(true);
    expect(
      screen.getByRole('button', { name: '서울특별시' }).classList.contains('pointer-events-auto'),
    ).toBe(true);
  });

  it('추천 목록 이름을 바꿀 수 있다', () => {
    renderField({ suggestions: ['a'], suggestionsLabel: 'Suggestions' });

    expect(screen.getByRole('list', { name: 'Suggestions' })).toBeTruthy();
  });

  it('selected이면 suggestions가 있어도 추천 목록을 그리지 않는다', () => {
    renderField({ selected: true, suggestions: ['서울특별시'] });

    expect(screen.queryByRole('list')).toBeNull();
  });

  it('className과 div 속성이 카드에 합쳐진다', () => {
    const { container } = renderField({ className: 'mt-2', 'data-testid': 'field' } as never);

    expect((container.firstElementChild as HTMLElement).className).toContain('mt-2');
    expect(screen.getByTestId('field')).toBeTruthy();
  });

  it('필드 버튼은 내용이 없는 빈 버튼이고 aria-labelledby가 BundleTitle을 가리킨다', () => {
    renderField({ fieldLabel: '위치', required: true });
    const button = screen.getByRole('button', { name: '위치: 위치 추가 필수' });

    expect(button.textContent).toBe('');
    const ids = (button.getAttribute('aria-labelledby') ?? '').split(' ');
    expect(ids).toHaveLength(2);
    expect(document.getElementById(ids[1] ?? '')?.textContent).toContain('위치 추가');
  });

  it('필드 버튼 안에는 다른 요소가 없다(버튼 안 div·p 금지)', () => {
    const { container } = renderField({ suggestions: ['서울'] });
    const field = container.querySelector('button[aria-labelledby]') as HTMLElement;

    expect(field.children).toHaveLength(0);
  });

  it('추천 칩은 ChipButton M이고 aria-pressed가 없다', () => {
    renderField({ suggestions: ['서울특별시'] });
    const chip = screen.getByRole('button', { name: '서울특별시' });

    expect(chip.classList.contains('h-9')).toBe(true);
    expect(chip.hasAttribute('aria-pressed')).toBe(false);
  });

  it('제목 줄 높이는 Figma 24px(h-6)로 맞춘다', () => {
    const { container } = renderField();

    expect(container.querySelector('[id$="-title"]')?.classList.contains('h-6')).toBe(true);
  });
});
