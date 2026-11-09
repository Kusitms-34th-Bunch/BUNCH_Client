'use client';

import { LineDotsLargeIcon, LineTransitionLeftMediumIcon } from '@app/design-system';
import { IconButton } from '@app/design-system/web';
import { useRef, useState, type CSSProperties } from 'react';
import {
  PhotoActionMenu,
  type PhotoActionMenuItem,
} from '@/features/photo-box/components/PhotoActionMenu';
import { BUNDLE_MESSAGES } from '../../constants/messages';

type DraftMenuAction = 'leave';

const LEAVE: PhotoActionMenuItem<DraftMenuAction> = {
  id: 'leave',
  label: BUNDLE_MESSAGES.leaveMenuItem,
  icon: <LineTransitionLeftMediumIcon aria-hidden="true" />,
  tone: 'warning',
};

// 헤더 아래에서 열리므로 위에서 아래로 내려오며 열림(사진 상세 더보기와 같은 모션)
const DOWNWARD_MOTION = { '--menu-motion-offset': '-38px' } as CSSProperties;

type DraftMenuProps = {
  /** 「번들 나가기」를 골랐을 때(확인 창은 호출하는 쪽이 엶) */
  onLeave: () => void;
};

/**
 * 작성 화면 헤더 오른쪽 「⋯」 더보기(Figma `5699:105934`): 「번들 나가기」 하나
 * 메뉴는 닫히는 모션이 끝날 때까지 화면에 남기므로 열림과 마운트를 따로 둠
 * 위치는 가까운 `relative` 조상(헤더 래퍼) 기준으로 헤더 바로 아래 오른쪽
 */
export function DraftMenu({ onLeave }: DraftMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    setMounted(true);
    setOpen(true);
  };

  return (
    <>
      <IconButton
        ref={triggerRef}
        aria-label={BUNDLE_MESSAGES.menuOpenLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        // 터치 영역(양옆 8px)이 화면 가장자리에서 16px 안쪽에 아이콘이 오도록 바깥으로 뺌
        className="-mr-s4"
        onClick={toggle}
      >
        <LineDotsLargeIcon aria-hidden="true" />
      </IconButton>
      {mounted ? (
        <div className="right-s8 absolute top-full z-20">
          <PhotoActionMenu
            label={BUNDLE_MESSAGES.menuLabel}
            items={[LEAVE]}
            style={DOWNWARD_MOTION}
            open={open}
            onClose={() => setOpen(false)}
            onExited={() => setMounted(false)}
            onSelect={onLeave}
            triggerRef={triggerRef}
          />
        </div>
      ) : null}
    </>
  );
}
