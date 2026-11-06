import { DEFAULT_BUNCH_IMAGE } from '@/shared/lib/bunchProfile';
import type { OwnedBunch } from '../lib/types';

/**
 * 내가 메인 관리자인 번치(메인 관리자 확인 API 연결 전 임시 값, 화면 설계서 MY(5) 탈퇴하기(7)(8))
 * 후보에는 나를 넣지 않음(본인은 권한 이전 대상이 아님)
 */
export const ownedBunchesFixture: readonly OwnedBunch[] = [
  {
    id: 'owned-1',
    name: '퇴근런클럽',
    imageSrc: DEFAULT_BUNCH_IMAGE,
    candidates: [
      { id: 'm-1', name: '지예', role: 'coOwner' },
      { id: 'm-2', name: '서현', role: 'member' },
      { id: 'm-3', name: '재현', role: 'member' },
      { id: 'm-4', name: '효찬', role: 'member' },
    ],
  },
  {
    id: 'owned-2',
    name: '야르렁모임',
    imageSrc: DEFAULT_BUNCH_IMAGE,
    candidates: [
      { id: 'm-5', name: '경진', role: 'coOwner' },
      { id: 'm-6', name: '경준', role: 'member' },
      { id: 'm-7', name: '수인', role: 'member' },
    ],
  },
];
