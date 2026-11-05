import { beforeAll, describe, expect, it } from 'vitest';
import {
  findNonCanonical,
  fixSource,
  loadTailwindDesignSystem,
} from './check-tailwind-classes.mjs';

// Tailwind 업그레이드 시 __unstable__ API 판정 변화 감지용 대표 사례
let designSystem;
beforeAll(async () => {
  designSystem = await loadTailwindDesignSystem();
}, 60_000);

// 첫 판정의 캐시 준비가 병렬 테스트 부하에서 5초를 넘기는 경우 대비
describe('check-tailwind-classes', { timeout: 60_000 }, () => {
  it('편집기 suggestCanonicalClasses와 같은 표준형을 제안한다', () => {
    const source = [
      `const a = 'w-[343px] h-[7px] duration-[340ms]';`,
      `const b = "max-w-[var(--app-max-width,100%)] [overflow-wrap:break-word]";`,
    ].join('\n');

    expect(findNonCanonical(source, designSystem)).toEqual([
      { line: 1, from: 'w-[343px]', to: 'w-85.75' },
      { line: 1, from: 'h-[7px]', to: 'h-1.75' },
      { line: 1, from: 'duration-[340ms]', to: 'duration-340' },
      { line: 2, from: 'max-w-[var(--app-max-width,100%)]', to: 'max-w-(--app-max-width,100%)' },
      { line: 2, from: '[overflow-wrap:break-word]', to: 'wrap-break-word' },
    ]);
  });

  it('표준형·디자인 토큰 클래스·일반 문자열은 건드리지 않는다', () => {
    const source = `const a = 'px-padding-p8 typography-body-1-medium size-[9.6px] 퇴근런클럽 hello';`;

    expect(findNonCanonical(source, designSystem)).toEqual([]);
  });

  it('템플릿의 ${…} 부분은 검사하지 않는다', () => {
    const source = 'const a = `w-[343px] ${isOpen ? "x" : "y"}`;';

    expect(findNonCanonical(source, designSystem)).toEqual([
      { line: 1, from: 'w-[343px]', to: 'w-85.75' },
    ]);
  });

  it('같은 토큰만 바꾸고 접두어가 붙은 다른 클래스는 그대로 둔다', () => {
    const source = `const a = 'w-[343px] min-w-[343px]';`;
    const issues = findNonCanonical(source, designSystem);

    expect(fixSource(source, issues)).toBe(`const a = 'w-85.75 min-w-85.75';`);
  });
});
