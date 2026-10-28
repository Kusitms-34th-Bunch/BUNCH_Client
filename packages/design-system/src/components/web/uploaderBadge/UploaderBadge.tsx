import type { ComponentProps } from 'react';
import { cn } from '../../../utils';

export type UploaderBadgeProps = Omit<ComponentProps<'span'>, 'children'> & {
  /** 사진을 올린 사람의 이름, 길면 한 줄 말줄임 */
  name: string;
  /** 프로필 사진 주소, 없으면 배경색 원만 표시 */
  avatarSrc?: string | undefined;
};

/**
 * 사진 위에 겹쳐 올린 사람을 알리는 반투명 알약(Figma `UploaderBadge`): 26px 프로필 사진과 이름
 * 사진 위의 위치와 이름·이미지 주소는 호출하는 쪽 담당, 사진은 이름 옆이라 장식(`alt=""`) 처리
 */
export const UploaderBadge = ({ name, avatarSrc, className, ...props }: UploaderBadgeProps) => (
  <span
    className={cn(
      // 64%는 토큰에 없어 투명도만 지정
      'bg-surface-primary/64 px-s4 py-s3 gap-s4 inline-flex max-w-full items-center rounded-full backdrop-blur-[4.7px]',
      className,
    )}
    {...props}
  >
    <span
      aria-hidden="true"
      className="bg-surface-brand-subtle-2 size-6.5 shrink-0 overflow-hidden rounded-full"
    >
      {avatarSrc ? <img src={avatarSrc} alt="" className="size-full object-cover" /> : null}
    </span>
    <span className="typography-body-2-regular text-text-primary min-w-0 truncate">{name}</span>
  </span>
);
