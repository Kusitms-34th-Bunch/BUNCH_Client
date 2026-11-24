import {
  FillPencilMediumIcon,
  FillPhotoMediumIcon,
  LinePencilMediumIcon,
  LinePhotoMediumIcon,
} from '@app/design-system';
import { MenuTabs } from '@app/design-system/web';
import { useEffect, useRef, useState } from 'react';
import { readHistoryEntry, writeHistoryEntry } from '@/shared/lib/navigation/historyEntry';
import type { ListMoreQuery } from '../../lib/pages';
import type { CompletedBundle, DraftBundle } from '../../lib/types';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { TAB_SLIDE_PANEL_CLASS, useTabSlideMotion } from '../../hooks/useTabSlideMotion';
import { CompletedBundleGrid } from '../CompletedBundleGrid';
import { ListMore } from '../ListMore';
import { BundleEmpty } from './BundleEmpty';
import { DraftBundleList } from './DraftBundleList';

export type BundleTab = 'completed' | 'draft';

// 탭 순서(밀기 방향: 오른쪽 탭으로 가면 새 패널이 오른쪽에서 들어옴)
const TAB_ORDER: readonly BundleTab[] = ['completed', 'draft'];

// 고른 탭을 이 화면의 history 항목에 번치 id와 함께 둠: 작성 중인 번들 등에서 뒤로 돌아오면 그 탭으로, 새로 들어오면 처음 탭으로
// 번치 id가 다르면(그사이 번치를 바꿈) 쓰지 않음
const HISTORY_KEY = 'bunchBundleTab';
const readHistoryTab = (bunchId: string): BundleTab | undefined => {
  const saved = readHistoryEntry(HISTORY_KEY) as { bunchId?: unknown; tab?: unknown } | undefined;
  return saved?.bunchId === bunchId && (saved.tab === 'completed' || saved.tab === 'draft')
    ? saved.tab
    : undefined;
};
const writeHistoryTab = (bunchId: string, tab: BundleTab) => {
  writeHistoryEntry({ [HISTORY_KEY]: { bunchId, tab } });
};

type BundleTabsProps = {
  /** 처음 보일 탭(알림에서 「작성 중인 번들」로 바로 들어옴, 5.12.2) */
  initialTab?: BundleTab | undefined;
  /** 지금 번치(번들 상세 주소에 씀) */
  bunchId: string;
  /** 완성된 번들 칸을 눌렀을 때 */
  onOpenBundle?: ((_bundleId: string) => unknown) | undefined;
  /** 칸에 손가락이 닿을 때(누르기 전에 삭제 여부 확인을 시작) */
  onPressBundle?: ((_bundleId: string) => void) | undefined;
  /** 완성된 번들 이어서 받기(없으면 받은 것만) */
  completedMore?: ListMoreQuery | undefined;
  completedBundles: readonly CompletedBundle[];
  draftBundles: readonly DraftBundle[];
  onCreateBundle?: (() => void) | undefined;
  onOpenDraft?: ((_bundleId: string) => void) | undefined;
  /** 작성 중인 번들 카드에 손가락이 닿을 때 */
  onPressDraft?: ((_bundleId: string) => void) | undefined;
  /** 작성 중인 번들 삭제 버튼(확인 창은 화면이 띄움) */
  onDeleteDraft: (_bundle: DraftBundle) => void;
};

/** 번치 홈의 완성된·작성 중인 번들 탭과 빈 상태. 번치를 전환하면 화면이 key로 다시 그려 처음 탭부터 */
export function BundleTabs({
  initialTab = 'completed',
  bunchId,
  onOpenBundle,
  onPressBundle,
  completedMore,
  completedBundles,
  draftBundles,
  onCreateBundle,
  onOpenDraft,
  onPressDraft,
  onDeleteDraft,
}: BundleTabsProps) {
  const [tab, setTab] = useState<BundleTab>(() => readHistoryTab(bunchId) ?? initialTab);
  // 처음 그릴 때의 탭도 적어 둠: 번치를 전환하면 새 번치의 탭으로 덮여, 앞 번치로 다시 전환해 돌아와도 예전 탭이 살아나지 않음(번치 전환은 완성된 번들 탭부터)
  // 번치마다 key로 다시 그려 bunchId는 이 인스턴스에서 바뀌지 않음. 이후 탭 변경은 onValueChange가 적음
  const firstTab = useRef(tab);
  useEffect(() => {
    writeHistoryTab(bunchId, firstTab.current);
  }, [bunchId]);
  const gridRef = useRef<HTMLUListElement>(null);
  // 탭 전환: 패널이 밑줄과 같은 방향으로 좌우로 밀림(화면설계서 3의 75ms 디졸브 대신, motion.md)
  const panelsRef = useRef<HTMLDivElement>(null);
  const slide = useTabSlideMotion(panelsRef, tab);
  return (
    <MenuTabs.Root
      value={tab}
      onValueChange={(value) => {
        const next = value as BundleTab;
        if (next === tab) return;
        slide.begin(TAB_ORDER.indexOf(next) > TAB_ORDER.indexOf(tab) ? 1 : -1);
        setTab(next);
        writeHistoryTab(bunchId, value as BundleTab);
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
        <MenuTabs.IconTab
          value="draft"
          label="작성 중인 번들"
          className="flex-1"
          icon={<LinePencilMediumIcon />}
          selectedIcon={<FillPencilMediumIcon />}
        />
      </MenuTabs.List>
      {/* 밀기 동안 나가는 패널이 이 틀 안에 겹쳐 남음(useTabSlideMotion) */}
      <div ref={panelsRef} className="relative flex flex-1 flex-col">
        <MenuTabs.Panel value="completed" className={TAB_SLIDE_PANEL_CLASS}>
          {completedBundles.length > 0 ? (
            <>
              <CompletedBundleGrid
                bunchId={bunchId}
                bundles={completedBundles}
                onOpen={onOpenBundle}
                onPressStart={onPressBundle}
                listRef={gridRef}
              />
              {completedMore ? <ListMore query={completedMore} listRef={gridRef} /> : null}
            </>
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
        <MenuTabs.Panel value="draft" className={TAB_SLIDE_PANEL_CLASS}>
          {draftBundles.length > 0 ? (
            <DraftBundleList
              bundles={draftBundles}
              onOpen={onOpenDraft}
              onPressStart={onPressDraft}
              onDelete={onDeleteDraft}
            />
          ) : (
            <div className="pt-s25">
              <BundleEmpty title={BUNCH_HOME_MESSAGES.draftEmptyTitle} />
            </div>
          )}
        </MenuTabs.Panel>
      </div>
    </MenuTabs.Root>
  );
}
