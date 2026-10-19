import type { ReactNode } from 'react';

type HeaderIconButtonProps = {
  /** 접근성 이름(아이콘만 있어서 필수) */
  label: string;
  /** 24px 아이콘. 장식이라 접근성에서는 버튼 이름이 대신한다 */
  children: ReactNode;
  /** 없으면 눌러도 동작이 없다(연결 전) */
  onClick?: (() => void) | undefined;
};

/** 헤더 왼쪽에 놓는 24px 아이콘 버튼. 터치 영역 40px이며 아이콘이 왼쪽 16px에 오도록 8px 당겨 둠 */
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
