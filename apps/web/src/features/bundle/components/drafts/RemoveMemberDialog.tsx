'use client';

import { Dialog, toast } from '@app/design-system';
import { useScreenOverlay } from '@/shared/hooks/useScreenOverlay';
import type { DraftMember } from '../../lib/types';
import { BUNDLE_MESSAGES } from '../../constants/messages';

/** 멤버 내보내기 확인 창과 「{이름}님이 번들 참여 멤버에서 제외되었어요.」 토스트(작성 화면 카드·참여 멤버 관리 화면이 같이 씀) */
export function useRemoveMemberDialog() {
  const openOverlay = useScreenOverlay();
  return (
    target: DraftMember,
    /** 「내보내기」를 눌렀을 때 */
    onConfirm: (_member: DraftMember) => void,
    /** 「내보내기」 뒤 창이 완전히 닫힌 다음(토스트와 같은 시점). 포커스를 옮길 때 씀 */
    onClosed?: (_member: DraftMember) => void,
  ) => {
    let confirmed = false;
    openOverlay(
      (rootProps, close) => (
        <Dialog.Root {...rootProps}>
          <Dialog.Content>
            <Dialog.Title>{BUNDLE_MESSAGES.removeMemberTitle(target.name)}</Dialog.Title>
            <Dialog.Description className="whitespace-pre-line">
              {BUNDLE_MESSAGES.removeMemberDescription(target.name)}
            </Dialog.Description>
            <Dialog.Footer>
              <Dialog.Confirm
                variant="warning"
                onClick={() => {
                  onConfirm(target);
                  confirmed = true;
                  close();
                }}
              >
                {BUNDLE_MESSAGES.removeMemberConfirm}
              </Dialog.Confirm>
              <Dialog.Cancel variant="secondary">{BUNDLE_MESSAGES.cancel}</Dialog.Cancel>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Root>
      ),
      // 모달이 열려 있는 동안은 바깥 live region 낭독과 포커스 이동이 막힐 수 있어 닫힌 뒤에 처리
      () => {
        if (!confirmed) return;
        toast(BUNDLE_MESSAGES.memberRemoved(target.name), { fullWidth: true });
        onClosed?.(target);
      },
    );
  };
}
