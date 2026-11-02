import type { BundleCardMember } from '@app/design-system/web';

/** 지금 번치에서 내 역할(기능명세 5장 권한 표). 메뉴 항목과 할 수 있는 일이 달라짐 */
export type BunchRole = 'owner' | 'coOwner' | 'member';

/** 번치 멤버 한 명(멤버 관리 목록 한 줄) */
export type BunchMember = {
  id: string;
  name: string;
  /** 프로필 이미지 주소(없으면 배경색 원) */
  imageSrc?: string | undefined;
  role: BunchRole;
  /** 나 자신이면 이름 뒤 「(나)」, 관리 대상에서 제외 */
  isMe?: boolean | undefined;
};

/** 내 번치가 차단한 다른 번치(차단 목록 한 줄) */
export type BlockedBunch = {
  id: string;
  name: string;
  /** 번치 대표 이미지 주소(없으면 배경색 원) */
  imageSrc?: string | undefined;
};

/** 번치 전환 목록의 상태. 삭제됐거나 내보내진 번치는 「접근 불가」로 남음 */
export type BunchAccess = 'active' | 'deleted' | 'removed';

/** 번치 전환 목록 한 줄 */
export type BunchSummary = {
  id: string;
  name: string;
  /** 번치 대표 이미지 주소(없으면 배경색 원) */
  imageSrc?: string | undefined;
  /** 읽지 않은 알림 수(0이면 칩 숨김) */
  alertCount: number;
  access: BunchAccess;
};

/** 완성된 번들(그리드 한 칸) */
export type CompletedBundle = {
  id: string;
  title: string;
  coverSrc: string;
};

/** 작성 중인 번들(목록 한 줄) */
export type DraftBundle = {
  id: string;
  title: string;
  coverSrc: string;
  members: BundleCardMember[];
};

/** 지금 보고 있는 번치의 프로필과 번들 */
export type BunchHomeDetail = {
  id: string;
  name: string;
  /** 헤더 번치 이미지 주소 */
  imageSrc?: string | undefined;
  description: string;
  /** 비공개 번치면 이름 옆 자물쇠 */
  isPrivate: boolean;
  /** 이 번치에서 내 역할(더보기 메뉴 항목이 달라짐) */
  myRole: BunchRole;
  followerCount: number;
  followingCount: number;
  memberCount: number;
  completedBundles: readonly CompletedBundle[];
  draftBundles: readonly DraftBundle[];
};

export type BunchHomeData = {
  current: BunchHomeDetail;
  /** 전환 목록. 지금 번치가 맨 위 */
  bunches: readonly BunchSummary[];
};

/**
 * 번치 홈이 부르는 동작. API 연결 전에는 목 동작을 돌려주고, 연결하면 hook 구현만 바꿈
 */
export type BunchHomeActions = {
  switchBunch: (_bunchId: string) => void;
  deleteDraftBundle: (_bundleId: string) => void;
  /** 접근 불가 번치를 전환 목록에서 지움(「번치 목록에서 삭제」) */
  removeBunch: (_bunchId: string) => void;
};

/** 번치 알림 한 건(기능명세 5.12). 시각 글자 형식은 API 연결 때 정함 */
export type BunchNotification = {
  id: string;
  title: string;
  description: string;
  /** 시각 글자(예: 「방금 전」) */
  time: string;
  /** 처음 받았을 때 읽지 않음이면 true(읽음 처리는 저장소가 덮어씀) */
  unread: boolean;
};
