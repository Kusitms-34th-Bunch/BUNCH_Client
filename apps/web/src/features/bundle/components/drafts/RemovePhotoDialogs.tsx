'use client';

import { ConfirmDialog, Dialog } from '@app/design-system';
import { useScreenOverlay } from '@/shared/hooks/useScreenOverlay';
import type { RemovePhotoKind } from '../../lib/photos';
import { BUNDLE_MESSAGES } from '../../constants/messages';

type RemovePhotoDialogOptions = {
  kind: RemovePhotoKind;
  /** 지우려는 사진을 멤버가 픽했는지(픽도 함께 삭제된다는 문구). 창이 열린 동안 바뀌면 문구도 바뀜 */
  isPicked: () => boolean;
  /** 「삭제하기」로 확정했을 때 */
  onConfirm: () => void;
  /** 창이 다 닫혔을 때. 「삭제하기」로 닫혔는지를 함께 알림 */
  onClosed?: (_confirmed: boolean) => void;
};

/**
 * 사진 빼기 확인 창(캡션 화면 X와 크게 보기 ⋯ 「삭제」가 같이 씀, 기능 spec 4.3.5)
 * 마지막 한 장이면 「확인」만 있는 안내 창(Figma `2082:49108`), 아니면 항상 삭제 확인 창(Figma `4850:62115`, 캡션 유무와 상관없음)
 */
export function useRemovePhotoDialog() {
  const openOverlay = useScreenOverlay();
  return ({ kind, isPicked, onConfirm, onClosed }: RemovePhotoDialogOptions) => {
    let confirmed = false;
    openOverlay(
      (rootProps, close) =>
        kind === 'last' ? (
          <ConfirmDialog
            {...rootProps}
            appearance="text"
            title={BUNDLE_MESSAGES.removePhotoBlockedTitle}
            description={BUNDLE_MESSAGES.removePhotoBlockedDescription}
            confirmLabel={BUNDLE_MESSAGES.removePhotoBlockedConfirm}
            onConfirm={close}
          />
        ) : (
          <Dialog.Root {...rootProps}>
            <Dialog.Content>
              <Dialog.Title>
                {isPicked()
                  ? BUNDLE_MESSAGES.removePickedTitle
                  : BUNDLE_MESSAGES.removeConfirmTitle}
              </Dialog.Title>
              <Dialog.Description>
                {isPicked()
                  ? BUNDLE_MESSAGES.removePickedDescription
                  : BUNDLE_MESSAGES.removeConfirmDescription}
              </Dialog.Description>
              <Dialog.Footer>
                <Dialog.Confirm
                  variant="warning"
                  onClick={() => {
                    confirmed = true;
                    close();
                    onConfirm();
                  }}
                >
                  {BUNDLE_MESSAGES.removeConfirmConfirm}
                </Dialog.Confirm>
                <Dialog.Cancel variant="secondary">{BUNDLE_MESSAGES.cancel}</Dialog.Cancel>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Root>
        ),
      () => onClosed?.(confirmed),
      // 창이 열린 사이 픽이 바뀌면 문구도 바뀜
      { live: true },
    );
  };
}
