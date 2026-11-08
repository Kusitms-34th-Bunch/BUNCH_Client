import type { ComponentProps } from 'react';
import type { BundleInfoProps } from '../bundleInfo';
import type { BundleParticipant } from '../bundleParticipants';
import { cn } from '../../../utils';
import { BundleEngagement, type BundleEngagementProps } from '../bundleEngagement';
import { BundlePhoto, type BundlePhotoProps } from '../bundlePhoto';

export type FeedBundleCardProps = Omit<ComponentProps<'article'>, 'children' | 'title'> & {
  /** 번치 이름·이미지·경과 시간 */
  bunchName: string;
  bunchImageSrc?: string | undefined;
  time: string;
  /** 번치를 눌렀을 때(번치 프로필) */
  onBunchClick: () => void;
  /** 참여 멤버와 묶음을 눌렀을 때(참여 멤버 시트) */
  members: BundleParticipant[];
  onMembers?: (() => void) | undefined;
  /** 사진과 첫 사진 위의 제목·위치·날짜 */
  photos: BundlePhotoProps['photos'];
  title: string;
  location?: string | undefined;
  onLocationClick?: (() => void) | undefined;
  date?: string | undefined;
  /** 제목 요소 태그. 기본 h3(피드 화면의 h2 아래) */
  titleAs?: BundleInfoProps['titleAs'];
  /** 사진을 눌렀을 때(번들 상세) */
  onPhotoClick: (_index: number) => void;
} & Pick<BundleEngagementProps, 'liked' | 'likeCount' | 'onLike' | 'commentCount' | 'onComment'>;

/**
 * 피드 번들 카드(Figma `Bundle Feed Card`): 둥근 사진(첫 사진 위 번치·제목·위치·날짜) · 좋아요·댓글 수·참여 멤버
 * 카드 전체가 하나의 버튼이 아니라 누르는 곳마다 다른 버튼(번치·참여 멤버·사진·위치·하트·말풍선). 좌우 여백은 호출자 담당
 */
export const FeedBundleCard = ({
  bunchName,
  bunchImageSrc,
  time,
  onBunchClick,
  members,
  onMembers,
  photos,
  title,
  location,
  onLocationClick,
  date,
  titleAs = 'h3',
  onPhotoClick,
  liked,
  likeCount,
  onLike,
  commentCount,
  onComment,
  className,
  ...props
}: FeedBundleCardProps) => (
  <article
    aria-label={`${bunchName}의 번들 ${title}`}
    className={cn('gap-s5 flex w-full flex-col', className)}
    {...props}
  >
    <BundlePhoto
      photos={photos}
      author={{ name: bunchName, imageSrc: bunchImageSrc, time, onClick: onBunchClick }}
      info={{ title, location, onLocationClick, date, titleAs }}
      onPhotoClick={onPhotoClick}
      // 피드의 카드끼리 구분되게 제목을 넣음
      photoLabel={(index, total) => `${title} 사진 ${index + 1}/${total} 열기`}
    />
    <BundleEngagement
      liked={liked}
      likeCount={likeCount}
      onLike={onLike}
      commentCount={commentCount}
      onComment={onComment}
      members={members}
      onMembers={onMembers}
      // 카드 안에서는 바깥 여백 없음(Figma `Bundle Engagement` 4940:100841)
      className="p-0"
    />
  </article>
);
