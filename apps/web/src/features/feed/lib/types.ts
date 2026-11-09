export type FeedBunch = { id: string; name: string; imageSrc?: string | undefined };

export type FeedBundle = {
  id: string;
  /** 번들을 올린 번치 */
  bunch: FeedBunch;
  /** 발행 시각(ISO) */
  publishedAt: string;
  title: string;
  /** 위치 글자(「{첫 위치} 외 N곳」은 서버가 만든 값) */
  location?: string | undefined;
  /** 날짜 글자(예: 「2026년 7월 9일」) */
  date?: string | undefined;
  photos: {
    src: string;
    alt?: string | undefined;
    /** 이 사진을 pick한 멤버 */
    pickers?: { name: string; imageSrc?: string | undefined }[] | undefined;
  }[];
  members: { name: string; imageSrc?: string | undefined }[];
  /** 현재 번치가 좋아요했는지 */
  liked: boolean;
  likeCount: number;
  commentCount: number;
};

/** 팔로우한 번치 구간과 공개 구간(앞 구간에 나온 번들은 서버가 뺌) */
export type FeedData = { following: FeedBundle[]; public: FeedBundle[] };

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
  /** 멤버 공개 번들(제목 옆 자물쇠) */
  locked: boolean;
  memberComments: FeedMemberComment[];
  comments: FeedComment[];
};
