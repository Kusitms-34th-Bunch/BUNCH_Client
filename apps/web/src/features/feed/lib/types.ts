export type FeedBunch = { id: string; name: string; imageSrc?: string | undefined };

/** 번들에 등록된 장소 */
export type FeedPlace = {
  id: string;
  name: string;
  address?: string | undefined;
  /** 현재 번치의 콕한 장소에 담겨 있음(다른 멤버·다른 번들에서 콕한 것 포함) */
  picked: boolean;
};

/** 번들 참여 멤버(업로드 시점 멤버) */
export type FeedBundleMember = {
  /** 멤버 프로필로 갈 때 쓰는 ID. 나간·탈퇴한 멤버는 없음 */
  id?: string | undefined;
  name: string;
  imageSrc?: string | undefined;
  /** 역할 배지(일반 멤버는 없음) */
  role?: 'owner' | 'coOwner' | undefined;
  /** 나간·탈퇴한 멤버: 기본 이미지 + 「작성자」 */
  left?: boolean | undefined;
};

export type FeedBundle = {
  id: string;
  /** 번들을 올린 번치 */
  bunch: FeedBunch;
  /** 발행 시각(ISO) */
  publishedAt: string;
  title: string;
  /** 위치 글자(「{첫 위치} 외 N곳」은 서버가 만든 값) */
  location?: string | undefined;
  /** 등록된 장소(콕하기 시트) */
  places: FeedPlace[];
  /** 날짜 글자(예: 「2026년 7월 9일」) */
  date?: string | undefined;
  photos: {
    src: string;
    alt?: string | undefined;
    /** 이 사진을 pick한 멤버 */
    pickers?: { name: string; imageSrc?: string | undefined }[] | undefined;
  }[];
  members: FeedBundleMember[];
  /** 현재 번치가 좋아요했는지 */
  liked: boolean;
  likeCount: number;
  commentCount: number;
};

/** 광고(BUNCH SPOT) 카드 */
export type FeedAd = {
  id: string;
  /** 장소 이름 */
  title: string;
  imageSrc: string;
  logoSrc?: string | undefined;
  /** 홍보 문구 */
  tagline: string;
  description?: string | undefined;
  location?: string | undefined;
  tags?: readonly string[] | undefined;
  /** 현재 번치의 콕한 장소에 담겨 있음 */
  picked: boolean;
};

/** 팔로우한 번치 구간과 공개 구간(앞 구간에 나온 번들은 서버가 뺌), 공개 구간 끝의 광고 */
export type FeedData = { following: FeedBundle[]; public: FeedBundle[]; ads: FeedAd[] };

/** 피드를 보는 사람의 지금 번치. 소속 번치가 없으면 null, 아직 모르면(첫 hydration) undefined */
export type FeedViewer = { bunchId: string; name: string; imageSrc?: string | undefined } | null;

/** 번들 상세의 참여 멤버와 코멘트 */
export type FeedMemberComment = {
  id: string;
  name: string;
  imageSrc?: string | undefined;
  comment: string;
  /** 나간·탈퇴한 멤버: 기본 이미지 + 「작성자」, 내용 대신 「삭제된 코멘트입니다」 */
  left?: boolean | undefined;
};

export type FeedComment = {
  id: string;
  author: string;
  avatarSrc?: string | undefined;
  bunchName?: string | undefined;
  bunchColor?: 'brand' | 'gray' | 'pink' | 'green' | 'orange' | undefined;
  /** 「YYYY.MM.DD」 */
  date?: string | undefined;
  content?: string | undefined;
  reply?: boolean | undefined;
  deleted?: boolean | undefined;
  replyCount?: number | undefined;
};

export type FeedBundleDetail = FeedBundle & {
  /** 멤버 공개 번들(제목 옆 뱃지) */
  memberOnly: boolean;
  memberComments: FeedMemberComment[];
  comments: FeedComment[];
};

export type FeedFollowStatus = 'none' | 'following' | 'requested';

/** 멤버가 참여 중인 번치(팔로우 상태는 현재 번치 기준) */
export type FeedMemberBunch = {
  id: string;
  name: string;
  imageSrc?: string | undefined;
  isPrivate: boolean;
  followStatus: FeedFollowStatus;
};

export type FeedMemberProfile = {
  id: string;
  name: string;
  imageSrc?: string | undefined;
  bunches: FeedMemberBunch[];
};
