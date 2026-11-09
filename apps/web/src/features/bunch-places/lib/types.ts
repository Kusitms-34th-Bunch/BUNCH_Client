/** 멤버 필터에서 「전체」를 가리키는 값(멤버 id와 겹치지 않는 예약어) */
export const ALL_MEMBERS = 'all';

/** 콕한 멤버 필터 칩 한 개 */
export type PlaceMember = {
  id: string;
  name: string;
  /** 프로필 이미지 주소(없으면 현재 번치 타입의 기본 이미지로 채움) */
  avatarSrc?: string | undefined;
};

/** 장소를 담아 온 곳 */
export type PlaceSource =
  /** 번들에서 콕함: 「{번치 이름} | {번들 제목}」 */
  | { kind: 'bundle'; bunchName: string; bundleTitle: string }
  /** 피드 광고(BUNCH PICK)에서 콕함: 담아 온 번들이 없음 */
  | { kind: 'pick' }
  /** 담아 온 번들을 볼 수 없음(삭제·비공개·차단·번치 삭제 등). 장소는 남음 */
  | { kind: 'unavailable' };

/** 콕한 장소 한 곳 */
export type KokPlace = {
  id: string;
  name: string;
  /** 번들 위치에 저장된 주소. 지역명만 있는 위치는 없음 */
  address?: string | undefined;
  /** 처음 콕한 멤버 id. 번치를 나간 멤버면 null(목록에는 남고 「전체」에만 셈) */
  pickedBy: string | null;
  /** 콕한 시각(ISO 8601, 같은 형식끼리 문자열 비교로 정렬) */
  pickedAt: string;
  source: PlaceSource;
};
