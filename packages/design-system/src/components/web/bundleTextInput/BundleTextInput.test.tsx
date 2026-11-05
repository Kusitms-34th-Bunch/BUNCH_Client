import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BundleTextInput } from './BundleTextInput';

describe('BundleTextInput', () => {
  it('제목이 입력창의 접근성 이름이다', () => {
    render(<BundleTextInput title="사진" />);
    const input = screen.getByRole('textbox', { name: '사진' });
    expect(input.tagName).toBe('INPUT');
    const titleId = input.getAttribute('aria-labelledby') ?? '';
    expect(document.getElementById(titleId)?.textContent).toBe('사진');
  });

  it('위치 핀 아이콘은 장식이고 icon={false}면 그리지 않는다', () => {
    const { container, rerender } = render(<BundleTextInput title="사진" />);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');

    rerender(<BundleTextInput title="사진" icon={false} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('멤버 아바타를 제목 줄에 그린다', () => {
    render(<BundleTextInput title="사진" members={[{ name: '김번치' }]} />);
    expect(screen.getByRole('list', { name: '멤버' })).toBeTruthy();
    expect(screen.getByText('김번치')).toBeTruthy();
  });

  it('값과 onChange를 input에 전달한다', () => {
    const onChange = vi.fn();
    render(<BundleTextInput title="사진" value="퇴근하고 달리는 사람들" onChange={onChange} />);
    const input = screen.getByRole<HTMLInputElement>('textbox');
    expect(input.value).toBe('퇴근하고 달리는 사람들');
    fireEvent.change(input, { target: { value: '새 이름' } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('오류 문구가 없으면 alert와 aria-invalid가 없다', () => {
    render(<BundleTextInput title="사진" />);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('textbox').getAttribute('aria-invalid')).toBeNull();
  });

  it('오류 문구가 있으면 alert로 보이고 입력창이 aria-invalid·describedby로 연결된다', () => {
    render(<BundleTextInput title="사진" errorMessage="입력 가능한 글자수를 초과했어요" />);
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('입력 가능한 글자수를 초과했어요');
    const input = screen.getByRole('textbox');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toContain(alert.id);
  });

  it('호출자의 aria-describedby를 오류 문구와 함께 유지한다', () => {
    render(<BundleTextInput title="사진" errorMessage="오류" aria-describedby="help" />);
    const describedBy = screen.getByRole('textbox').getAttribute('aria-describedby') ?? '';
    expect(describedBy.split(' ')).toContain('help');
    expect(describedBy.split(' ')).toHaveLength(2);
  });

  it('오류 문구 색과 글자 스타일은 system-fail-text caption이다', () => {
    render(<BundleTextInput title="사진" errorMessage="오류" />);
    const cls = screen.getByRole('alert').className;
    expect(cls).toContain('text-system-fail-text');
    expect(cls).toContain('typography-caption-1-medium');
  });

  it('required면 aria-required이고 필수 안내 글자는 이름에 섞이지 않는다', () => {
    render(<BundleTextInput title="사진" required />);
    const input = screen.getByRole('textbox', { name: '사진' });
    expect(input.getAttribute('aria-required')).toBe('true');
    expect(screen.getByText('필수')).toBeTruthy();
  });

  it('id를 주면 그 id를 입력창에 쓰고 제목·오류 id를 파생한다', () => {
    render(<BundleTextInput title="사진" id="bundle-name" errorMessage="오류" />);
    expect(screen.getByRole('textbox').id).toBe('bundle-name');
    expect(screen.getByRole('alert').id).toBe('bundle-name-error');
    expect(document.getElementById('bundle-name-title')?.textContent).toBe('사진');
  });

  it('부모 폭을 채우고 className은 바깥에 적용한다', () => {
    const { container } = render(<BundleTextInput title="사진" className="max-w-86" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('w-full');
    expect(root.className).toContain('max-w-86');
  });
});

describe('BundleTextInput TextField 옵션 전달', () => {
  it('onClear를 주면 지우기 버튼이 생기고 누르면 호출된다', () => {
    const onClear = vi.fn();
    render(<BundleTextInput title="사진" value="값" onChange={() => {}} onClear={onClear} />);
    fireEvent.click(screen.getByRole('button', { name: '입력 지우기' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('disabled를 입력창에 전달한다', () => {
    render(<BundleTextInput title="사진" disabled />);
    expect(screen.getByRole<HTMLInputElement>('textbox').disabled).toBe(true);
  });

  it('action 영역을 오른쪽에 둔다', () => {
    render(<BundleTextInput title="사진" action={<button type="button">저장</button>} />);
    expect(screen.getByRole('button', { name: '저장' })).toBeTruthy();
  });

  it('editing이면 입력창이 aria-busy가 된다', () => {
    render(<BundleTextInput title="사진" editing />);
    expect(screen.getByRole('textbox').getAttribute('aria-busy')).toBe('true');
  });
});
