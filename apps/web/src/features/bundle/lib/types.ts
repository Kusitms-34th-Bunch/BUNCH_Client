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
  /** 촬영 날짜·시각('YYYY-MM-DDTHH:mm'). 확인하지 못했으면 null */
  takenAt: string | null;
  /** 올린 멤버 id */
  uploaderId: string;
  /** 사진함의 어느 사진인지(사진함에서 가져온 사진). 사진 추가 화면이 지금 번들 사진을 선택된 채 여는 기준이고, 없으면 사진함에 대응하는 사진이 없음 */
  sourcePhotoId?: string | undefined;
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

/** 다른 멤버가 편집 중인 영역(멤버 id). 실시간 presence 연결 전에는 fixture 값이고 서버 응답에서는 비어 있음 */
export type DraftEditing = {
  title?: string | undefined;
  /** 사진을 편집 중인 멤버 모두 */
  photoMemberIds?: readonly string[] | undefined;
  /** 사진 한 장 단위의 잠금: 사진 id → 그 사진을 편집 중인 멤버 */
  photoEditors?: Readonly<Record<string, readonly string[]>> | undefined;
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
  /** 공개 범위. 초안을 만들면 고르지 않은 상태(null)로 시작하고, 발행하려면 하나를 골라야 함(기능 spec 4.3.9) */
  visibility: DraftVisibility | null;
  editing: DraftEditing;
};

/** 지금 초안을 보는 사람. 참여 멤버가 아닌 번치 멤버도 포함 */
export type DraftViewer = {
  memberId: string;
  bunchRole: BunchRole;
};

/** 저장 실패는 서버가 거절하거나 재시도를 모두 썼을 때(입력은 지우지 않고 다음 입력에서 다시 시도) */
export type SaveStatus = 'saved' | 'saving' | 'failed';

export type PlaceResult = {
  id: string;
  name: string;
  address: string;
};
