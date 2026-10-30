import type { ReactNode } from 'react';

/**
 * 시트 스토리 전용 배경 화면(Figma처럼 앱 화면 위로 올라오는 모습 확인용)
 * 앱 화면은 DS가 알 수 없어 문구 없는 회색 자리표시로 대체, 열기 버튼 등은 children으로 상단 배치
 */
export const SheetStoryScreen = ({ children }: { children: ReactNode }) => (
  <div className="bg-surface-primary flex min-h-dvh flex-col">
    <div aria-hidden className="px-padding-p8 gap-s3 flex h-14 items-center">
      <div className="bg-surface-tertiary size-7 rounded-full" />
      <div className="bg-surface-tertiary h-4 w-20 rounded-full" />
    </div>
    <div className="px-padding-p8 gap-s4 flex flex-col items-start">{children}</div>
    <div aria-hidden className="gap-s3 px-padding-p8 mt-s8 flex">
      <div className="bg-surface-tertiary h-9 w-14 rounded-full" />
      <div className="bg-surface-tertiary h-9 w-16 rounded-full" />
      <div className="bg-surface-tertiary h-9 w-16 rounded-full" />
      <div className="bg-surface-tertiary h-9 w-16 rounded-full" />
    </div>
    <div aria-hidden className="bg-surface-secondary rounded-r6 mx-padding-p8 mt-s8 h-18" />
    <div aria-hidden className="bg-surface-tertiary mx-padding-p8 mt-s10 h-4 w-28 rounded-full" />
    <div aria-hidden className="mt-s4 grid grid-cols-3 gap-0.5">
      {Array.from({ length: 12 }, (_, index) => (
        <div key={index} className="bg-surface-tertiary aspect-square" />
      ))}
    </div>
  </div>
);
