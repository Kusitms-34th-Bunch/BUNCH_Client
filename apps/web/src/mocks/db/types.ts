// 백엔드 API 명세의 응답 모양, ID는 서버 숫자(long)이고 화면 모델 변환은 endpoint 경계 담당
// 사진은 삭제 예시에 필요한 필드만, 나머지 사진·번들 모양은 각 연동 이슈에서 추가

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
};

export type MockDbState = {
  members: MockMember[];
  bunches: MockBunch[];
  memberships: MockMembership[];
  photos: MockPhoto[];
};
