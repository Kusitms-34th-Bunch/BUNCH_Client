import type { ComponentProps } from 'react';
import { LineAlertIcon } from '../../../icons';
import { cn } from '../../../utils';

export type NotificationCardProps = Omit<
  ComponentProps<'button'>,
  'children' | 'type' | 'title' | 'disabled'
> & {
  /** 알림 제목(예: `[퇴근런클럽] 번치가 삭제됐어요`). 길면 줄바꿈 */
  title: string;
  /** 알림 내용 */
  description: string;
  /** 알림 시각 글자(예: `방금 전`). 형식은 호출자 담당 */
  time: string;
  /** 중요 알림: 제목 앞 경고 아이콘, 제목 빨간색 */
  important?: boolean | undefined;
  /** 읽지 않음: 시각 뒤 빨간 점 */
  unread?: boolean | undefined;
  /**
   * 흐리게 표시하고 누를 수 없음(초점은 받아 내용을 읽을 수 있음)
   * `onClick`만 막으므로 동작은 `onClick`에 연결
   */
  disabled?: boolean | undefined;
  /** 중요 알림일 때 읽는 숨은 글자(i18n). 빈 글자면 기본값 `중요` */
  importantLabel?: string | undefined;
  /** 읽지 않음일 때 읽는 숨은 글자(i18n). 빈 글자면 기본값 `읽지 않음` */
  unreadLabel?: string | undefined;
};

/**
 * 알림 카드(Figma `Alert_Label`): 제목·시각·읽지 않음 점, 아래 내용
 * 일반·중요 × 기본·눌림(overlay-pressed)·비활성(opacity-disabled 40%)
 */
export const NotificationCard = ({
  title,
  description,
  time,
  important = false,
  unread = false,
  disabled = false,
  importantLabel,
  unreadLabel,
  className,
  onClick,
  ...props
}: NotificationCardProps) => (
  // disabled 대신 aria-disabled: 비활성 알림도 초점 이동으로 내용 확인
  <button
    type="button"
    {...props}
    aria-disabled={disabled ? true : undefined}
    onClick={disabled ? undefined : onClick}
    className={cn(
      'bg-surface-primary rounded-r5 px-padding-p8 py-padding-p7 gap-s2 flex w-full touch-manipulation flex-col text-left',
      // 눌림은 바탕 layer로 겹쳐 글자는 그대로 유지
      'not-aria-disabled:cursor-pointer not-aria-disabled:active:bg-[linear-gradient(var(--color-overlay-pressed),var(--color-overlay-pressed))]',
      'aria-disabled:cursor-not-allowed aria-disabled:opacity-(--semantic-opacity-disabled)',
      'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:outline-offset-2',
      className,
    )}
  >
    {/* 제목이 여러 줄이어도 아이콘·시각은 첫 줄(22px) 가운데에 맞춤 */}
    <span className="gap-s4 flex w-full items-start justify-between">
      <span
        className={cn(
          'typography-body-2-medium gap-s1 flex min-w-0 items-start wrap-break-word break-keep',
          disabled
            ? 'text-text-disabled'
            : important
              ? 'text-system-fail-text'
              : 'text-text-primary',
        )}
      >
        {important ? (
          <>
            <LineAlertIcon className="text-system-fail-text my-px shrink-0" />
            <span className="sr-only">{importantLabel || '중요'}, </span>
          </>
        ) : null}
        <span className="min-w-0">{title}</span>
      </span>
      {/* 긴 시각 글자는 카드 절반까지만 차지하고 줄바꿈(제목 폭 확보) */}
      <span className="flex min-h-5.5 max-w-1/2 shrink-0 items-center">
        <span className="typography-caption-1-medium text-text-quaternary flex min-w-0 items-start">
          <span className="sr-only">, </span>
          <span className="min-w-0 text-right break-keep">{time}</span>
          {unread ? (
            <>
              <span
                aria-hidden="true"
                className="bg-system-fail-text size-1 shrink-0 rounded-full"
              />
              <span className="sr-only">, {unreadLabel || '읽지 않음'}</span>
            </>
          ) : null}
        </span>
      </span>
    </span>
    <span
      className={cn(
        'typography-body-4-regular wrap-break-word break-keep',
        disabled ? 'text-text-disabled' : 'text-text-tertiary',
      )}
    >
      <span className="sr-only">, </span>
      {description}
    </span>
  </button>
);
