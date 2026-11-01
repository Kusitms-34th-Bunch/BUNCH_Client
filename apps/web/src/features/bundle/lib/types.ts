/** 번치에서의 역할. 번들 화면의 권한과 역할 배지를 정하는 기준 */
export type BunchRole = 'owner' | 'coOwner' | 'member';

export type DraftMember = {
  id: string;
  name: string;
  /** 프로필 이미지 주소(없으면 배경색 원) */
  avatarSrc?: string | undefined;
  bunchRole: BunchRole;
  /** 초안을 만든 멤버 */
  isCreator: boolean;
};

export type DraftPhoto = {
  id: string;
  src: string;
  alt: string;
  /** 사진 캡션(없으면 빈 문자열) */
  caption: string;
};

export type DraftLocation = {
  id: string;
  name: string;
};

export type DraftComment = {
  memberId: string;
  text: string;
};

export type DraftVisibility = 'members' | 'public';

/** 다른 멤버가 편집 중인 영역(멤버 id). 서버 연결 전에는 fixture 값 */
export type DraftEditing = {
  title?: string | undefined;
  /** 사진을 편집 중인 멤버 모두 */
  photoMemberIds?: readonly string[] | undefined;
  location?: string | undefined;
  date?: string | undefined;
  /** 코멘트를 쓰는 중인 멤버(잠그지 않고 표시만) */
  commentMemberIds?: readonly string[] | undefined;
};

export type Draft = {
  id: string;
  /** 참여 멤버(순서대로 표시) */
  members: readonly DraftMember[];
  title: string;
  photos: readonly DraftPhoto[];
  locations: readonly DraftLocation[];
  /** 번들 날짜('YYYY-MM-DD'), 없으면 null */
  date: string | null;
  /** 추천 날짜('YYYY-MM-DD', 최대 3개) */
  suggestedDates: readonly string[];
  comments: readonly DraftComment[];
  visibility: DraftVisibility;
  editing: DraftEditing;
};

/** 지금 초안을 보는 사람. 참여 멤버가 아닌 번치 멤버도 포함 */
export type DraftViewer = {
  memberId: string;
  bunchRole: BunchRole;
};

export type SaveStatus = 'saved' | 'saving';

export type PlaceResult = {
  id: string;
  name: string;
  address: string;
};
