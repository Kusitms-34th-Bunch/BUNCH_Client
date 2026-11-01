import { LineChevronDownIcon } from '../../../icons';
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
export const FollowButton = ({ status, children, ...props }: FollowButtonProps) => (
  <Button
    size="lg"
    // Figma 팔로잉·요청됨: 회색 바탕에 text-tertiary 글자
    variant={status === 'follow' ? 'primary' : 'secondarySubtle'}
    rightIcon={status === 'following' ? <LineChevronDownIcon size="lg" /> : undefined}
    {...props}
  >
    {/* 빈 글자면 접근성 이름이 비므로 기본 글자로 대체 */}
    {children === undefined || children === null || children === '' ? LABELS[status] : children}
  </Button>
);
