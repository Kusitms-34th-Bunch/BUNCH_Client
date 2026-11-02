import { cn } from '@app/design-system';

/**
 * 크게 보기 화면의 헤더가 서서히 숨는 모양(Figma 사진 상세: 200ms, 0, 0, 0.35, 1)
 * 숨긴 상태에서도 키보드·스크린 리더로 접근할 수 있게 포커스가 들어오면 다시 보임
 */
export const getViewerHeaderClass = (chromeHidden: boolean) =>
  cn(
    'relative transition-opacity duration-200 ease-[cubic-bezier(0,0,0.35,1)] motion-reduce:transition-none',
    chromeHidden
      ? 'pointer-events-none opacity-0 focus-within:pointer-events-auto focus-within:opacity-100'
      : 'opacity-100',
  );
