'use client';

import { ConfirmDialog, toast } from '@app/design-system';
import { BundleMembersSheet } from '@app/design-system/web';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { usePreservedCallback } from 'react-simplikit';
import { useScreenOverlay } from '@/shared/hooks/useScreenOverlay';
import { playHaptic } from '@/shared/lib/haptic';
import { useQueryClientScope } from '@/shared/query/useQueryClientScope';
import type { FeedBundleMember, FeedPlace } from '../lib/types';
import { PlacePickOverlay } from '../components/bundles/PlacePickOverlay';
import { FEED_MESSAGES as text } from '../constants/messages';
import { FEED_PATHS } from '../constants/paths';
import { DELETED_USER_IMAGE } from '../lib/deletedUserImage';
import { subjectParticle } from '../lib/josa';
import { useKokMutation, useLoadBundleKoks } from '../queries/kok';
import { useFeedViewer } from './useFeedViewer';

/**
 * 번들 카드·상세 위 시트(기능명세서 6.3.1·6.3.2, Figma `5367:112139`·`5367:112596`): 장소 콕하기와 콕 취소 확인, 참여 멤버
 * 콕 여부는 서버(명세 021), 콕하기·콕 취소는 명세 010·009. 멤버를 누르면 시트가 닫힌 뒤 멤버 프로필로 이동
 */
export function useBundleSheets() {
  const router = useRouter();
  const openOverlay = useScreenOverlay();
  // 시트가 하단을 덮으므로 토스트는 위에
  const { viewer, asBunch } = useFeedViewer({ position: 'top' });
  const kok = useKokMutation();
  const loadKoks = useLoadBundleKoks();
  // overlay root가 Query provider 밖일 때(테스트 등)도 시트가 같은 client를 읽게 감쌈
  const withQueryClient = useQueryClientScope();
  // 확인 창이 닫힌 뒤 다시 열 때도 그 시점의 명의로 그리고 보내도록 열 때마다 최신 값을 읽음
  const viewerId = usePreservedCallback(() =>
    viewer === undefined ? undefined : (viewer?.bunchId ?? null),
  );
  // 콕하기 실패는 버튼이 「콕하기」로, 콕 취소 실패는 장소가 그대로(되돌림과 안내는 mutation)
  const sendKok = (vars: Parameters<typeof kok.mutate>[0]) => {
    // 콕하기를 누를 때만 햅틱(콕 취소는 없음, Figma 햅틱 모음)
    if (vars.pin) playHaptic('tap');
    kok.mutate(vars);
  };

  // 콕 취소 확인 창(화면설계서 피드 2번): 무엇을 고르든 창이 다 닫힌 뒤 콕하기 시트를 다시 올려 이어서 고르게 함
  // 시트를 연 명의(openedAs)로만 보냄. 그사이 명의가 바뀌었으면 보내지 않고, 다시 올리는 시트가 새 명의로 받음
  const openPickCancel = (
    bundleId: string,
    place: FeedPlace,
    pinId: number,
    places: FeedPlace[],
    openedAs: string | null,
  ) =>
    openOverlay(
      (rootProps, close) => (
        <ConfirmDialog
          {...rootProps}
          title={text.pickCancelTitle}
          description={text.pickCancelDescription(place.name, subjectParticle(place.name))}
          cancelLabel={text.pickCancelNo}
          confirmLabel={text.pickCancelConfirm}
          onConfirm={() => {
            if (viewerId() === openedAs) {
              sendKok({ bundleId, viewerId: openedAs, locationId: place.id, pin: false, pinId });
            }
            close();
          }}
        />
      ),
      () => openPlaces(bundleId, places),
    );

  const asLatestBunch = usePreservedCallback(asBunch);

  // 콕 여부를 받은 뒤에 시트를 엶(받는 중 「콕하기」로 보여 잘못 누르지 않게). 받지 못하면 안내, 다시 누르면 다시 받음
  const opening = useRef(false);
  // 받는 동안 화면을 떠났으면 열지 않음(떠난 화면의 시트가 다음 화면에 남지 않게)
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const loadAndShowPlaces = async (bundleId: string, places: FeedPlace[]) => {
    if (opening.current || viewerId() === undefined) return;
    opening.current = true;
    try {
      // 받는 사이 명의가 바뀌었으면 새 명의로 다시 받음(연 시트는 늘 그 명의의 콕 여부)
      let id = viewerId();
      while (id !== undefined) {
        await loadKoks(bundleId, id);
        if (viewerId() === id) break;
        id = viewerId();
      }
      if (mounted.current && id !== undefined) showPlaces(bundleId, places, id);
    } catch {
      if (mounted.current) toast(text.actionFailed, { position: 'top' });
    } finally {
      opening.current = false;
    }
  };
  const openPlaces = (bundleId: string, places: FeedPlace[]) =>
    void loadAndShowPlaces(bundleId, places);

  // 연 시트는 명의가 바뀌어도 다시 그려지지 않으므로(overlay는 열 때의 값), 바뀐 뒤 누르면 보내지 않고 닫음
  function showPlaces(bundleId: string, places: FeedPlace[], openedAs: string | null) {
    let cancelTarget: { place: FeedPlace; pinId: number } | undefined;
    openOverlay(
      (rootProps, close) =>
        withQueryClient(
          <PlacePickOverlay
            {...rootProps}
            bundleId={bundleId}
            viewerId={openedAs}
            places={places}
            asBunch={asLatestBunch}
            onPick={(place) => {
              if (viewerId() !== openedAs) return close();
              sendKok({ bundleId, viewerId: openedAs, locationId: place.id, pin: true });
            }}
            onCancelPick={(place, pinId) => {
              if (viewerId() === openedAs) cancelTarget = { place, pinId };
              close();
            }}
          />,
        ),
      // 시트가 다 닫힌 뒤 확인 창을 열어 초점이 위치 버튼으로 돌아가게 함
      () => {
        if (cancelTarget) {
          openPickCancel(bundleId, cancelTarget.place, cancelTarget.pinId, places, openedAs);
        }
      },
    );
  }

  const openMembers = (members: FeedBundleMember[]) => {
    let memberHref: string | undefined;
    openOverlay(
      (rootProps, close) => (
        <BundleMembersSheet
          {...rootProps}
          members={members.map((member) => {
            if (member.left) return { name: text.leftMember, imageSrc: DELETED_USER_IMAGE };
            const href = member.id ? FEED_PATHS.member(member.id) : undefined;
            return {
              name: member.name,
              imageSrc: member.imageSrc,
              memberRole: member.role,
              roleLabel: member.role ? text.roleLabels[member.role] : undefined,
              renderLink: href
                ? ({ className, children }) => (
                    <Link
                      href={href}
                      className={className}
                      onClick={(event) => {
                        // 새 탭 열기 같은 보조 키 클릭은 링크 기본 동작대로
                        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
                          return;
                        event.preventDefault();
                        memberHref = href;
                        close();
                      }}
                    >
                      {children}
                    </Link>
                  )
                : undefined,
            };
          })}
        />
      ),
      // 시트가 다 닫힌 뒤 이동해 전환 중 시트가 남지 않게 함
      () => {
        if (memberHref) router.push(memberHref);
      },
    );
  };

  return { openPlaces, openMembers };
}
