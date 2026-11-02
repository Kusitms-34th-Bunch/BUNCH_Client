'use client';

import { Button, ConfirmDialog, Header, LineChevronLeftLargeIcon, toast } from '@app/design-system';
import { useMemo, useState } from 'react';
import { countSelectedByMember, toggleSelection } from '@/features/photo-box/lib/selection';
import { ALL_MEMBERS, type PhotoBoxData } from '@/features/photo-box/lib/types';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import type { DraftActions } from '../hooks/useDraft';
import type { Draft, DraftViewer } from '../lib/types';
import { BUNDLE_MESSAGES } from '../constants/messages';
import { BUNDLE_SELECT_MESSAGES } from '../constants/selectMessages';
import {
  applySelection,
  countUnlinked,
  getInitialSelection,
  getMaxSelectable,
  getRemovedPhotos,
  isSameSelection,
  isSourceLocked,
} from '../lib/photoAdd';
import { SelectPhotoList } from './SelectPhotoList';

const notify = (message: string) => toast(message, { fullWidth: true });

type DraftPhotoAddProps = {
  draft: Draft;
  viewer: DraftViewer;
  /** 번들에 담을 수 있는 사진의 출처인 사진함 */
  data: PhotoBoxData;
  actions: Pick<DraftActions, 'replacePhotos'>;
  /** 날짜 형식(올해 여부)의 기준 연도. 기본은 올해 */
  currentYear?: number | undefined;
  /** 변경 없이 나감(이전 화면으로) */
  onBack: () => void;
  /** 적용을 마침(캡션 화면으로 돌아감) */
  onApplied: () => void;
};

/**
 * 번들 사진 추가 화면(Figma `1782:33283` 외, 기능 spec 4.3.7): 사진함 사진을 날짜별로 보며 순서대로 골라 번들 사진을 바꿈
 * 지금 번들의 사진이 선택된 채로 열리고, 풀면 번들에서 빠지며(캡션도 함께), 새로 고르면 맨 뒤에 붙음
 * 「적용하기」는 선택이 처음과 달라야 켜지고, 사진이 빠지면 확인한 뒤 적용함. 변경이 있는데 나가면 확인함
 * 다른 멤버가 편집 중인 사진은 풀 수 없고, 번들에 담을 수 있는 20장 한도는 사진함에 대응이 없는 번들 사진도 포함
 */
export function DraftPhotoAdd({
  draft,
  viewer,
  data,
  actions,
  currentYear,
  onBack,
  onApplied,
}: DraftPhotoAddProps) {
  const initial = useMemo(() => getInitialSelection(draft.photos), [draft.photos]);
  const [selection, setSelection] = useState<readonly string[]>(initial);
  const [memberId, setMemberId] = useState<string>(ALL_MEMBERS);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

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
    if (selection.includes(photoId) && isSourceLocked(draft, viewer, photoId)) {
      notify(BUNDLE_MESSAGES.editingBlocked);
      return;
    }
    const result = toggleSelection(selection, photoId, max);
    if (result.rejected) notify(BUNDLE_SELECT_MESSAGES.maxPhotos);
    else setSelection(result.selection);
  };

  const commit = () => {
    setRemoveOpen(false);
    // 확인 창이 떠 있는 사이 다른 멤버가 빠질 사진을 편집하기 시작했을 수 있어 적용 직전에 한 번 더 확인
    if (
      removed.some(
        (photo) => photo.sourcePhotoId && isSourceLocked(draft, viewer, photo.sourcePhotoId),
      )
    ) {
      notify(BUNDLE_MESSAGES.editingBlocked);
      return;
    }
    actions.replacePhotos(applySelection(draft.photos, selection, data.photos));
    notify(BUNDLE_MESSAGES.photoAddApplied);
    onApplied();
  };
  const apply = () => {
    if (!applicable) return;
    if (removed.length > 0) setRemoveOpen(true);
    else commit();
  };
  const back = () => (changed ? setLeaveOpen(true) : onBack());

  return (
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
          className="bg-surface-primary pt-padding-p7 px-padding-p8"
          style={{
            paddingBottom:
              'calc(var(--safe-area-bottom, env(safe-area-inset-bottom, 0px)) + var(--spacing-s4))',
          }}
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
      {/* 확인 창은 「취소」·Esc로 닫고 선택을 그대로 둠 */}
      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title={BUNDLE_MESSAGES.photoAddRemoveTitle(removed.length)}
        description={BUNDLE_MESSAGES.photoAddRemoveDescription}
        confirmLabel={BUNDLE_MESSAGES.photoAddApply}
        cancelLabel={BUNDLE_MESSAGES.cancel}
        onConfirm={commit}
        onCancel={() => setRemoveOpen(false)}
      />
      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title={BUNDLE_MESSAGES.photoAddLeaveTitle}
        description={BUNDLE_MESSAGES.photoAddLeaveDescription}
        confirmLabel={BUNDLE_MESSAGES.photoAddLeaveConfirm}
        cancelLabel={BUNDLE_MESSAGES.cancel}
        onConfirm={() => {
          setLeaveOpen(false);
          onBack();
        }}
        onCancel={() => setLeaveOpen(false)}
      />
    </PageShell>
  );
}
