'use client';

import { toast } from '@app/design-system';
import { photoUploadBridge } from '@/shared/bridge/client';
import { useScreenOverlay } from '@/shared/hooks/useScreenOverlay';
import type { SaveResult } from '../lib/types';
import { AlbumPermissionDialog } from '../components/PhotoUploadDialogs';
import { PHOTO_BOX_MESSAGES } from '../constants/messages';

/**
 * 앨범 저장을 시도하지 못했을 때(`SaveResult.blocked`)의 안내: 권한 거부면 설정 이동 창, 앱이 아니거나 이전 앱이면 토스트
 * 선택 모드와 사진 상세가 같은 안내를 쓰도록 한곳에 둠
 */
export function useSaveBlockedNotice() {
  const openOverlay = useScreenOverlay();

  // 권한 안내 창이 열리고 닫힐 때 알림(사진 상세가 창이 떠 있는 동안 방향키로 사진을 넘기지 않게 하는 용도)
  return (
    blocked: NonNullable<SaveResult['blocked']>,
    { onOpened, onClosed }: { onOpened?: () => void; onClosed?: () => void } = {},
  ) => {
    if (blocked === 'unavailable') {
      toast(PHOTO_BOX_MESSAGES.saveUnavailable);
    } else if (blocked === 'outdated') {
      toast(PHOTO_BOX_MESSAGES.uploadNeedsUpdate);
    } else {
      onOpened?.();
      openOverlay(
        (rootProps, close) => (
          <AlbumPermissionDialog
            {...rootProps}
            onOpenSettings={() => {
              // 설정 앱에서 돌아왔을 때 안내가 그대로 남지 않도록 닫고 이동
              close();
              void photoUploadBridge.openAppSettings().catch(() => undefined);
            }}
          />
        ),
        onClosed,
      );
    }
  };
}
