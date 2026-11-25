'use client';

import { ConfirmDialog, cn } from '@app/design-system';
import { FloatingButton } from '@app/design-system/web';
import { useEffect, useRef, useState } from 'react';
import { usePreservedCallback } from 'react-simplikit';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useNativeFloatingButton } from '@/shared/hooks/native/useNativeFloatingButton';
import { useScreenOverlay } from '@/shared/hooks/overlay/useScreenOverlay';
import { onMainTabGesture } from '@/shared/lib/navigation/mainTabGesture';
import { useRefreshActiveQueries } from '@/shared/query/useRefreshActiveQueries';
import type { ListMoreQuery } from '../../lib/pages';
import type { BunchHomeActions, BunchHomeData, DraftBundle } from '../../lib/types';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { BUNCH_HOME_PATHS, followingTab } from '../../constants/paths';
import { useBunchSwitchMotion } from '../../hooks/useBunchSwitchMotion';
import { useBunchSwitchSheet } from '../../hooks/useBunchSwitchSheet';
import { BUNCH_BACKGROUNDS } from '../../lib/bunchTheme';
import { usePrefetchBunchHome } from '../../queries/bunchHome';
import { BunchHomeHeader } from '../BunchHomeHeader';
import { BunchProfile } from '../BunchProfile';
import { BunchProfileImage } from '../BunchProfileImage';
import { BundleTabsSkeleton } from './BunchHomeSkeleton';
import { type BundleTab, BundleTabs } from './BundleTabs';

const CREATE_BUNDLE_LABEL = '번들 만들기';

type BunchHomeScreenProps = {
  data: BunchHomeData;
  actions: BunchHomeActions;
  /** 「첫 번들 만들기」·「+」(번들 만들기 흐름은 번들 작성 이슈) */
  onCreateBundle?: (() => void) | undefined;
  /** 작성 중인 번들 카드를 눌렀을 때 */
  onOpenDraft?: ((_bundleId: string) => void) | undefined;
  /** 작성 중인 번들 카드에 손가락이 닿을 때 */
  onPressDraft?: ((_bundleId: string) => void) | undefined;
  /** 전환 시트의 「새로운 번치 추가하기」 */
  onAddBunch?: (() => void) | undefined;
  /** 프로필의 「콕한 장소」 버튼 */
  onOpenPlaces?: (() => void) | undefined;
  /** 완성된 번들 칸을 눌렀을 때 */
  onOpenBundle?: ((_bundleId: string) => unknown) | undefined;
  /** 칸에 손가락이 닿을 때(누르기 전에 삭제 여부 확인을 시작) */
  onPressBundle?: ((_bundleId: string) => void) | undefined;
  /** 처음 보일 번들 탭(주소 `?tab=drafts`). 번치를 전환하면 완성된 번들 탭 */
  initialTab?: BundleTab | undefined;
  /** 완성된 번들 이어서 받기 */
  completedMore?: ListMoreQuery | undefined;
  /** 번들 목록을 받는 중: 탭·번들 칸 자리표시(프로필은 실제로 그림) */
  bundlesLoading?: boolean | undefined;
};

/** 번치 탭 홈: 번치 프로필, 완성된·작성 중인 번들 탭, 번치 전환 시트, 접근 불가 번치 안내 */
export function BunchHomeScreen({
  data,
  actions,
  onCreateBundle,
  onOpenDraft,
  onPressDraft,
  onAddBunch,
  onOpenPlaces,
  onOpenBundle,
  onPressBundle,
  initialTab,
  completedMore,
  bundlesLoading = false,
}: BunchHomeScreenProps) {
  const { current, bunches } = data;
  const background = BUNCH_BACKGROUNDS[current.characterType];
  // 번치를 한 번이라도 전환했는지(첫 진입에는 디졸브를 재생하지 않음)
  const [switched, setSwitched] = useState(false);
  // 주소의 처음 탭은 처음 연 번치에만(전환 알림보다 새 번치 렌더가 먼저 와도 완성된 번들 탭부터)
  const [firstBunchId] = useState(current.id);
  const openOverlay = useScreenOverlay();
  const refresh = useRefreshActiveQueries();
  // iOS 26 이상 쉘은 「+」를 네이티브 Liquid Glass로 그리고 웹 버튼은 그리지 않음
  const showWebCreateButton = useNativeFloatingButton({
    tab: 'bunch',
    icon: 'add',
    label: CREATE_BUNDLE_LABEL,
    onPress: onCreateBundle,
  });

  // 번치 전환 모션(인스타 계정 전환처럼, motion.md). 고르는 즉시 지금 화면을 붙잡아 두고 실패하면 치움
  const contentRef = useRef<HTMLDivElement>(null);
  const switchMotion = useBunchSwitchMotion(contentRef, current.id);
  // 번치 전환 시트와 접근 불가 번치 안내(사진함 헤더와 같은 hook)
  const { openSwitcher, switcherOpen, switchTo } = useBunchSwitchSheet({
    currentId: current.id,
    bunches,
    // 화면을 붙잡은 뒤 전환(전환은 새 번치 홈을 받는 즉시 지금 번치를 바꿔 붙잡기 전에 바뀌면 모션이 빠짐)
    switchBunch: (bunchId: string) =>
      switchMotion
        .begin()
        .then(() => actions.switchBunch(bunchId))
        .catch((error: unknown) => {
          switchMotion.cancel();
          throw error;
        }),
    removeBunch: actions.removeBunch,
    onSwitched: () => setSwitched(true),
    onAddBunch,
  });
  // 번치 탭 두 번 누르기: 전환 목록의 두 번째(지금 번치 다음으로 최근에 쓴 번치, 서버 lastUsedAt 순)로 전환
  // 소속 번치가 하나뿐이면 아무것도 하지 않음. 접근 불가 번치는 access로 거름
  const recentBunchId = bunches.find(
    (bunch) => bunch.id !== current.id && bunch.access === 'active',
  )?.id;
  usePrefetchBunchHome(recentBunchId);
  const switchToRecent = usePreservedCallback(() => {
    if (recentBunchId !== undefined && !switcherOpen) switchTo(recentBunchId);
  });
  // 번치 탭 꾹 누르기: 헤더 번치 이름을 누를 때와 같은 전환 시트
  const openSwitcherOnce = usePreservedCallback(() => {
    if (!switcherOpen) openSwitcher();
  });
  useEffect(
    () =>
      onMainTabGesture((gesture) => {
        if (gesture.tab !== 'bunch') return false;
        if (gesture.kind === 'doublePress') switchToRecent();
        else openSwitcherOnce();
        return true;
      }),
    [switchToRecent, openSwitcherOnce],
  );
  // 창이 열린 사이 앞선 삭제가 끝날 수 있어 확정할 때의 최신 동작을 부름
  const deleteDraft = usePreservedCallback((id: string) => actions.deleteDraftBundle(id));
  const openDeleteDraft = (target: DraftBundle) =>
    openOverlay((rootProps, close) => (
      <ConfirmDialog
        {...rootProps}
        title={BUNCH_HOME_MESSAGES.deleteDraftTitle}
        description={BUNCH_HOME_MESSAGES.deleteDraftDescription}
        cancelLabel="취소"
        confirmLabel="삭제하기"
        onConfirm={() => {
          // 일시적 실패면 창을 유지해 다시 누를 수 있게 함(기능명세 5.3.2 예외 처리)
          void deleteDraft(target.id).then((done) => {
            if (done) close();
          });
        }}
      />
    ));
  return (
    // 성격별 배경은 헤더·프로필 이미지 영역에만 두고 본문 아래 여백(탭 막대 자리)은 흰색 유지
    // 틀 배경은 위 절반 성격 색·아래 절반 흰색: iOS 바운스로 내용이 밀릴 때 위는 성격 색, 아래는 흰색이 드러남
    <PageShell
      onRefresh={refresh}
      refreshDisabled={switcherOpen}
      data-app-background={background.app}
      data-app-background-bottom="primary"
      className={cn('to-surface-primary bg-linear-to-b from-50% to-50%', background.frame)}
      header={
        <BunchHomeHeader
          bunchName={current.name}
          onBunchClick={openSwitcher}
          switcherOpen={switcherOpen}
          className={background.top}
          hasUnreadNotifications={current.unreadCount > 0}
        />
      }
      // 「+」는 스크롤과 상관없이 고정: 본문 바로 아래의 높이 0 영역에 겹쳐 배치
      // 네이티브 버튼일 때도 높이 0 영역은 남김(PageShell이 이 영역을 토스트 기준으로 씀)
      bottom={
        <div className="relative h-0">
          {showWebCreateButton ? (
            <FloatingButton
              icon="add"
              aria-label={CREATE_BUNDLE_LABEL}
              onClick={onCreateBundle}
              className="right-s8 absolute bottom-[calc(var(--main-tab-bar-height)+var(--main-tab-bar-float-gap))] z-10"
            />
          ) : null}
        </div>
      }
    >
      {/* 번치 전환은 화면 전체 모션(useBunchSwitchMotion). 동작 줄이기 설정이면 Dissolve / Ease out / 150ms(화면설계서 7) */}
      <div
        key={current.id}
        ref={contentRef}
        className={cn(
          'relative flex min-h-full flex-col',
          switched && 'motion-reduce:animate-[page-content-in_150ms_ease-out]',
        )}
      >
        {/* 프로필 이미지는 배경 영역 밖 형제로 둠: hero가 영역마다 따로 흐리게 하면(투명도는 쌓임 맥락을 만듦) 배경 안의 이미지가 흰 시트 아래로 깔렸다가 끝나면 올라옴 */}
        <BunchProfileImage imageSrc={current.imageSrc} characterType={current.characterType} />
        {/* 프로필 이미지 영역(Figma 헤더 아래 82px + 시트 둥근 모서리 뒤 20px). 90px 프로필 이미지는 영역 위에서 24px 아래에 놓여 흰 시트에 32px 걸침 */}
        <div className={cn('h-25.5 shrink-0', background.top)} />
        <div className="bg-surface-primary rounded-t-r10 pt-padding-p16 gap-s8 relative -mt-5 flex flex-1 flex-col">
          <BunchProfile
            bunch={current}
            onPlacesClick={onOpenPlaces}
            countHrefs={{
              followerCount: BUNCH_HOME_PATHS.follows,
              followingCount: followingTab(BUNCH_HOME_PATHS.follows),
              memberCount: BUNCH_HOME_PATHS.members,
            }}
          />
          {/* 늘 있는 상태 영역에서 문구만 바꿈(새로 끼운 영역은 낭독이 안 될 수 있음) */}
          <p role="status" className="sr-only">
            {bundlesLoading ? '번들을 불러오는 중이에요' : ''}
          </p>
          {bundlesLoading ? (
            <BundleTabsSkeleton />
          ) : (
            <BundleTabs
              initialTab={switched || current.id !== firstBunchId ? 'completed' : initialTab}
              bunchId={current.id}
              onOpenBundle={onOpenBundle}
              onPressBundle={onPressBundle}
              completedMore={completedMore}
              completedBundles={current.completedBundles}
              draftBundles={current.draftBundles}
              onCreateBundle={onCreateBundle}
              onOpenDraft={onOpenDraft}
              onPressDraft={onPressDraft}
              onDeleteDraft={openDeleteDraft}
            />
          )}
        </div>
      </div>
    </PageShell>
  );
}
