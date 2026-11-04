// 백엔드 API 명세의 응답 모양, ID는 서버 숫자(long)이고 화면 모델 변환은 endpoint 경계 담당
// 번들 모양은 번들 연동 이슈에서 추가

export type MemberRole = 'OWNER' | 'CO_OWNER' | 'MEMBER';

export type CharacterType = 'TYPE_1' | 'TYPE_2' | 'TYPE_3' | 'TYPE_4';

export type MockMember = {
  memberId: number;
  nickname: string;
  imageUrl: string | null;
  birthYear: number | null;
  gender: 'FEMALE' | 'MALE' | null;
};

export type MockBunch = {
  id: number;
  name: string;
  characterType: CharacterType;
  imageUrl: string | null;
  introduction: string;
  /** 가짜 DB 내부 표현, 응답 값은 번치 홈 계약 확정 때 정함 */
  isPrivate: boolean;
};

export type MockMembership = {
  bunchId: number;
  memberId: number;
  role: MemberRole;
};

/** 같은 사진을 여러 멤버가 올리면 하나로 합쳐 올린 사람을 모두 기록 */
export type MockPhoto = {
  photoId: number;
  bunchId: number;
  uploaderIds: number[];
  /** 촬영 날짜('YYYY-MM-DD'), 날짜를 모르면 null */
  capturedDate: string | null;
  /** 촬영 시각('HH:mm:ss'), 시각을 모르면 null */
  capturedTime: string | null;
  thumbnailUrl: string;
  imageUrl: string;
};

export type MockDbState = {
  members: MockMember[];
  bunches: MockBunch[];
  memberships: MockMembership[];
  photos: MockPhoto[];
};
