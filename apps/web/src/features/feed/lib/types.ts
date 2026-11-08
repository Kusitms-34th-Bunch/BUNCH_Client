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
  photos: { src: string; alt?: string | undefined }[];
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
