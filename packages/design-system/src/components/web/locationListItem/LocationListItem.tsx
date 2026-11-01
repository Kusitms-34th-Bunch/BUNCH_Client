import type { ComponentProps } from 'react';
import { cn } from '../../../utils';

export type LocationListItemProps = Omit<ComponentProps<'span'>, 'children'> & {
  /** 장소 이름(예: "여의도한강공원") */
  placeName: string;
  /** 주소(예: "서울특별시 영등포구 여의동로 330") */
  address: string;
};

/**
 * 장소 목록의 한 줄(Figma `LocationListItem`): 장소 이름과 주소를 세로로 쌓고 아래에 구분선
 * `<button>`·`<a>` 안에 넣어도 유효하도록 `<span>`만 쓰고, 눌러서 고르는 동작은 호출하는 쪽이 감싸서 정하며 `className`은 줄에 적용
 */
export const LocationListItem = ({
  placeName,
  address,
  className,
  ...props
}: LocationListItemProps) => (
  <span
    className={cn(
      'bg-surface-primary border-border-tertiary p-s8 flex w-full flex-col items-start justify-center border-b text-left',
      className,
    )}
    {...props}
  >
    {/* Figma 15/22 SemiBold(자간 -0.25)에 맞는 typography 토큰이 없어 같은 15/22인 login-button에 SemiBold 굵기만 덮어씀 */}
    <span className="typography-login-button text-text-secondary w-full truncate font-(--semantic-font-weights-pretendard-1)">
      {placeName}
    </span>
    <span className="typography-body-4-regular text-text-quaternary w-full truncate">
      {address}
    </span>
  </span>
);
