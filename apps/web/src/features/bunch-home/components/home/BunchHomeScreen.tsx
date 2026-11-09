'use client';

import {
  ConfirmDialog,
  cn,
  FillPhotoMediumIcon,
  LinePencilMediumIcon,
  LinePhotoMediumIcon,
  toast,
} from '@app/design-system';
import {
  BunchSwitchSheet,
  FloatingButton,
  MenuTabs,
  type BunchSwitchItem,
} from '@app/design-system/web';
import { useState } from 'react';
import { usePreservedCallback } from 'react-simplikit';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useScreenOverlay } from '@/shared/hooks/useScreenOverlay';
import type { BunchHomeActions, BunchHomeData, DraftBundle } from '../../lib/types';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { BUNCH_HOME_PATHS, followingTab } from '../../constants/paths';
import { BUNCH_HOME_TOAST_OFFSET } from '../../constants/toast';
import { switchStatus } from '../../lib/bunchSwitch';
import { BUNCH_BACKGROUNDS } from '../../lib/bunchTheme';
import { BunchCharacter } from '../BunchCharacter';
import { BunchHomeHeader } from '../BunchHomeHeader';
import { BunchProfile } from '../BunchProfile';
import { CompletedBundleGrid } from '../CompletedBundleGrid';
import { BundleEmpty } from './BundleEmpty';
import { DraftBundleList } from './DraftBundleList';

type BundleTab = 'completed' | 'draft';

// 탭 전환 시 내용 Dissolve / Ease out / 75ms(화면설계서 3)
const panelFade = 'animate-[page-content-in_75ms_ease-out] motion-reduce:animate-none';

type BunchHomeScreenProps = {
  data: BunchHomeData;
  actions: BunchHomeActions;
  /** 「첫 번들 만들기」·「+」(번들 만들기 흐름은 번들 작성 이슈) */
  onCreateBundle?: (() => void) | undefined;
  /** 작성 중인 번들 카드를 눌렀을 때 */
  onOpenDraft?: ((_bundleId: string) => void) | undefined;
  /** 전환 시트의 「새로운 번치 추가하기」 */
  onAddBunch?: (() => void) | undefined;
  /** 프로필의 「콕한 장소」 버튼 */
  onOpenPlaces?: (() => void) | undefined;
};

/** 번치 탭 홈: 번치 프로필, 완성된·작성 중인 번들 탭, 번치 전환 시트, 접근 불가 번치 안내 */
export function BunchHomeScreen({
  data,
  actions,
  onCreateBundle,
  onOpenDraft,
  onAddBunch,
  onOpenPlaces,
}: BunchHomeScreenProps) {
  const { current, bunches } = data;
  const background = BUNCH_BACKGROUNDS[current.characterType];
  const [tab, setTab] = useState<BundleTab>('completed');
  // 번치를 한 번이라도 전환했는지(첫 진입에는 디졸브를 재생하지 않음)
  const [switched, setSwitched] = useState(false);
  // 탭을 한 번이라도 바꿨는지(첫 진입·되돌아올 때는 탭 디졸브를 재생하지 않음)
  const [tabChanged, setTabChanged] = useState(false);
  // 헤더의 번치 전환 버튼에 시트가 열렸는지 알림
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const openOverlay = useScreenOverlay();

  const findBunch = (id: string) => bunches.find((bunch) => bunch.id === id);
  // 삭제·내보내진 번치는 전환하지 않고 시트 위에 안내를 띄움(닫힘 모션 동안 문구는 열 때 값으로 유지)
  const openUnavailable = (id: string) => {
    const bunch = findBunch(id);
    if (!bunch) return;
    let removed = false;
    // Esc는 안내만 닫고 목록에 남김, 「번치 목록에서 삭제」만 목록에서 지움
    openOverlay(
      (rootProps, close) => (
        <ConfirmDialog
          {...rootProps}
          title={BUNCH_HOME_MESSAGES.unavailableTitle(bunch)}
          description={BUNCH_HOME_MESSAGES.unavailableDescription(bunch)}
          appearance="text"
          confirmLabel="번치 목록에서 삭제"
          onConfirm={() => {
            actions.removeBunch(bunch.id);
            removed = true;
            close();
          }}
        />
      ),
      () => {
        // 안내를 연 줄이 사라져 돌아갈 곳이 없으므로 열린 전환 시트로 초점을 옮김
        if (removed)
          document
            .querySelector<HTMLElement>('[data-bottom-sheet]:not([data-ending-style])')
            ?.focus();
      },
    );
  };
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
          deleteDraft(target.id);
          close();
        }}
      />
    ));
  const selectBunch = (id: string) => {
    const bunch = findBunch(id);
    if (!bunch) return;
    setTab('completed');
    setSwitched(true);
    actions.switchBunch(bunch.id);
    toast(BUNCH_HOME_MESSAGES.switched(bunch.name), {
      fullWidth: true,
      bottomOffset: BUNCH_HOME_TOAST_OFFSET,
    });
  };
  // 시트가 열린 사이 목록·알림 수가 바뀌어도 최신 값으로 그림
  const switchItems = usePreservedCallback((): BunchSwitchItem[] =>
    bunches.map((bunch) => ({
      id: bunch.id,
      name: bunch.name,
      imageSrc: bunch.imageSrc,
      notificationCount: bunch.alertCount,
      status: switchStatus(bunch, current.id),
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
        if (addAfterClose) onAddBunch?.();
      },
      { live: true },
    );
  };

  return (
    // 성격별 배경은 헤더·캐릭터 영역에만 두고 본문 아래 여백(탭 막대 자리)은 흰색 유지
    // 틀 배경은 위 절반 성격 색·아래 절반 흰색: iOS 바운스로 내용이 밀릴 때 위는 성격 색, 아래는 흰색이 드러남
    <PageShell
      data-app-background={background.app}
      data-app-background-bottom="primary"
      className={cn('to-surface-primary bg-linear-to-b from-50% to-50%', background.frame)}
      header={
        <BunchHomeHeader
          bunchName={current.name}
          onBunchClick={openSwitcher}
          switcherOpen={switcherOpen}
          className={background.top}
        />
      }
      // 「+」는 스크롤과 상관없이 고정: 본문 바로 아래의 높이 0 영역에 겹쳐 배치
      bottom={
        <div className="relative h-0">
          <FloatingButton
            icon="add"
            aria-label="번들 만들기"
            onClick={onCreateBundle}
            className="right-s8 absolute bottom-[calc(var(--main-tab-bar-height)+var(--main-tab-bar-float-gap))] z-10"
          />
        </div>
      }
    >
      {/* 번치 전환 시 새 번치 내용을 Dissolve / Ease out / 150ms로 표시(화면설계서 7). key로 다시 그려 재생 */}
      <div
        key={current.id}
        className={cn(
          'flex min-h-full flex-col',
          switched && 'animate-[page-content-in_150ms_ease-out] motion-reduce:animate-none',
        )}
      >
        {/* 캐릭터 영역(Figma 헤더 아래 118px + 시트 둥근 모서리 뒤 20px). 캐릭터는 120px 상자(Character Wrapper) 안 가로 중앙·아래 12px 위에 놓이고 상자는 흰 시트에 32px 걸침 */}
        <div className={cn('relative h-34.5 shrink-0', background.top)}>
          <BunchCharacter
            characterType={current.characterType}
            stage={current.stage}
            facilitatorTrigger
          />
        </div>
        <div className="bg-surface-primary rounded-t-r10 pt-padding-p16 gap-s8 relative -mt-5 flex flex-1 flex-col">
          <BunchProfile
            bunch={current}
            onPlacesClick={onOpenPlaces}
            countHrefs={{
              followerCount: BUNCH_HOME_PATHS.follows,
              followingCount: followingTab(BUNCH_HOME_PATHS.follows),
            }}
          />
          <MenuTabs.Root
            value={tab}
            onValueChange={(value) => {
              setTabChanged(true);
              setTab(value as BundleTab);
            }}
            className="flex flex-1 flex-col"
          >
            <MenuTabs.List aria-label="번들" variant="icon">
              <MenuTabs.IconTab
                value="completed"
                label="완성된 번들"
                className="flex-1"
                icon={<LinePhotoMediumIcon />}
                selectedIcon={<FillPhotoMediumIcon />}
              />
              {/* 채운 연필 아이콘이 디자인 시스템에 없어 선택 여부는 색과 밑줄로만 구분 */}
              <MenuTabs.IconTab
                value="draft"
                label="작성 중인 번들"
                className="flex-1"
                icon={<LinePencilMediumIcon />}
                selectedIcon={<LinePencilMediumIcon />}
              />
            </MenuTabs.List>
            {/* 탭 전환 시 내용도 Dissolve / Ease out / 75ms(화면설계서 3번) */}
            {/* 페이드는 들어오는 패널에만(나가는 패널에도 붙이면 첫 전환에 이전 내용이 0부터 다시 나타나고 Base UI가 그 애니메이션을 기다려 두 패널이 겹침) */}
            <MenuTabs.Panel
              value="completed"
              className={cn(tabChanged && tab === 'completed' && panelFade)}
            >
              {current.completedBundles.length > 0 ? (
                <CompletedBundleGrid bundles={current.completedBundles} />
              ) : (
                <div className="pt-s24">
                  <BundleEmpty
                    title={BUNCH_HOME_MESSAGES.completedEmptyTitle}
                    showCreateButton
                    onCreateBundle={onCreateBundle}
                  />
                </div>
              )}
            </MenuTabs.Panel>
            <MenuTabs.Panel
              value="draft"
              className={cn('pt-s8', tabChanged && tab === 'draft' && panelFade)}
            >
              {current.draftBundles.length > 0 ? (
                <DraftBundleList
                  bundles={current.draftBundles}
                  onOpen={onOpenDraft}
                  onDelete={openDeleteDraft}
                />
              ) : (
                <div className="pt-s24">
                  <BundleEmpty title={BUNCH_HOME_MESSAGES.draftEmptyTitle} />
                </div>
              )}
            </MenuTabs.Panel>
          </MenuTabs.Root>
        </div>
      </div>
    </PageShell>
  );
}
