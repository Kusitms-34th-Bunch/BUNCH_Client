import { LineChevronDownIcon } from '../../../icons';
import { cn } from '../../../utils';
import { Button, type ButtonProps } from '../../core/button';

export type FollowButtonStatus = 'follow' | 'following' | 'requested';

export type FollowButtonProps = Omit<
  ButtonProps,
  'variant' | 'size' | 'leftIcon' | 'rightIcon' | 'children'
> & {
  status: FollowButtonStatus;
  /** 글자 바꾸기. 기본값은 상태별 `팔로우`·`팔로잉`·`팔로우 요청됨` */
  children?: ButtonProps['children'] | undefined;
};

const LABELS = { follow: '팔로우', following: '팔로잉', requested: '팔로우 요청됨' } as const;

/**
 * 팔로우 버튼(Figma `Follow Button`): 팔로우 → 팔로잉(아래 화살표) → 팔로우 요청됨
 * 누를 때의 동작(팔로우·언팔로우 메뉴·요청 취소)과 폭은 호출자 담당
 */
export const FollowButton = ({ status, children, className, ...props }: FollowButtonProps) => (
  <Button
    size="lg"
    variant={status === 'follow' ? 'primary' : 'secondary'}
    rightIcon={status === 'following' ? <LineChevronDownIcon size="lg" /> : undefined}
    // Figma 팔로잉·요청됨 글자는 text-tertiary(Button secondary 기본은 text-primary)
    className={cn(status !== 'follow' && 'text-text-tertiary', className)}
    {...props}
  >
    {children ?? LABELS[status]}
  </Button>
);
