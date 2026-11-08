import { DEFAULT_BUNCH_IMAGES } from '@/shared/lib/bunchProfile';

// 초대 링크 조회 API 연결 전 Figma 예시 값 사용. 초대받은 번치(여행가조, TYPE_3)의 기본 이미지
export const joinInvitationFixture = {
  bunchName: '여행가조',
  description: '틈만 나면 떠나는 여행 좋아하는 네 명',
  senderName: '민지',
  imageSrc: DEFAULT_BUNCH_IMAGES.TYPE_3,
} as const;
