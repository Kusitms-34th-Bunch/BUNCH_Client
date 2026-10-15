import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';
import { createTV } from 'tailwind-variants';

// 기본 scale 밖 이름(h-s18, rounded-r4)의 충돌 미인식 — className 덮어쓰기 실패 방지용 등록
// 목록은 tokens.css와 동기화(tailwind.test.ts가 누락 검증)
const spacing = [
  ...Array.from({ length: 18 }, (_, index) => `padding-p${index + 1}`),
  ...Array.from({ length: 25 }, (_, index) => `s${index + 1}`),
];
const radius = ['full', ...Array.from({ length: 10 }, (_, index) => `r${index + 1}`)];
const shadow = ['navi-bar'];
const typography = [
  'body-1-medium',
  'body-1-regular',
  'body-1-semi-bold',
  'body-2-meduim',
  'body-2-regular',
  'body-3-regular',
  'body-3-semi-bold',
  'caption-1-medium',
  'caption-1-regular',
  'heading-1-medium',
  'heading-1-semibold',
  'heading-2-medium',
  'heading-2-semibold',
  'label-l',
  'label-m',
  'label-s',
  'login-button',
  'title-1-bold',
  'title-1-semi-bold',
];

const twMergeConfig = {
  extend: {
    theme: { spacing, radius, shadow },
    classGroups: { typography: [{ typography }] },
  },
};

const twMerge = extendTailwindMerge<'typography'>(twMergeConfig);

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/** 변형 선언. cn과 같은 병합 설정 사용 */
export const tv = createTV({ twMergeConfig });
