import type { ComponentProps, ReactNode } from 'react';
import { LineDotsIcon } from '../../../icons';
import { cn } from '../../../utils';
import { ProfileImage } from '../profileImage';
import { RoleBadge, type RoleBadgeRole } from '../roleBadge';

export type ProfileListItemProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 이름(긴 이름은 한 줄 말줄임) */
  name: string;
  /** 이름 뒤 덧붙임(예: `(나)`), 말줄임 대상 아님 */
  suffix?: string | undefined;
  /** 프로필 이미지 주소. 없으면 기본 배경색 원, 이미지는 장식 */
  imageSrc?: string | undefined;
  /** 이미지 오른쪽 아래 역할 배지 */
  memberRole?: RoleBadgeRole | undefined;
  /** 역할 배지를 읽을 이름(예: `번치장`). 없으면 장식 */
  roleLabel?: string | undefined;
  /** 더보기 버튼 클릭. 있으면 오른쪽에 점 아이콘 버튼 표시 */
  onMore?: (() => void) | undefined;
  /** 더보기 버튼 접근성 이름. 기본값 `<이름> 더보기` */
  moreLabel?: string | undefined;
  /** 오른쪽 동작(차단해제 버튼·추가하기 칩 등). 있으면 더보기 대신 표시 */
  action?: ReactNode;
  /** 행 흐림, 더보기 비활성, `action` 슬롯 inert 처리 */
  disabled?: boolean | undefined;
};

/**
 * 사람 한 명의 목록 행(Figma `Profile List- 01`·`Profile List - Button`): 프로필 이미지·이름·오른쪽 동작
 * 행 자체는 누를 수 없고 오른쪽 동작만 누름. 목록 의미(`ul`·`li`)는 호출자 담당
 */
export const ProfileListItem = ({
  name,
  suffix,
  imageSrc,
  memberRole,
  roleLabel,
  onMore,
  moreLabel,
  action,
  disabled,
  className,
  ...props
}: ProfileListItemProps) => (
  <div
    {...props}
    className={cn(
      'bg-surface-primary border-border-tertiary rounded-r5 px-padding-p6 py-padding-p5 gap-s4 flex items-center justify-between border',
      disabled && 'opacity-(--semantic-opacity-disabled)',
      className,
    )}
  >
    <div className="gap-s3 flex min-w-0 items-center">
      <div className="flex shrink-0 items-end">
        <ProfileImage src={imageSrc} className="border-border-tertiary size-10 border" />
        {/* Figma: 배지 16px가 이미지와 12px 겹침, relative 이미지 위에 오도록 relative 지정 */}
        {memberRole ? (
          <RoleBadge
            memberRole={memberRole}
            {...(roleLabel ? { label: roleLabel } : {})}
            className="relative -ml-3 shrink-0"
          />
        ) : null}
      </div>
      <p className="typography-body-1-medium text-text-primary flex min-w-0">
        <span title={name} className="truncate">
          {name}
        </span>
        {suffix ? <span className="shrink-0">{suffix}</span> : null}
      </p>
    </div>
    {action ? (
      // 흐린 행의 동작이 눌리지 않게 비활성 시 inert 처리
      <div inert={disabled} className="flex shrink-0">
        {action}
      </div>
    ) : onMore ? (
      // 아이콘 20px·누르는 영역 40px, 음수 margin으로 Figma 배치 유지
      <button
        type="button"
        aria-label={moreLabel ?? `${name} 더보기`}
        disabled={disabled}
        onClick={onMore}
        className={cn(
          'text-icon-quaternary -m-s5 p-s5 relative inline-flex shrink-0 cursor-pointer touch-manipulation rounded-full',
          'before:bg-overlay-pressed before:inset-s5 before:absolute before:rounded-full before:opacity-0',
          'before:transition-opacity before:duration-75 before:ease-out motion-reduce:before:transition-none',
          'not-disabled:active:before:opacity-100 disabled:cursor-not-allowed',
          'focus-visible:outline-border-brand focus-visible:outline-2',
        )}
      >
        <LineDotsIcon size="md" aria-hidden />
      </button>
    ) : null}
  </div>
);
