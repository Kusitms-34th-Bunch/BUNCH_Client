'use client';

import { toast } from '@app/design-system';
import { useRouter } from 'next/navigation';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { DEFAULT_PROFILE_IMAGE } from '@/shared/lib/bunchProfile';
import type { KokPlace } from '../lib/types';
import { PLACES_MESSAGES } from '../constants/messages';
import { useBunchPlaces } from '../hooks/useBunchPlaces';
import { copyTextOf } from '../lib/places';
import { BunchPlacesScreen } from './BunchPlacesScreen';

// 하단 내비게이션이 없는 화면의 토스트 위치(Figma 4096:76391·4164:96560: 화면 아래에서 32px)
const TOAST_BOTTOM_OFFSET = 32;

type BunchPlacesProps = {
  /** 뒤로 가기 기본 이동(들어온 기록이 없을 때): 번치 메인 */
  backHref: string;
  /** 빈 상태 「피드 둘러보기」 이동: 피드 탭 */
  feedHref: string;
};

/**
 * `/bunch/places` 콕한 장소: 목록은 API 연결 전 fixture와 이 화면의 임시 상태
 * 클립보드·토스트·이동 같은 부수 효과를 소유하고 화면은 `BunchPlacesScreen`이 그림
 */
export function BunchPlaces({ backHref, feedHref }: BunchPlacesProps) {
  const router = useRouter();
  const backOr = useBackOr();
  const { members, places, remove, restore } = useBunchPlaces();

  // 클립보드 쓰기는 누른 순간에 하고(사용자 제스처), 결과 토스트는 시트가 닫힌 뒤 화면이 부름
  const copyAddress = async (place: KokPlace) => {
    try {
      await navigator.clipboard.writeText(copyTextOf(place));
      return true;
    } catch {
      // 권한 거부·비보안 컨텍스트의 복사 실패
      return false;
    }
  };

  const copyDone = (copied: boolean) => {
    if (copied) {
      toast(PLACES_MESSAGES.addressCopied, {
        icon: 'success',
        fullWidth: true,
        bottomOffset: TOAST_BOTTOM_OFFSET,
      });
    } else {
      toast(PLACES_MESSAGES.error, { fullWidth: true, bottomOffset: TOAST_BOTTOM_OFFSET });
    }
  };

  const removePlace = (place: KokPlace) => {
    remove(place.id);
    toast(PLACES_MESSAGES.removed, {
      icon: 'success',
      fullWidth: true,
      bottomOffset: TOAST_BOTTOM_OFFSET,
      action: { label: PLACES_MESSAGES.undo, onClick: () => restore(place.id) },
    });
  };

  return (
    <BunchPlacesScreen
      members={members.map((member) => ({
        ...member,
        avatarSrc: member.avatarSrc ?? DEFAULT_PROFILE_IMAGE,
      }))}
      places={places}
      onBack={() => backOr(backHref)}
      onCopyAddress={copyAddress}
      onCopyDone={copyDone}
      onRemove={removePlace}
      onBrowseFeed={() => router.push(feedHref)}
    />
  );
}
