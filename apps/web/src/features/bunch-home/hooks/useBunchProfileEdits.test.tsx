import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useBunchHome } from './useBunchHome';
import { useBunchProfileEdits } from './useBunchProfileEdits';

beforeEach(() => sessionStorage.clear());

describe('useBunchProfileEdits', () => {
  it('저장한 프로필이 번치 홈의 지금 번치와 전환 목록에 반영된다', () => {
    const { result: edits } = renderHook(() => useBunchProfileEdits());
    const { result: home } = renderHook(() => useBunchHome());

    act(() =>
      edits.current[1]('bunch-trip', {
        name: '여행가조2',
        description: '새 소개',
        isPrivate: true,
        imageSrc: undefined,
      }),
    );

    expect(home.current.data.current).toMatchObject({
      name: '여행가조2',
      description: '새 소개',
      isPrivate: true,
    });
    expect(home.current.data.bunches[0]?.name).toBe('여행가조2');
  });
});
