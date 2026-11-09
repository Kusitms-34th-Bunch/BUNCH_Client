'use client';

import { Button, ConfirmDialog, toast } from '@app/design-system';
import { useState } from 'react';
import { PageShell } from '@/shared/components/layout/PageShell';
import type { DraftActions } from '../../hooks/useDraft';
import type { Draft, DraftViewer, SaveStatus } from '../../lib/types';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { getDraftAccess, isDraftCreator } from '../../lib/permissions';
import { getPublishBlockers, hasOtherEditors } from '../../lib/publish';
import { DraftComments } from './DraftComments';
import { DraftHeader } from './DraftHeader';
import { DraftMembers } from './DraftMembers';
import { DraftPhotos } from './DraftPhotos';
import { DraftPlaceDate } from './DraftPlaceDate';
import { DraftTitleField } from './DraftTitleField';
import { LeaveDraftDialog } from './LeaveDraftDialog';

type DraftScreenProps = {
  draft: Draft;
  viewer: DraftViewer;
  saveStatus: SaveStatus;
  /** 연결 끊김 배너를 보일지(보이는 동안 업로드 제한) */
  offline: boolean;
  actions: DraftActions;
  /** 날짜 형식(올해 여부)의 기준 연도. 기본은 올해 */
  currentYear?: number | undefined;
  onBack: () => void;
  /** 나가기 확인 창에서 「나가기」를 눌렀을 때 */
  onLeave: () => void;
  onRetry: () => void;
  /** 업로드 조건을 모두 채운 권한자가 「업로드」를 눌렀을 때(공개 범위 화면으로 이동. 연결 전에는 생략) */
  onUpload?: (() => void) | undefined;
  /** 참여 멤버 관리 화면으로 가는 「추가」 카드(해당 화면 연결 전에는 생략) */
  onAddMember?: (() => void) | undefined;
  /** 사진이나 캡션을 눌렀을 때(그 사진의 캡션 화면으로 이동하는 호출 지점) */
  onOpenPhoto?: ((_photoId: string) => void) | undefined;
};

const notify = (message: string) => toast(message, { fullWidth: true });

/**
 * 번들 작성(공동 편집) 화면: 고정 헤더와 연결 끊김 배너 아래로 참여 멤버, 제목, 사진, 코멘트, 위치·날짜(Figma `5664:100786`)
 * 헤더 「⋯」의 「번들 나가기」, 아래 고정 「업로드」는 권한과 필수 항목이 모두 맞을 때만 동작(공개 범위는 다음 화면에서 고름)
 * 참여 멤버가 아니면 보기만 하고 고치려 하면 안내
 */
export function DraftScreen({
  draft,
  viewer,
  saveStatus,
  offline,
  actions,
  currentYear = new Date().getFullYear(),
  onBack,
  onLeave,
  onRetry,
  onUpload,
  onAddMember,
  onOpenPhoto,
}: DraftScreenProps) {
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [editingDialogOpen, setEditingDialogOpen] = useState(false);
  const access = getDraftAccess(draft, viewer);
  // 공개 범위는 업로드를 누른 뒤 다음 화면에서 고르므로 이 화면의 조건에서는 뺌
  const blockers = getPublishBlockers(draft, { saveStatus, offline }).filter(
    (blocker) => blocker !== 'visibility',
  );
  const uploadReady = access.canPublish && blockers.length === 0;

  const denyEdit = () => notify(BUNDLE_MESSAGES.editOnlyParticipants);
  const blockEditing = () => notify(BUNDLE_MESSAGES.editingBlocked);

  // 안내 순서: 참여 멤버가 아님 → 권한 없음 → 필수 항목 부족(기능 spec 4.3.12), 막혔으면 안내하고 true
  const blockUpload = () => {
    if (!access.participant) denyEdit();
    else if (!access.canPublish) notify(BUNDLE_MESSAGES.uploadForbidden);
    // 저장이 끝나지 않아 막힌 경우는 입력 부족과 다른 안내
    else if (blockers.includes('unsaved')) notify(BUNDLE_MESSAGES.uploadUnsaved);
    else if (blockers.length === 1 && blockers[0] === 'saving')
      notify(BUNDLE_MESSAGES.uploadSaving);
    else if (blockers.length > 0) notify(BUNDLE_MESSAGES.uploadIncomplete);
    else return false;
    return true;
  };
  // 나 말고 편집 중인 멤버가 있으면 확인 창을 거치고(계속하기), 아니면 바로 공개 범위 화면으로
  const upload = () => {
    if (blockUpload()) return;
    if (hasOtherEditors(draft.editing, viewer.memberId)) setEditingDialogOpen(true);
    else onUpload?.();
  };

  return (
    <PageShell
      header={
        <DraftHeader
          saveStatus={saveStatus}
          offline={offline}
          canLeave={access.participant}
          onBack={onBack}
          onLeave={() => setLeaveOpen(true)}
          onRetry={onRetry}
        />
      }
      bottom={
        // 안전 영역은 AppFrame이 이미 띄우므로 버튼 아래 간격만
        <div className="bg-surface-primary pt-padding-p7 px-padding-p8 pb-s4">
          {/* 조건을 못 채우면 흐리게 두되 눌렀을 때 이유를 안내하도록 disabled 대신 aria-disabled */}
          <Button
            className="aria-disabled:bg-surface-disabled aria-disabled:text-text-disabled w-full aria-disabled:cursor-not-allowed"
            aria-disabled={uploadReady ? undefined : true}
            onClick={upload}
          >
            {BUNDLE_MESSAGES.upload}
          </Button>
        </div>
      }
    >
      <h1 className="sr-only">번들 작성</h1>
      <DraftMembers
        draft={draft}
        viewer={viewer}
        access={access}
        onAddMember={onAddMember}
        onRemoveMember={actions.removeMember}
      />
      <DraftTitleField
        draft={draft}
        editable={access.canEdit}
        onChange={actions.setTitle}
        onDenied={denyEdit}
        onEditingBlocked={blockEditing}
      />
      <DraftPhotos draft={draft} onEditingBlocked={blockEditing} onOpenPhoto={onOpenPhoto} />
      <DraftPlaceDate
        draft={draft}
        actions={actions}
        editable={access.canEdit}
        currentYear={currentYear}
        onDenied={denyEdit}
        onEditingBlocked={blockEditing}
      />
      <DraftComments
        draft={draft}
        viewer={viewer}
        editable={access.canEdit}
        onChange={actions.setComment}
        onDenied={denyEdit}
      />
      <LeaveDraftDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        onConfirm={onLeave}
        creator={isDraftCreator(draft, viewer)}
      />
      {/* 나 말고 편집 중인 멤버가 있을 때만(Figma `5699:106129`), 「계속하기」를 눌러야 공개 범위 화면으로 감 */}
      <ConfirmDialog
        open={editingDialogOpen}
        onOpenChange={setEditingDialogOpen}
        title={BUNDLE_MESSAGES.uploadEditingTitle}
        description={BUNDLE_MESSAGES.uploadEditingDescription}
        confirmLabel={BUNDLE_MESSAGES.uploadEditingContinue}
        cancelLabel={BUNDLE_MESSAGES.cancel}
        onConfirm={() => {
          setEditingDialogOpen(false);
          // 창이 열려 있는 사이 멤버·연결·저장 상태가 바뀌었을 수 있어 넘어가기 전에 한 번 더 검사
          if (!blockUpload()) onUpload?.();
        }}
      />
    </PageShell>
  );
}
