import { DEFAULT_BUNCH_IMAGES } from '@/shared/lib/bunchProfile';
import type { FeedBundleDetail, FeedComment, FeedMemberComment } from '../lib/types';
import { feedFixture } from './feed.fixture';

// 번들 상세 API 연결 전 Figma 예시 값
const AVATAR = DEFAULT_BUNCH_IMAGES.TYPE_3;
const COMMENT =
  '퇴근하고 뛰는 게 이렇게 상쾌할 줄이야! 하루 종일 책상 앞에 앉아 있다가 밖으로 나오니 선선한 바람부터 기분 좋게 느껴졌다. 처음에는 몸이 무겁고 피곤해서 그냥 집에 갈까 고민했는데,';
const REPLY =
  '와 정말 재미있겠어요. 저도 다음에 퇴근하고 뛰고 싶어요! 오늘 하루도 수고하셨습니다람쥐';

const memberComments: FeedMemberComment[] = [
  { id: 'm-1', name: '은우', imageSrc: AVATAR, comment: COMMENT },
  { id: 'm-2', name: '경진', imageSrc: AVATAR, comment: '바다 보면서 먹은 갈치조림이 최고였어요.' },
  { id: 'm-3', name: '수인', imageSrc: AVATAR, comment: '다음에는 우도까지 가 봐요!' },
  { id: 'm-4', name: '효찬', comment: '', left: true },
];

const comments: FeedComment[] = [
  {
    id: 'c-1',
    author: '수인',
    avatarSrc: AVATAR,
    bunchName: '퇴근런클럽',
    bunchColor: 'brand',
    date: '2025.06.08',
    content: REPLY,
    replyCount: 1,
  },
  {
    id: 'c-2',
    author: '수인',
    avatarSrc: AVATAR,
    bunchName: '여행가조',
    bunchColor: 'pink',
    date: '2025.06.08',
    content: REPLY,
    reply: true,
  },
  { id: 'c-3', author: '작성자', deleted: true },
  { id: 'c-4', author: '작성자', deleted: true, reply: true },
];

// 첫 사진 8명(펼침 예시), 둘째 2명, 셋째 1명, 나머지는 없음
const PICK_COUNTS = [8, 2, 1];
const pickers = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ name: `멤버 ${index + 1}`, imageSrc: AVATAR }));

/** 피드 fixture의 번들에 상세 값을 더함. 없는 번들이면 undefined */
export function getBundleDetailFixture(bundleId: string): FeedBundleDetail | undefined {
  const bundle = [...feedFixture.following, ...feedFixture.public].find(
    ({ id }) => id === bundleId,
  );
  if (!bundle) return undefined;
  const first = bundle.id === 'bundle-1';
  return {
    ...bundle,
    photos: bundle.photos.map((photo, index) => ({
      ...photo,
      pickers: pickers(PICK_COUNTS[index] ?? 0),
    })),
    // 첫 번들은 멤버 공개와 댓글 있는 예시, 나머지는 공개와 댓글 없는 예시(Figma 번들_Empty)
    memberOnly: first,
    memberComments,
    comments: first ? comments : [],
    commentCount: first ? comments.length : 0,
  };
}
