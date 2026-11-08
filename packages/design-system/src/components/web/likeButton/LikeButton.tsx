import { useState, type ComponentProps, type MouseEvent } from 'react';
import { FillHeartLargeIcon, LineHeartLargeIcon } from '../../../icons';
import { cn } from '../../../utils';
import likeMotion from './likeMotion.module.css';

export type LikeButtonProps = Omit<
  ComponentProps<'button'>,
  'children' | 'type' | 'aria-pressed'
> & {
  /** 현재 번치가 좋아요한 상태 */
  liked: boolean;
  /** 좋아요 수 */
  count: number;
  /** 화면 낭독용 이름. 기본값 「좋아요」 */
  label?: string | undefined;
};

/**
 * 좋아요 버튼(Figma `Like Item`): 하트와 수. 누르면 하트가 작아졌다 커지는 모션(동작 줄이기 설정이면 생략)
 * 상태 전환과 수 계산은 호출자 담당(`onClick`에서 `liked`·`count`를 바꿈)
 */
export const LikeButton = ({
  liked,
  count,
  label = '좋아요',
  onClick,
  className,
  ...props
}: LikeButtonProps) => {
  // 누를 때마다 값을 올려 하트를 새로 그림(연타에도 처음부터 재생, 처음 그릴 때는 0이라 재생 안 함)
  const [bounceKey, setBounceKey] = useState(0);
  const Heart = liked ? FillHeartLargeIcon : LineHeartLargeIcon;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    setBounceKey((key) => key + 1);
    onClick?.(event);
  };

  return (
    <button
      type="button"
      aria-pressed={liked}
      onClick={handleClick}
      className={cn(
        'gap-s1 typography-body-3-regular text-text-tertiary focus-visible:outline-border-brand rounded-r2 relative inline-flex shrink-0 cursor-pointer touch-manipulation items-center focus-visible:outline-2',
        // 아이콘 24px, 누르는 영역은 위아래 10px 넓혀 44px
        'before:absolute before:-inset-x-1 before:-inset-y-2.5',
        className,
      )}
      {...props}
    >
      <span className="sr-only">{label}</span>
      <Heart
        key={bounceKey}
        aria-hidden
        className={cn(
          liked ? 'text-icon-warning' : 'text-icon-secondary',
          bounceKey > 0 && likeMotion.bounce,
        )}
      />
      <span>{count}</span>
    </button>
  );
};
