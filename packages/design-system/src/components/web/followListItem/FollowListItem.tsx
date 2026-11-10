import type { ComponentProps, ReactNode } from 'react';
import { LineLockSmallIcon } from '../../../icons';
import { cn } from '../../../utils';
import { ProfileImage } from '../profileImage';

export type FollowListItemProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 이름(긴 이름은 한 줄 말줄임) */
  name: string;
  /** 프로필 이미지 주소. 없으면 기본 배경색 원, 이미지는 장식 */
  imageSrc?: string | undefined;
  /** 비공개 계정: 이름 뒤 자물쇠 표시 */
  isPrivate?: boolean | undefined;
  /** 비공개 계정일 때 읽는 숨은 글자(i18n). 빈 글자면 기본값 `비공개 계정` */
  privateLabel?: string | undefined;
  /** 이름 아래 보조 글자(예: 요청 시각 `1일 전`). 형식은 호출자 담당 */
  meta?: string | undefined;
  /** 이미지·이름을 눌렀을 때(프로필로 이동). 없으면 누를 수 없음 */
  onProfileClick?: (() => void) | undefined;
  /** 오른쪽 동작(팔로우·팔로잉 버튼, 승인·거절 버튼 등) */
  action?: ReactNode;
};

/**
 * 팔로우 목록 한 줄(Figma `Profile List - 02`·`Profile List - 3`): 프로필 이미지·이름·자물쇠·오른쪽 동작
 * 이미지·이름은 `onProfileClick`이 있을 때만, 오른쪽 동작은 따로 누름. 목록 의미(`ul`·`li`)는 호출자 담당
 */
export const FollowListItem = ({
  name,
  imageSrc,
  isPrivate,
  privateLabel,
  meta,
  onProfileClick,
  action,
  className,
  ...props
}: FollowListItemProps) => {
  // 버튼 안에도 놓이므로 글자는 span(ProfileImage의 div는 BundleAuthorInfo의 버튼과 같은 구조)
  const profile = (
    <>
      <ProfileImage src={imageSrc} className="border-border-tertiary size-10 shrink-0 border" />
      <span className="gap-s1 flex min-w-0 flex-col">
        <span className="typography-body-3-semibold text-text-secondary gap-s2 flex min-w-0 items-center">
          <span title={name} className="truncate">
            {name}
          </span>
          {isPrivate ? (
            // Figma: 보조 글자가 없는 행은 회색 원 안에, 있는 행은 원 없이 자물쇠 표시
            <span
              className={cn(
                'text-icon-tertiary flex shrink-0 items-center justify-center',
                !meta && 'bg-surface-secondary size-6 rounded-full',
              )}
            >
              <LineLockSmallIcon />
              <span className="sr-only">, {privateLabel || '비공개 계정'}</span>
            </span>
          ) : null}
        </span>
        {meta ? (
          <span className="typography-caption-1-regular text-text-quaternary truncate">{meta}</span>
        ) : null}
      </span>
    </>
  );

  return (
    <div
      {...props}
      className={cn(
        'bg-surface-primary p-padding-p4 gap-s4 flex items-center justify-between',
        className,
      )}
    >
      {onProfileClick ? (
        <button
          type="button"
          onClick={onProfileClick}
          className="gap-s3 focus-visible:outline-border-brand rounded-r2 flex min-w-0 flex-1 cursor-pointer touch-manipulation items-center text-left focus-visible:outline-2"
        >
          {profile}
        </button>
      ) : (
        <div className="gap-s3 flex min-w-0 items-center">{profile}</div>
      )}
      {action ? <div className="gap-s4 flex shrink-0 items-center">{action}</div> : null}
    </div>
  );
};
