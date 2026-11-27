import type { ComponentProps } from 'react';
import { cn } from '../../../utils';
import { Radio } from '../../core/radio';
import { ProfileImage } from '../profileImage';
import { RoleBadge, type RoleBadgeRole } from '../roleBadge';

export type ProfileRadioCardProps = Omit<ComponentProps<'input'>, 'type' | 'children'> & {
  /** 멤버 이름(라디오 접근성 이름, 긴 이름은 한 줄 말줄임) */
  label: string;
  /** 프로필 이미지 주소. 없으면 기본 배경색 원, 이미지는 장식 */
  imageSrc?: string | undefined;
  /** 이미지 오른쪽 아래 역할 배지 */
  memberRole?: RoleBadgeRole | undefined;
  /** 역할 이름(예: `메인 관리자`). 라디오 이름 뒤에 읽힘, 없으면 배지는 장식 */
  roleLabel?: string | undefined;
};

/**
 * 멤버 한 명을 고르는 카드(Figma `Profile Radio Card`): 프로필 이미지(역할 배지)·이름·오른쪽 라디오
 * 그룹(`name`·`fieldset`)과 선택 값은 호출자 담당, `className`은 카드에 적용
 */
export const ProfileRadioCard = ({
  label,
  imageSrc,
  memberRole,
  roleLabel,
  className,
  ...props
}: ProfileRadioCardProps) => (
  <label
    className={cn(
      'bg-surface-primary rounded-r5 relative isolate px-padding-p6 py-padding-p5 gap-s3 group flex w-full cursor-pointer touch-manipulation items-center',
      // 눌림은 글자 뒤 덮개로 겹쳐 글자는 그대로 유지, 전환은 공통 press-overlay(#583)
      'press-overlay before:rounded-r5 before:bg-overlay-hover before:-z-10 not-has-disabled:active:before:opacity-100',
      'has-checked:ring-border-strong-lighter has-checked:ring-1 has-checked:ring-inset',
      'has-disabled:cursor-not-allowed has-disabled:opacity-(--semantic-opacity-disabled)',
      className,
    )}
  >
    <span className="flex shrink-0 items-end">
      <ProfileImage
        src={imageSrc}
        size="S"
        className={cn(
          'border-border-primary border',
          'group-[:not(:has(:disabled)):active:not(:root[data-touch-scrolling]_*)]:after:bg-overlay-hover after:absolute after:inset-0 after:opacity-0 group-[:not(:has(:disabled)):active:not(:root[data-touch-scrolling]_*)]:after:opacity-100',
        )}
      />
      {/* Figma: 배지 16px가 이미지와 12px 겹침, 눌림은 검정 10% 겹침과 같은 밝기 90% */}
      {memberRole ? (
        <RoleBadge
          memberRole={memberRole}
          className="relative -ml-3 shrink-0 group-[:not(:has(:disabled)):active:not(:root[data-touch-scrolling]_*)]:brightness-90"
        />
      ) : null}
    </span>
    {/* 이름이 남은 폭을 채워 라디오를 오른쪽 끝에 배치 */}
    <span
      title={label}
      className="typography-body-1-medium text-text-primary group-has-disabled:text-text-disabled min-w-0 flex-1 truncate"
    >
      {label}
      {memberRole && roleLabel ? <span className="sr-only">{`, ${roleLabel}`}</span> : null}
    </span>
    <Radio {...props} />
  </label>
);
