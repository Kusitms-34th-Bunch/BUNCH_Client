'use client';

import { Button, ConfirmDialog, Header, LineChevronLeftLargeIcon, toast } from '@app/design-system';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useScreenOverlay } from '@/shared/hooks/useScreenOverlay';
import type { BundleEditActions } from '../../hooks/useBundleEdit';
import type { Draft, DraftViewer } from '../../lib/types';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { DraftComments } from '../drafts/DraftComments';
import { DraftMembers } from '../drafts/DraftMembers';
import { DraftPhotos } from '../drafts/DraftPhotos';
import { DraftPlaceDate } from '../drafts/DraftPlaceDate';
import { DraftTitleField } from '../drafts/DraftTitleField';
import { EDIT_ACCESS } from './editAccess';

type BundleEditScreenProps = {
  draft: Draft;
  viewer: DraftViewer;
  actions: BundleEditActions;
  /** 서버에서 받은 값과 달라진 내용이 있는지(나가기 확인 여부) */
  dirty: boolean;
  /** 「저장」을 누를 수 있는지(바뀐 내용이 있고 제목이 비어 있지 않음) */
  canSave: boolean;
  /** 날짜 형식(올해 여부)의 기준 연도. 기본은 올해 */
  currentYear?: number | undefined;
  /** 뒤로 나가기를 확정했을 때(바뀐 내용이 없으면 바로, 있으면 「나가기」를 눌렀을 때) */
  onLeave: () => void;
  /** 저장 확인 창에서 「저장」을 눌렀을 때 */
  onSave: () => void;
  /** 썸네일을 눌러 사진 크게 보기로 */
  onOpenPhoto: (_photoId: string) => void;
  /** 사진 추가 시트의 「번치 사진함에서 가져오기」 */
  onImportFromBunchBox: () => void;
  /** 사진 추가 시트의 「내 갤러리에서 가져오기」(더 담을 수 있는 장수와 함께) */
  onImportFromGallery: (_maxCount: number) => void;
  /** 갤러리에서 가져오는 중이면 고른 장수(칸 로딩과 사진 작업 중 표시에 씀) */
  galleryImporting?: number | undefined;
};

const noop = () => undefined;
const noopRemove = () => false;

/**
 * 번들 수정 화면(기능 명세 6.2.12, Figma `6163:183410`): 공동 편집 화면과 같은 구성에 아래 「저장」, 헤더는 뒤로가기만
 * 참여 멤버는 보기만(X·「추가」 없음), 코멘트는 흐리게 잠가 누르면 안내만, 「픽하기 >」 없음
 * 「저장」은 바뀐 내용이 있을 때만 켜지고 확인 창을 거쳐 저장하며, 바뀐 내용이 있으면 뒤로가기도 확인함
 */
export function BundleEditScreen({
  draft,
  viewer,
  actions,
  dirty,
  canSave,
  currentYear = new Date().getFullYear(),
  onLeave,
  onSave,
  onOpenPhoto,
  onImportFromBunchBox,
  onImportFromGallery,
  galleryImporting,
}: BundleEditScreenProps) {
  const openOverlay = useScreenOverlay();

  const back = () => {
    if (!dirty) return onLeave();
    openOverlay((rootProps, close) => (
      <ConfirmDialog
        {...rootProps}
        title={BUNDLE_MESSAGES.editLeaveTitle}
        description={BUNDLE_MESSAGES.editLeaveDescription}
        confirmLabel={BUNDLE_MESSAGES.editLeaveConfirm}
        cancelLabel={BUNDLE_MESSAGES.editLeaveStay}
        onConfirm={() => {
          close();
          onLeave();
        }}
      />
    ));
  };

  const save = () => {
    if (!canSave || galleryImporting !== undefined) return;
    openOverlay((rootProps, close) => (
      <ConfirmDialog
        {...rootProps}
        title={BUNDLE_MESSAGES.editSaveTitle}
        description={BUNDLE_MESSAGES.editSaveDescription}
        confirmLabel={BUNDLE_MESSAGES.editSaveConfirm}
        cancelLabel={BUNDLE_MESSAGES.cancel}
        onConfirm={() => {
          close();
          onSave();
        }}
      />
    ));
  };

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
        // 안전 영역은 AppFrame이 이미 띄우므로 버튼 아래 간격만
        <div className="bg-surface-primary border-border-tertiary pt-padding-p7 px-padding-p8 pb-s4 border-t">
          <Button
            className="w-full"
            disabled={!canSave || galleryImporting !== undefined}
            onClick={save}
          >
            {BUNDLE_MESSAGES.editSave}
          </Button>
        </div>
      }
    >
      <h1 className="sr-only">{BUNDLE_MESSAGES.editTitle}</h1>
      <DraftMembers
        draft={draft}
        viewer={viewer}
        access={EDIT_ACCESS}
        readOnly
        onRemoveMember={noopRemove}
      />
      <DraftTitleField
        draft={draft}
        viewer={viewer}
        editable
        onChange={actions.setTitle}
        onDenied={noop}
      />
      <DraftPhotos
        draft={draft}
        access={EDIT_ACCESS}
        onOpenPhoto={onOpenPhoto}
        onRemovePhoto={actions.removePhoto}
        onMovePhoto={actions.movePhoto}
        onDragChange={actions.setPhotoDragging}
        presence={actions.presence}
        onDenied={noop}
        onImportFromBunchBox={onImportFromBunchBox}
        onImportFromGallery={onImportFromGallery}
        galleryImporting={galleryImporting}
      />
      <DraftComments
        draft={draft}
        viewer={viewer}
        editable={false}
        locked
        onChange={noop}
        onDenied={() => toast(BUNDLE_MESSAGES.commentLocked)}
      />
      <DraftPlaceDate
        draft={draft}
        actions={actions}
        editable
        participant
        currentYear={currentYear}
        onDenied={noop}
      />
    </PageShell>
  );
}
