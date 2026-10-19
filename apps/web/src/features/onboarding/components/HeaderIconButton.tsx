import type { ReactNode } from 'react';

type HeaderIconButtonProps = {
  /** 접근성 이름(아이콘만 있어서 필수) */
  label: string;
  /** 24px 아이콘. 장식용이며 버튼 이름으로 대체 */
  children: ReactNode;
  /** 동작 미연결 시 생략 */
  onClick?: (() => void) | undefined;
};

/** 40px 터치 영역을 유지하면서 아이콘을 왼쪽 16px에 정렬 */
export function HeaderIconButton({ label, children, onClick }: HeaderIconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="text-icon-primary focus-visible:outline-border-brand -ml-s4 size-s16 flex cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {children}
    </button>
  );
}
