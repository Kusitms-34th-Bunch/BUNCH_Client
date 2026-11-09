'use client';

import { Button, ConfirmDialog } from '@app/design-system';
import { BottomSheet, PlacePickItem, ProfileListItem } from '@app/design-system/web';
import { useState } from 'react';
import type { FeedBundleMember, FeedPlace } from '../../lib/types';
import { FEED_MESSAGES as text } from '../../constants/messages';
import { useFeedViewer } from '../../hooks/useFeedViewer';
import { DELETED_USER_IMAGE } from '../../lib/deletedUserImage';
import { subjectParticle } from '../../lib/josa';

export type BundleSheet =
  { kind: 'places'; places: FeedPlace[] } | { kind: 'members'; members: FeedBundleMember[] };

type BundleSheetsProps = {
  /** 열 시트(열 때마다 새 객체). null이면 닫음 */
  sheet: BundleSheet | null;
  onClose: () => void;
};

/**
 * 번들 카드·상세 위 시트(기능명세서 6.3.1·6.3.2, Figma `5367:112139`·`5367:112596`): 장소 콕하기와 콕 취소 확인, 참여 멤버
 * API 연결 전이라 콕은 화면에서만 바뀜(구현 단위 10). 멤버 프로필 이동은 구현 단위 8
 */
export function BundleSheets({ sheet, onClose }: BundleSheetsProps) {
  // 시트가 하단을 덮으므로 토스트는 위에
  const { viewer, asBunch } = useFeedViewer({ position: 'top' });
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [cancelTarget, setCancelTarget] = useState<FeedPlace | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  // 닫히는 동안에도 내용이 보이게 마지막 시트를 유지. 닫히는 중 다시 열리면 대기 중인 취소를 버림
  const [shown, setShown] = useState(sheet);
  if (sheet && sheet !== shown) {
    setShown(sheet);
    if (!cancelOpen) setCancelTarget(null);
  }

  const isPicked = (place: FeedPlace) =>
    viewer === null ? false : (picked[place.id] ?? place.picked);
  const setPick = (place: FeedPlace, next: boolean) =>
    setPicked((current) => ({ ...current, [place.id]: next }));
  const handleOpenChange = (next: boolean) => {
    if (!next) onClose();
  };

  return (
    <>
      <BottomSheet.Root
        open={sheet?.kind === 'places'}
        onOpenChange={handleOpenChange}
        // 시트가 다 닫힌 뒤 확인 창을 열어 초점이 위치 버튼으로 돌아가게 함
        onOpenChangeComplete={(next) => {
          if (!next && cancelTarget) setCancelOpen(true);
        }}
      >
        <BottomSheet.Content>
          <BottomSheet.Header>
            <BottomSheet.Title className="text-text-secondary">
              {text.placeSheetTitle}
            </BottomSheet.Title>
          </BottomSheet.Header>
          <BottomSheet.Body className="px-0">
            <ul>
              {shown?.kind === 'places'
                ? shown.places.map((place) => (
                    <li key={place.id}>
                      <PlacePickItem
                        name={place.name}
                        address={place.address}
                        picked={isPicked(place)}
                        onPick={() =>
                          asBunch(() => {
                            if (!isPicked(place)) {
                              setPick(place, true);
                              return;
                            }
                            setCancelTarget(place);
                            onClose();
                          })
                        }
                      />
                    </li>
                  ))
                : null}
            </ul>
          </BottomSheet.Body>
          <BottomSheet.Footer>
            <Button variant="secondary" onClick={onClose}>
              {text.sheetCancel}
            </Button>
          </BottomSheet.Footer>
        </BottomSheet.Content>
      </BottomSheet.Root>

      <BottomSheet.Root open={sheet?.kind === 'members'} onOpenChange={handleOpenChange}>
        <BottomSheet.Content>
          <BottomSheet.Header>
            <BottomSheet.Title>{text.membersSheetTitle}</BottomSheet.Title>
          </BottomSheet.Header>
          <BottomSheet.Body>
            <ul className="gap-s4 flex flex-col">
              {shown?.kind === 'members'
                ? shown.members.map((member, index) => (
                    <li key={`${member.name}-${index}`}>
                      <ProfileListItem
                        name={member.left ? text.leftMember : member.name}
                        imageSrc={member.left ? DELETED_USER_IMAGE : member.imageSrc}
                        memberRole={member.left ? undefined : member.role}
                        roleLabel={
                          !member.left && member.role ? text.roleLabels[member.role] : undefined
                        }
                      />
                    </li>
                  ))
                : null}
            </ul>
          </BottomSheet.Body>
          <BottomSheet.Footer>
            <Button variant="secondary" onClick={onClose}>
              {text.sheetCancel}
            </Button>
          </BottomSheet.Footer>
        </BottomSheet.Content>
      </BottomSheet.Root>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onOpenChangeComplete={(next) => {
          if (!next) setCancelTarget(null);
        }}
        title={text.pickCancelTitle}
        description={
          cancelTarget
            ? text.pickCancelDescription(cancelTarget.name, subjectParticle(cancelTarget.name))
            : ''
        }
        cancelLabel={text.pickCancelNo}
        confirmLabel={text.pickCancelConfirm}
        onConfirm={() => {
          if (cancelTarget) setPick(cancelTarget, false);
          setCancelOpen(false);
        }}
      />
    </>
  );
}
