'use client';

import { Button, ConfirmDialog, Header, LineChevronLeftLargeIcon, toast } from '@app/design-system';
import { useMemo, useState } from 'react';
import { usePreservedCallback } from 'react-simplikit';
import { countSelectedByMember, toggleSelection } from '@/features/photo-box/lib/selection';
import { ALL_MEMBERS, type PhotoBoxData } from '@/features/photo-box/lib/types';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useScreenOverlay } from '@/shared/hooks/overlay/useScreenOverlay';
import { toastAfterNavigation } from '@/shared/lib/navigation/toastAfterNavigation';
import type { DraftActions } from '../../hooks/useDraft';
import type { Draft } from '../../lib/types';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { BUNDLE_SELECT_MESSAGES } from '../../constants/selectMessages';
import {
  applySelection,
  countUnlinked,
  getInitialSelection,
  getMaxSelectable,
  getRemovedPhotos,
  isSameSelection,
} from '../../lib/photoAdd';
import { SelectPhotoList } from '../SelectPhotoList';
import { PresenceScope } from './PresenceScope';

const notify = (message: string) => toast(message);

type DraftPhotoAddProps = {
  draft: Draft;
  /** 번들에 담을 수 있는 사진의 출처인 사진함 */
  data: PhotoBoxData;
  actions: Pick<DraftActions, 'replacePhotos' | 'presence'>;
  /** 날짜 형식(올해 여부)의 기준 연도. 기본은 올해 */
  currentYear?: number | null | undefined;
  /** 변경 없이 나감(이전 화면으로) */
  onBack: () => void;
  /** 적용을 마침(작성 화면으로 돌아감) */
  onApplied: () => void;
};

/**
 * 번들 사진 추가 화면(Figma `1782:33283` 외, 기능 spec 4.3.7): 사진함 사진을 날짜별로 보며 순서대로 골라 번들 사진을 바꿈
 * 지금 번들의 사진이 선택된 채로 열리고, 풀면 번들에서 빠지며, 새로 고르면 맨 뒤에 붙음
 * 「적용하기」는 선택이 처음과 달라야 켜지고, 사진이 빠지면 확인한 뒤 적용함. 변경이 있는데 나가면 확인함
 * 다른 멤버가 편집 중인 사진은 풀 수 없고, 번들에 담을 수 있는 20장 한도는 사진함에 대응이 없는 번들 사진도 포함
 */
export function DraftPhotoAdd({
  draft,
  data,
  actions,
  currentYear,
  onBack,
  onApplied,
}: DraftPhotoAddProps) {
  const initial = useMemo(() => getInitialSelection(draft.photos), [draft.photos]);
  const [selection, setSelection] = useState<readonly string[]>(initial);
  const [memberId, setMemberId] = useState<string>(ALL_MEMBERS);
  const openOverlay = useScreenOverlay();

  const max = getMaxSelectable(draft.photos);
  const changed = !isSameSelection(initial, selection);
  // 번들에는 사진이 1장 이상 있어야 해서 모두 풀면 적용할 수 없음(기능 spec 4.3.7)
  const applicable = changed && selection.length + countUnlinked(draft.photos) > 0;
  const removed = getRemovedPhotos(draft.photos, selection);
  const selectedCounts = useMemo(
    () => (selection.length > 0 ? countSelectedByMember(selection, data.photos) : {}),
    [selection, data.photos],
  );

  const toggle = (photoId: string) => {
    const result = toggleSelection(selection, photoId, max);
    if (result.rejected) notify(BUNDLE_SELECT_MESSAGES.maxPhotos);
    else setSelection(result.selection);
  };

  const commit = usePreservedCallback(() => {
    // 연결이 끊겨 막히면 성공 안내와 화면 이동도 하지 않음(반응만 없앰, 기능 spec 4.3.14)
    if (!actions.replacePhotos(applySelection(draft.photos, selection, data.photos))) return;
    toastAfterNavigation(BUNDLE_MESSAGES.photoAddApplied);
    onApplied();
  });
  const apply = () => {
    if (!applicable) return;
    if (removed.length === 0) return commit();
    // 확인 창은 「취소」·Esc로 닫고 선택을 그대로 둠
    openOverlay((rootProps, close) => (
      <ConfirmDialog
        {...rootProps}
        title={BUNDLE_MESSAGES.photoAddRemoveTitle(removed.length)}
        description={BUNDLE_MESSAGES.photoAddRemoveDescription}
        confirmLabel={BUNDLE_MESSAGES.photoAddApply}
        cancelLabel={BUNDLE_MESSAGES.cancel}
        onConfirm={() => {
          close();
          commit();
        }}
      />
    ));
  };
  const back = () => {
    if (!changed) return onBack();
    openOverlay((rootProps, close) => (
      <ConfirmDialog
        {...rootProps}
        title={BUNDLE_MESSAGES.photoAddLeaveTitle}
        description={BUNDLE_MESSAGES.photoAddLeaveDescription}
        confirmLabel={BUNDLE_MESSAGES.photoAddLeaveConfirm}
        cancelLabel={BUNDLE_MESSAGES.cancel}
        onConfirm={() => {
          close();
          onBack();
        }}
      />
    ));
  };

  return (
    // 사진함에서 사진을 고르는 동안 사진을 작업 중으로 알림
    <PresenceScope presence={actions.presence} target="PHOTOS">
      <PageShell
        header={
          <Header
            leading={
              <HeaderIconButton label="뒤로 가기" onClick={back}>
                <LineChevronLeftLargeIcon aria-hidden="true" />
              </HeaderIconButton>
            }
          />
        }
        bottom={
          <div
            // 안전 영역은 AppFrame이 이미 띄우므로 버튼 아래 간격만
            className="bg-surface-primary border-border-tertiary pt-padding-p7 px-padding-p8 pb-s4 border-t"
          >
            <Button className="w-full" disabled={!applicable} onClick={apply}>
              {BUNDLE_MESSAGES.photoAddApply}
            </Button>
          </div>
        }
      >
        <h1 className="sr-only">{BUNDLE_MESSAGES.photoAddTitle}</h1>
        <p role="status" className="sr-only">
          {BUNDLE_SELECT_MESSAGES.selectionStatus(selection.length)}
        </p>
        <SelectPhotoList
          data={data}
          selection={selection}
          selectedCounts={selectedCounts}
          memberId={memberId}
          onMemberChange={setMemberId}
          onToggle={toggle}
          currentYear={currentYear}
        />
      </PageShell>
    </PresenceScope>
  );
}
