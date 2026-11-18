'use client';

import { toast } from '@app/design-system';
import { BunchSwitchSheet, type BunchSwitchItem } from '@app/design-system/web';
import { useState } from 'react';
import { usePreservedCallback } from 'react-simplikit';
import { useScreenOverlay } from '@/shared/hooks/useScreenOverlay';
import type { BunchSummary } from '../lib/types';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';
import { switchStatus } from '../lib/bunchSwitch';
import { useAccessNoticeDialog } from './useAccessNoticeDialog';

type UseBunchSwitchSheetOptions = {
  /** 지금 번치 id(전환 시트에서 「현재」로 표시) */
  currentId: string;
  /** 전환 목록. 지금 번치가 맨 위 */
  bunches: readonly BunchSummary[];
  /** 서버에 저장하고 새 번치를 받을 때까지 기다리는 전환(실패하면 reject) */
  switchBunch: (_bunchId: string) => void | Promise<void>;
  /** 접근 불가 번치를 전환 목록에서 지움(「번치 목록에서 삭제」) */
  removeBunch: (_bunchId: string) => void;
  /** 전환이 끝나 새 번치가 기본 번치가 된 뒤(전환 토스트는 이 hook이 띄움) */
  onSwitched?: ((_bunch: BunchSummary) => void) | undefined;
  /** 시트가 다 내려간 뒤 「새로운 번치 추가하기」(화면설계서 7-1) */
  onAddBunch?: (() => void) | undefined;
};

/**
 * 번치 전환 시트와 접근 불가 번치 안내를 여는 동작(번치 탭·사진함 헤더의 번치 이름 공통, 기능명세 5.2)
 * 삭제·내보내진 번치는 전환하지 않고 시트 위에 안내를 띄우고, 전환 중에 다른 번치를 또 누르면 무시함
 */
export function useBunchSwitchSheet({
  currentId,
  bunches,
  switchBunch,
  removeBunch,
  onSwitched,
  onAddBunch,
}: UseBunchSwitchSheetOptions) {
  const openOverlay = useScreenOverlay();
  // 헤더의 번치 전환 버튼에 시트가 열렸는지 알림
  const [switcherOpen, setSwitcherOpen] = useState(false);
  // 전환 중에 다른 번치를 또 누르면 무시(앞선 전환이 끝나기 전 순서가 뒤섞이지 않게)
  const [switching, setSwitching] = useState(false);

  // 시트를 연 뒤 목록이 갱신돼(번치 10개 한도 등) 바뀐 최신 동작으로 이동하도록 닫힐 때 부름
  const addBunch = usePreservedCallback(() => onAddBunch?.());

  const findBunch = (id: string) => bunches.find((bunch) => bunch.id === id);

  const openNotice = useAccessNoticeDialog();
  // 삭제·내보내진 번치는 전환하지 않고 시트 위에 안내를 띄움(닫힘 모션 동안 문구는 열 때 값으로 유지)
  // 시트가 열린 사이 목록이 갱신돼도(사진함은 전환 목록을 따로 받음) 고른 번치를 최신 목록에서 찾도록 열 때가 아니라 부를 때의 값을 씀
  const openUnavailable = usePreservedCallback((id: string) => {
    const bunch = findBunch(id);
    if (!bunch) return;
    openNotice(bunch, {
      onRemove: () => removeBunch(bunch.id),
      // 안내를 연 줄이 사라져 돌아갈 곳이 없으므로 열린 전환 시트로 초점을 옮김
      onClosed: (removed) => {
        if (removed)
          document
            .querySelector<HTMLElement>('[data-bottom-sheet]:not([data-ending-style])')
            ?.focus();
      },
    });
  });

  const selectBunch = usePreservedCallback((id: string) => {
    const bunch = findBunch(id);
    if (!bunch || switching) return;
    setSwitching(true);
    // 서버 전환은 저장·다시 읽기가 끝난 뒤 토스트, 실패하면 지금 번치에 머물고 실패 안내
    Promise.resolve(switchBunch(bunch.id))
      .then(() => {
        onSwitched?.(bunch);
        toast(BUNCH_HOME_MESSAGES.switched(bunch.name));
      })
      .catch(() => toast(BUNCH_HOME_MESSAGES.switchFailed))
      .finally(() => setSwitching(false));
  });

  // 시트가 열린 사이 목록·알림 수가 바뀌어도 최신 값으로 그림
  const switchItems = usePreservedCallback((): BunchSwitchItem[] =>
    bunches.map((bunch) => ({
      id: bunch.id,
      name: bunch.name,
      imageSrc: bunch.imageSrc,
      notificationCount: bunch.alertCount,
      status: switchStatus(bunch, currentId),
    })),
  );

  const openSwitcher = () => {
    // 「새로운 번치 추가하기」: 시트가 다 내려간 뒤 이동(화면설계서 7-1)
    let addAfterClose = false;
    setSwitcherOpen(true);
    openOverlay(
      (rootProps, close) => (
        <BunchSwitchSheet
          {...rootProps}
          onOpenChange={(open) => {
            if (!open) setSwitcherOpen(false);
            rootProps.onOpenChange(open);
          }}
          bunches={switchItems()}
          onSelect={(id) => {
            setSwitcherOpen(false);
            close();
            selectBunch(id);
          }}
          onUnavailableSelect={openUnavailable}
          onAdd={() => {
            addAfterClose = true;
            setSwitcherOpen(false);
            close();
          }}
        />
      ),
      () => {
        if (addAfterClose) addBunch();
      },
      { live: true },
    );
  };

  return { openSwitcher, switcherOpen };
}
