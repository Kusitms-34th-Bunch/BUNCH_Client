'use client';

import {
  ConfirmDialog,
  cn,
  FillPhotoMediumIcon,
  LinePencilMediumIcon,
  LinePhotoMediumIcon,
  toast,
} from '@app/design-system';
import { BunchSwitchSheet, FloatingButton, MenuTabs } from '@app/design-system/web';
import { useState } from 'react';
import { PageShell } from '@/shared/components/layout/PageShell';
import type { BunchHomeActions, BunchHomeData, BunchSummary, DraftBundle } from '../lib/types';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';
import { BunchHomeHeader } from './BunchHomeHeader';
import { BunchProfile } from './BunchProfile';
import { BundleEmpty } from './BundleEmpty';
import { CompletedBundleGrid } from './CompletedBundleGrid';
import { DraftBundleList } from './DraftBundleList';

/**
 * 전환 토스트를 「+」와 같은 높이(세로 가운데)에 두기 위한 추가 간격(px, Figma `3086:67555`)
 * 「+」 중심 = 막대 영역 80 + 간격 10 + 버튼 절반 26 = 116, 토스트 절반 23을 빼고 기본 위치 16을 빼면 77
 */
// ponytail: 웹 탭 막대 기준 고정값, iOS 쉘(막대 0)에서는 더 높이 뜸. 토스트가 CSS 변수를 받으면 계산식으로 교체
const TOAST_BESIDE_FAB_OFFSET = 77;

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
};

/** 번치 탭 홈: 번치 프로필, 완성된·작성 중인 번들 탭, 번치 전환 시트, 접근 불가 번치 안내 */
export function BunchHomeScreen({
  data,
  actions,
  onCreateBundle,
  onOpenDraft,
  onAddBunch,
}: BunchHomeScreenProps) {
  const { current, bunches } = data;
  const [tab, setTab] = useState<BundleTab>('completed');
  // 번치를 한 번이라도 전환했는지(첫 진입에는 디졸브를 재생하지 않음)
  const [switched, setSwitched] = useState(false);
  // 탭을 한 번이라도 바꿨는지(첫 진입·되돌아올 때는 탭 디졸브를 재생하지 않음)
  const [tabChanged, setTabChanged] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DraftBundle | null>(null);
  // 접근 불가 번치 안내(기능명세 5.2.3). 닫히는 모션이 끝난 뒤 대상을 비워 문구 유지
  const [unavailable, setUnavailable] = useState<BunchSummary | null>(null);
  const [unavailableOpen, setUnavailableOpen] = useState(false);

  const findBunch = (id: string) => bunches.find((bunch) => bunch.id === id);
  // 삭제·내보내진 번치는 전환하지 않고 시트 위에 안내를 띄움
  const openUnavailable = (id: string) => {
    const bunch = findBunch(id);
    if (!bunch) return;
    setUnavailable(bunch);
    setUnavailableOpen(true);
  };
  const selectBunch = (id: string) => {
    const bunch = findBunch(id);
    if (!bunch) return;
    setSheetOpen(false);
    setTab('completed');
    setSwitched(true);
    actions.switchBunch(bunch.id);
    toast(BUNCH_HOME_MESSAGES.switched(bunch.name), {
      fullWidth: true,
      bottomOffset: TOAST_BESIDE_FAB_OFFSET,
    });
  };
  // 「새로운 번치 추가하기」: 시트가 다 내려간 뒤 이동(화면설계서 7-1)
  const [addAfterClose, setAddAfterClose] = useState(false);
  const addBunch = () => {
    setAddAfterClose(true);
    setSheetOpen(false);
  };

  return (
    // 브랜드 배경은 헤더·캐릭터 영역에만 두고 본문 아래 여백(탭 막대 자리)은 흰색 유지
    // 틀 배경은 위 절반 연보라·아래 절반 흰색: iOS 바운스로 내용이 밀릴 때 위는 연보라, 아래는 흰색이 드러남
    <PageShell
      data-app-background="brand-subtle-1"
      className="from-surface-brand-subtle-1 to-surface-primary bg-linear-to-b from-50% to-50%"
      header={
        <BunchHomeHeader
          bunchName={current.name}
          bunchImageSrc={current.imageSrc}
          onBunchClick={() => setSheetOpen(true)}
          switcherOpen={sheetOpen}
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
        {/* 캐릭터 영역(Figma 헤더 아래 118px + 시트 둥근 모서리 뒤 20px). 캐릭터 에셋은 아직 없어 회색 자리표시이고 흰 시트에 32px 걸침 */}
        <div className="bg-surface-brand-subtle-1 relative h-34.5 shrink-0">
          <div
            aria-hidden="true"
            className="right-s8 bg-surface-tertiary absolute top-7.5 z-10 size-30"
          />
        </div>
        <div className="bg-surface-primary rounded-t-r10 pt-padding-p16 gap-s8 relative -mt-5 flex flex-1 flex-col">
          <BunchProfile bunch={current} />
          <MenuTabs.Root
            value={tab}
            onValueChange={(value) => {
              setTabChanged(true);
              setTab(value as BundleTab);
            }}
            className="flex flex-1 flex-col"
          >
            <MenuTabs.List aria-label="번들">
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
                  onDelete={setDeleteTarget}
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

      <BunchSwitchSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onOpenChangeComplete={(open) => {
          if (open || !addAfterClose) return;
          setAddAfterClose(false);
          onAddBunch?.();
        }}
        bunches={bunches.map((bunch) => ({
          id: bunch.id,
          name: bunch.name,
          imageSrc: bunch.imageSrc,
          notificationCount: bunch.alertCount,
          status:
            bunch.access !== 'active'
              ? 'unavailable'
              : bunch.id === current.id
                ? 'current'
                : 'default',
        }))}
        onSelect={selectBunch}
        onUnavailableSelect={openUnavailable}
        onAdd={addBunch}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={BUNCH_HOME_MESSAGES.deleteDraftTitle}
        description={BUNCH_HOME_MESSAGES.deleteDraftDescription}
        cancelLabel="취소"
        confirmLabel="삭제하기"
        onConfirm={() => {
          if (deleteTarget) actions.deleteDraftBundle(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
      {/* Esc는 안내만 닫고 목록에 남김, 「번치 목록에서 삭제」만 목록에서 지움 */}
      <ConfirmDialog
        open={unavailableOpen}
        onOpenChange={setUnavailableOpen}
        onOpenChangeComplete={(open) => {
          if (!open) setUnavailable(null);
        }}
        title={unavailable ? BUNCH_HOME_MESSAGES.unavailableTitle(unavailable) : ''}
        description={unavailable ? BUNCH_HOME_MESSAGES.unavailableDescription(unavailable) : ''}
        appearance="text"
        confirmLabel="번치 목록에서 삭제"
        onConfirm={() => {
          if (unavailable) actions.removeBunch(unavailable.id);
          setUnavailableOpen(false);
        }}
      />
    </PageShell>
  );
}
