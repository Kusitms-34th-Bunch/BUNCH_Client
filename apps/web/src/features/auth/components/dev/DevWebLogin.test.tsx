import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DevWebLogin } from './DevWebLogin';

const search = vi.hoisted(() => ({ value: '' }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(search.value) }));

describe('DevWebLogin', () => {
  beforeEach(() => {
    search.value = '';
  });

  it('개발 전용 웹 로그인 시작 링크를 보여 준다', () => {
    render(<DevWebLogin />);

    const link = screen.getByRole('link', { name: '카카오 웹 로그인 (개발용)' });
    expect(link.getAttribute('href')).toBe('/api/dev/kakao/authorize');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('코드 모양이 아닌 값(주소에 넣은 임의 문구)은 보이지 않는다', () => {
    search.value = `devLoginError=${encodeURIComponent('지금 이 링크로 로그인하세요 http://evil.test')}`;

    render(<DevWebLogin />);

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('실패 코드가 쿼리에 있으면 알려 준다', () => {
    search.value = 'devLoginError=KOE303';

    render(<DevWebLogin />);

    expect(screen.getByRole('alert').textContent).toBe('웹 로그인 실패: KOE303');
  });
});
