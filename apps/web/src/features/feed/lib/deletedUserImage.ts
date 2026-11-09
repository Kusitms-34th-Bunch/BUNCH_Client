// 나간·탈퇴한 멤버와 삭제된 댓글의 프로필(Figma `Profile Image` `Status=DeletedUser`, `3504:69584`)
export const DELETED_USER_IMAGE = '/images/profile/deleted-user.png';

/** 나간·탈퇴한 멤버의 이미지를 기본 이미지로 바꿈(남아 있는 원래 이미지가 보이지 않게) */
export const hideLeftMemberImages = <
  T extends { imageSrc?: string | undefined; left?: boolean | undefined },
>(
  members: T[],
) => members.map((member) => (member.left ? { ...member, imageSrc: DELETED_USER_IMAGE } : member));
