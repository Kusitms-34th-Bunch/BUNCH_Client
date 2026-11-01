'use client';

import { ConfirmDialog, toast } from '@app/design-system';
import { useState } from 'react';
import { PageShell } from '@/shared/components/layout/PageShell';
import type { DraftActions } from '../hooks/useDraft';
import type { Draft, DraftViewer, SaveStatus } from '../lib/types';
import { BUNDLE_MESSAGES } from '../constants/messages';
import { getDraftAccess } from '../lib/permissions';
import { getPublishBlockers } from '../lib/publish';
import { DraftComments } from './DraftComments';
import { DraftHeader } from './DraftHeader';
import { DraftLeave } from './DraftLeave';
import { DraftMembers } from './DraftMembers';
import { DraftPhotos } from './DraftPhotos';
import { DraftPlaceDate } from './DraftPlaceDate';
import { DraftTitleField } from './DraftTitleField';
import { DraftVisibility } from './DraftVisibility';

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
  /** 업로드 조건을 모두 채운 권한자가 「업로드」를 눌렀을 때(업로드 API 연결 전에는 생략) */
  onPublish?: (() => void) | undefined;
  /** 참여 멤버 관리 화면으로 가는 「추가」 카드(해당 화면 연결 전에는 생략) */
  onAddMember?: (() => void) | undefined;
};

const notify = (message: string) => toast(message, { fullWidth: true });

/**
 * 번들 작성(공동 편집) 화면: 고정 헤더와 연결 끊김 배너 아래로 참여 멤버, 제목, 사진, 위치·날짜, 코멘트, 공개 범위, 나가기
 * 참여 멤버가 아니면 보기만 하고 고치려 하면 안내하며, 「업로드」는 권한과 필수 항목이 모두 맞을 때만 동작
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
  onPublish,
  onAddMember,
}: DraftScreenProps) {
  const [uploadConfirmOpen, setUploadConfirmOpen] = useState(false);
  const access = getDraftAccess(draft, viewer);
  const blockers = getPublishBlockers(draft, { saveStatus, offline });
  const uploadReady = access.canPublish && blockers.length === 0;

  const denyEdit = () => notify(BUNDLE_MESSAGES.editOnlyParticipants);
  const blockEditing = () => notify(BUNDLE_MESSAGES.editingBlocked);

  // 안내 순서: 참여 멤버가 아님 → 권한 없음 → 필수 항목 부족(기능 spec 4.3.12), 모두 맞으면 확인 창
  const upload = () => {
    if (!access.participant) return denyEdit();
    if (!access.canPublish) return notify(BUNDLE_MESSAGES.uploadForbidden);
    if (blockers.length > 0) return notify(BUNDLE_MESSAGES.uploadIncomplete);
    setUploadConfirmOpen(true);
  };

  return (
    <PageShell
      header={
        <DraftHeader
          saveStatus={saveStatus}
          uploadReady={uploadReady}
          offline={offline}
          onBack={onBack}
          onUpload={upload}
          onRetry={onRetry}
        />
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
      <DraftPhotos draft={draft} onEditingBlocked={blockEditing} />
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
      <DraftVisibility
        value={draft.visibility}
        editable={access.canEdit}
        onChange={actions.setVisibility}
        onDenied={denyEdit}
      />
      {access.participant && <DraftLeave onLeave={onLeave} />}
      <ConfirmDialog
        open={uploadConfirmOpen}
        onOpenChange={setUploadConfirmOpen}
        title={BUNDLE_MESSAGES.uploadConfirmTitle}
        description={BUNDLE_MESSAGES.uploadConfirmDescription}
        confirmLabel={BUNDLE_MESSAGES.upload}
        cancelLabel={BUNDLE_MESSAGES.cancel}
        onConfirm={() => {
          setUploadConfirmOpen(false);
          onPublish?.();
        }}
      />
    </PageShell>
  );
}
