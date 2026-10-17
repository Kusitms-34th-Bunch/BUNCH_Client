import type { ComponentProps } from 'react';
import { FillCircleCheckIcon } from '../../icons';
import { tv } from '../../utils';
import { Button } from '../button';

// 배경: Figma의 surface-inversed-alpha-60 토큰이 아직 tokens.json에 없어 surface-inversed에 투명도 60%를 적용(Toast.spec.md)
const toastStyle = tv({
  slots: {
    base: 'flex w-fit max-w-full items-center gap-s5 rounded-r6 bg-surface-inversed/60 py-padding-p4 pr-padding-p4 pl-padding-p6 text-text-inversed backdrop-blur-[2px]',
    icon: 'inline-flex size-6 shrink-0 items-center justify-center text-system-success-fg [&>svg]:size-full',
    // 내용 줄 높이 30px: Figma가 글자만 있는 형태에서도 고정한 값(토큰 없음)
    content: 'flex min-h-[30px] min-w-0 flex-1 items-center gap-s8',
    message: 'typography-body-2-regular min-w-0 flex-1 wrap-break-word',
  },
});

export type ToastIcon = 'success';

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 화면에 보이고 스크린 리더가 읽는 메시지 */
  children: string;
  /** 글자 앞 장식 아이콘(접근성 이름 제외) */
  icon?: ToastIcon | undefined;
  /** 오른쪽 액션 버튼 */
  action?: ToastAction | undefined;
};

/** 모양만 그린다. 알림 동작(자동 닫힘·큐)은 `toast()`와 `<Toaster />`가 맡는다. */
export const Toast = ({ icon, action, className, children, ...props }: ToastProps) => {
  const { base, icon: iconSlot, content, message } = toastStyle();

  return (
    <div className={base({ className })} {...props}>
      {icon === 'success' ? (
        <span aria-hidden="true" className={iconSlot()}>
          <FillCircleCheckIcon size="lg" />
        </span>
      ) : null}
      <div className={content()}>
        <p className={message()}>{children}</p>
        {action ? (
          <Button variant="secondary" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        ) : null}
      </div>
    </div>
  );
};
