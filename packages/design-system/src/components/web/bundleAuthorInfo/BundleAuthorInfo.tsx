import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../../../utils';
import { BundleParticipants, type BundleParticipant } from '../bundleParticipants';
import { ColorBadge } from '../colorBadge';
import { ProfileImage } from '../profileImage';

type BaseProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 프로필 이미지(번치 이미지 또는 광고 로고) */
  imageSrc?: string | undefined;
};

export type BundleAuthorInfoProps = BaseProps &
  (
    | {
        variant?: 'default' | undefined;
        /** 번치 이름 */
        bunchName: string;
        /** 발행 경과 시간 글자(예: 「2일 전」) */
        time: string;
        /** 번치(이미지·이름)를 눌렀을 때. 번치 프로필로 이동 */
        onBunchClick: () => void;
        /** 참여 멤버. 있으면 오른쪽에 얼굴 묶음 */
        members?: BundleParticipant[] | undefined;
        /** 참여 멤버 묶음을 눌렀을 때 */
        onMembers?: (() => void) | undefined;
      }
    | {
        variant: 'ad';
        /** 위쪽 회색 배지 글자(예: 「BUNCH SPOT」) */
        badge: string;
        /** 홍보 문구 */
        tagline: string;
        /** 오른쪽 버튼 자리(콕하기·더보기 등). 호출자가 조립 */
        actions?: ReactNode;
      }
  );

/**
 * 번들 작성자 정보(Figma `Bundle Author Info`): 기본(번치 이미지·이름·경과 시간·참여 멤버)과 광고(로고·배지·홍보 문구·버튼 자리)
 * 바깥 여백은 호출자 담당
 */
export const BundleAuthorInfo = (props: BundleAuthorInfoProps) => {
  if (props.variant === 'ad') {
    const { variant: _, imageSrc, badge, tagline, actions, className, ...rest } = props;
    return (
      <div className={cn('bg-surface-primary flex items-center', className)} {...rest}>
        <div className="gap-s4 flex min-w-0 flex-1 items-center">
          <ProfileImage
            size="XS"
            src={imageSrc}
            alt=""
            className="outline-border-tertiary outline -outline-offset-1"
          />
          <div className="gap-s2 flex min-w-0 flex-1 flex-col items-start">
            <ColorBadge size="sm" color="gray">
              {badge}
            </ColorBadge>
            <p className="px-padding-p2 typography-caption-1-medium text-text-tertiary w-full truncate">
              {tagline}
            </p>
          </div>
        </div>
        {actions ? <div className="gap-s6 flex shrink-0 items-center">{actions}</div> : null}
      </div>
    );
  }

  const {
    variant: _,
    imageSrc,
    bunchName,
    time,
    onBunchClick,
    members,
    onMembers,
    className,
    ...rest
  } = props;
  return (
    <div className={cn('bg-surface-primary flex items-start', className)} {...rest}>
      <button
        type="button"
        onClick={onBunchClick}
        className="gap-s4 focus-visible:outline-border-brand rounded-r2 flex min-w-0 flex-1 cursor-pointer touch-manipulation items-center text-left focus-visible:outline-2"
      >
        <ProfileImage
          size="XS"
          src={imageSrc}
          alt=""
          className="outline-border-tertiary outline -outline-offset-1"
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="typography-body-2-semibold text-text-primary -mb-0.5 truncate">
            {bunchName}
          </span>
          {/* Figma 시간 줄은 글자 16에 높이 18 */}
          <span className="typography-caption-1-regular text-text-tertiary flex h-4.5 items-center">
            {time}
          </span>
        </span>
      </button>
      {members ? <BundleParticipants members={members} onClick={onMembers} /> : null}
    </div>
  );
};
