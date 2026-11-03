'use client';

import { Dialog, toast } from '@app/design-system';
import { useEffect, useRef } from 'react';
import type { DraftMember } from '../../lib/types';
import { BUNDLE_MESSAGES } from '../../constants/messages';

// 닫힘 전환(100ms)이 끝난 뒤에 알림과 포커스 이동을 하려는 지연
const CLOSE_TRANSITION_MS = 150;

type RemoveMemberDialogProps = {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  /** 내보낼 멤버. 닫히는 동안에도 제목의 이름이 남도록 호출하는 쪽이 대상을 유지함 */
  target: DraftMember | undefined;
  /** 「내보내기」를 눌렀을 때 */
  onConfirm: (_member: DraftMember) => void;
  /** 「내보내기」 뒤 창이 완전히 닫힌 다음(토스트와 같은 시점). 포커스를 옮길 때 씀 */
  onClosed?: ((_member: DraftMember) => void) | undefined;
};

/** 멤버 내보내기 확인 창과 「{이름}님이 번들 참여 멤버에서 제외되었어요.」 토스트(작성 화면 카드·참여 멤버 관리 화면이 같이 씀) */
export function RemoveMemberDialog({
  open,
  onOpenChange,
  target,
  onConfirm,
  onClosed,
}: RemoveMemberDialogProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // 화면을 떠나면 대기 중인 알림도 취소
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content>
        <Dialog.Title>{BUNDLE_MESSAGES.removeMemberTitle(target?.name ?? '')}</Dialog.Title>
        <Dialog.Description className="whitespace-pre-line">
          {BUNDLE_MESSAGES.removeMemberDescription(target?.name ?? '')}
        </Dialog.Description>
        <Dialog.Footer>
          <Dialog.Confirm
            variant="warning"
            className="min-w-0 flex-1"
            onClick={() => {
              if (!target) return;
              onConfirm(target);
              onOpenChange(false);
              // 모달이 열려 있는 동안은 바깥 live region 낭독과 포커스 이동이 막힐 수 있어 닫힌 뒤에 처리
              clearTimeout(timer.current);
              timer.current = setTimeout(() => {
                toast(BUNDLE_MESSAGES.memberRemoved(target.name), { fullWidth: true });
                onClosed?.(target);
              }, CLOSE_TRANSITION_MS);
            }}
          >
            {BUNDLE_MESSAGES.removeMemberConfirm}
          </Dialog.Confirm>
          <Dialog.Cancel variant="secondary" className="min-w-0 flex-1">
            {BUNDLE_MESSAGES.cancel}
          </Dialog.Cancel>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}
