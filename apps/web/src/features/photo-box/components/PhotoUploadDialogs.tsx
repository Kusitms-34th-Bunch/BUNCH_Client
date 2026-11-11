'use client';

import { Dialog } from '@app/design-system';
import type { ScreenOverlayProps } from '@/shared/hooks/useScreenOverlay';
import { PHOTO_BOX_MESSAGES } from '../constants/messages';

type CameraPermissionDialogProps = ScreenOverlayProps & {
  /** 「설정 열기」: 앱의 시스템 설정 화면으로 이동 */
  onOpenSettings: () => void;
};

/** 카메라 권한이 거부되어 있을 때의 안내 창(기능명세서 3.2.3): 「취소」/「설정 열기」 */
export function CameraPermissionDialog({
  onOpenSettings,
  ...rootProps
}: CameraPermissionDialogProps) {
  return (
    <Dialog.Root {...rootProps}>
      <Dialog.Content>
        <Dialog.Title>{PHOTO_BOX_MESSAGES.cameraPermissionTitle}</Dialog.Title>
        <Dialog.Description>{PHOTO_BOX_MESSAGES.cameraPermissionDescription}</Dialog.Description>
        <Dialog.Footer>
          <Dialog.Cancel variant="secondary">취소</Dialog.Cancel>
          <Dialog.Confirm variant="primary" onClick={onOpenSettings}>
            {PHOTO_BOX_MESSAGES.openSettings}
          </Dialog.Confirm>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}
