import type { BunchFollows, FollowBunch, OtherBunch } from '../lib/types';
import { DEFAULT_BUNCH_IMAGE } from './bunchHome.fixture';
import { otherBunchesFixture } from './otherBunches.fixture';

// 팔로우 API 연결 전 팔로워·팔로잉 목록 예시(화면설계서 2500:71333·2500:72664)
const bunch = (
  id: string,
  name: string,
  isPrivate: boolean,
  followStatus: FollowBunch['followStatus'] = 'none',
): FollowBunch => ({ id, name, imageSrc: DEFAULT_BUNCH_IMAGE, isPrivate, followStatus });

// 프로필이 있는 번치(캠핑러버·책방산책)는 프로필과 같은 값(팔로우 상태를 같은 저장소로 공유)
const fromProfile = ({ id, name, imageSrc, isPrivate, followStatus }: OtherBunch): FollowBunch => ({
  id,
  name,
  imageSrc,
  isPrivate,
  followStatus,
});

export const followBunchesFixture: Readonly<Record<string, FollowBunch>> = {
  'bunch-walk': bunch('bunch-walk', '산책클럽', true, 'following'),
  ...Object.fromEntries(
    Object.values(otherBunchesFixture).map((profile) => [profile.id, fromProfile(profile)]),
  ),
  'bunch-running': bunch('bunch-running', '러닝크루', true),
  'bunch-night': bunch('bunch-night', '밤샘크루', true, 'requested'),
  'bunch-reading': bunch('bunch-reading', '독서모임 페이지', false),
  'bunch-hiking': bunch('bunch-hiking', '주말등산', false, 'following'),
  'bunch-surf': bunch('bunch-surf', '서핑크루', true),
  'bunch-tasty': bunch('bunch-tasty', '맛집탐방대', true),
  'bunch-bed': bunch('bunch-bed', '침대조아', true),
};

const EMPTY: BunchFollows = { followers: [], following: [], requests: [] };

// 수는 번치 fixture 값, 목록은 그중 일부(목록 페이지 나누기는 API 연결 때). 비공개인 퇴근런클럽에만 대기 중인 요청(화면설계서 2500:72664)
export const bunchFollowsFixture: Readonly<Record<string, BunchFollows>> = {
  'bunch-run': {
    followers: ['bunch-walk', 'bunch-camping', 'bunch-running', 'bunch-night', 'bunch-reading'],
    following: ['bunch-walk', 'bunch-hiking'],
    requests: [
      { bunchId: 'bunch-surf', daysAgo: 1 },
      { bunchId: 'bunch-tasty', daysAgo: 1 },
      { bunchId: 'bunch-bed', daysAgo: 3 },
    ],
  },
  'bunch-trip': {
    followers: ['bunch-walk', 'bunch-camping', 'bunch-running', 'bunch-reading'],
    following: ['bunch-walk', 'bunch-hiking'],
    requests: [],
  },
  'bunch-camping': {
    followers: ['bunch-walk', 'bunch-book', 'bunch-hiking'],
    following: ['bunch-walk', 'bunch-book', 'bunch-hiking', 'bunch-reading'],
    requests: [],
  },
  'bunch-book': {
    followers: ['bunch-walk', 'bunch-camping', 'bunch-reading'],
    following: ['bunch-camping'],
    requests: [],
  },
};

// URL 값이라 `__proto__` 같은 상속 속성 이름은 목록 없음으로
export const findBunchFollows = (bunchId: string): BunchFollows =>
  (Object.hasOwn(bunchFollowsFixture, bunchId) && bunchFollowsFixture[bunchId]) || EMPTY;
