import type { BunchMember } from '@/shared/api/bunchMembers';
import type { BundleDetail } from '../model/bundle';
import type { BunchRole, Draft, DraftLocation, DraftMember } from './types';

const ROLE: Readonly<Record<BunchMember['role'], BunchRole>> = {
  OWNER: 'owner',
  CO_OWNER: 'coOwner',
  MEMBER: 'member',
};

/** 번치 멤버를 초안 화면의 멤버 모양으로 변환(초안 생성자 여부는 번들마다 다름) */
export const toDraftMember = (member: BunchMember, createdBy: string): DraftMember => ({
  id: member.id,
  name: member.name,
  avatarSrc: member.avatarSrc,
  bunchRole: ROLE[member.role],
  isCreator: member.id === createdBy,
});

type ToDraftInput = {
  detail: BundleDetail;
  /** 번치 멤버 전체(이름·역할을 찾는 기준) */
  bunchMembers: readonly BunchMember[];
  /** 서버에 필드가 없어 화면에서만 들고 있는 위치 */
  locations: readonly DraftLocation[];
};

/**
 * 서버 번들(BundleDetail)과 번치 멤버로 초안 화면의 `Draft`를 만듦
 * 번치에서 나간 참여자처럼 멤버 목록에 없는 사람은 이름을 알 수 없어 뺌(서버가 발행 때 PARTICIPANT_INACTIVE로 알려 줌)
 */
export const toDraft = ({ detail, bunchMembers, locations }: ToDraftInput): Draft => {
  const memberOf = (id: string) => {
    const member = bunchMembers.find((candidate) => candidate.id === id);
    return member ? toDraftMember(member, detail.createdBy) : undefined;
  };
  return {
    id: detail.id,
    members: detail.participantIds.flatMap((id) => memberOf(id) ?? []),
    title: detail.title,
    photos: detail.photos.map((photo, index) => ({
      id: photo.id,
      src: photo.src,
      alt: `번들 사진 ${index + 1}`,
      // 서버가 사진마다 촬영 시각을 주지 않아 화면에는 날짜 없이 표시
      takenAt: null,
      uploaderId: photo.addedBy,
      sourcePhotoId: photo.sourcePhotoId,
    })),
    locations,
    date: detail.date,
    suggestedDates: detail.dateChips,
    comments: detail.comments.map((comment) => ({
      memberId: comment.memberId,
      text: comment.content,
    })),
    visibility:
      detail.visibility === null ? null : detail.visibility === 'PUBLIC' ? 'public' : 'members',
    // 누가 어디를 편집 중인지는 실시간 presence로 받을 예정이라 서버 응답에는 없음
    editing: {},
  };
};
