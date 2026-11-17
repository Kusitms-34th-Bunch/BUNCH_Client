import type { Picks } from './picks';

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

/** 번들의 위치 한 줄. id는 서버가 준 장소 행 id(presence·이동·교체의 기준)이고 provider·externalId는 같은 장소인지 가르는 값 */
export type DraftLocation = {
  id: string;
  provider: string;
  externalId: string;
  name: string;
  /** 주소 없음은 null */
  address: string | null;
};

export type DraftComment = {
  memberId: string;
  text: string;
};

export type DraftVisibility = 'members' | 'public';

/**
 * 누가 어느 영역을 작업 중인지(멤버 id, 실시간 presence). 잠그지 않고 표시만 하며 여러 멤버가 같은 영역에 있을 수 있음(기능 spec 4.3.13)
 * 제목·코멘트는 실제로 입력 중인 멤버, 사진은 열린 화면과 진행 작업을 한곳에 모은 멤버
 */
export type DraftEditing = {
  titleMemberIds?: readonly string[] | undefined;
  commentMemberIds?: readonly string[] | undefined;
  /** 코멘트를 입력 중인 멤버가 지금 친 글자(입력 미리보기). 멤버 id → 현재 전체 입력 */
  commentTexts?: Readonly<Record<string, string>> | undefined;
  photoMemberIds?: readonly string[] | undefined;
  /** 새 위치를 추가하려는 멤버 */
  locationAddMemberIds?: readonly string[] | undefined;
  /** 위치 줄을 바꾸려는 멤버: 위치 id → 멤버 */
  locationEditors?: Readonly<Record<string, readonly string[]>> | undefined;
  dateMemberIds?: readonly string[] | undefined;
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
  /** 사진별로 그 사진을 픽한 멤버(서버 값, 참여 시각 순). 기능 spec 4.3.5 */
  picks: Picks;
  /** 공개 범위. 초안을 만들면 고르지 않은 상태(null)로 시작하고, 발행하려면 하나를 골라야 함(기능 spec 4.3.9) */
  visibility: DraftVisibility | null;
  editing: DraftEditing;
  /** 지금 이 초안에 들어와 있는 멤버(멤버 카드의 초록 점, 기능 spec 4.3.2) */
  viewingMemberIds: readonly string[];
};

/** 지금 초안을 보는 사람. 참여 멤버가 아닌 번치 멤버도 포함 */
export type DraftViewer = {
  memberId: string;
  bunchRole: BunchRole;
};

/** 저장 실패는 서버가 거절하거나 재시도를 모두 썼을 때(입력은 지우지 않고 다음 입력에서 다시 시도) */
export type SaveStatus = 'saved' | 'saving' | 'failed';

/** 위치 검색 결과(`id`는 목록에서 구분하는 값, 저장에는 provider·externalId를 씀) */
export type PlaceResult = {
  id: string;
  provider: string;
  externalId: string;
  name: string;
  address: string;
};
