import { Skeleton } from '@app/design-system';
import { ProfileListSkeleton } from '@/shared/components/skeleton/ProfileRowSkeleton';
import { FEED_MESSAGES as text } from '../../constants/messages';

/**
 * 멤버 프로필 본문의 받는 중 자리(MemberProfileScreen과 같은 여백, Figma에 없는 상태)
 * 프로필 사진(L 90px)·닉네임과 참여 중인 번치 행만 회색, 「참여중인 번치」 제목은 고정 문구라 실제로 씀
 */
export function MemberProfileSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="gap-s7 pt-padding-p5 px-padding-p8 flex flex-col items-center">
        <Skeleton shape="round" className="size-22.5" />
        <span className="typography-body-1-semi-bold flex h-lh items-center">
          <Skeleton className="h-5 w-16" />
        </span>
      </div>
      <section className="gap-s5 pt-padding-p15 px-padding-p8 pb-s8 flex flex-col">
        <h2 className="typography-body-4-semi-bold text-text-quaternary">
          {text.memberBunchesTitle}
        </h2>
        <ProfileListSkeleton variant="plain" count={2} className="gap-s4" />
      </section>
    </div>
  );
}
