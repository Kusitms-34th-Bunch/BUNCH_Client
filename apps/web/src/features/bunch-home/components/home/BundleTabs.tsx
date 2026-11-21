import {
  cn,
  FillPencilMediumIcon,
  FillPhotoMediumIcon,
  LinePencilMediumIcon,
  LinePhotoMediumIcon,
} from '@app/design-system';
import { MenuTabs } from '@app/design-system/web';
import { useEffect, useRef, useState } from 'react';
import type { ListMoreQuery } from '../../lib/pages';
import type { CompletedBundle, DraftBundle } from '../../lib/types';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { CompletedBundleGrid } from '../CompletedBundleGrid';
import { ListMore } from '../ListMore';
import { BundleEmpty } from './BundleEmpty';
import { DraftBundleList } from './DraftBundleList';

export type BundleTab = 'completed' | 'draft';

// 탭 전환 시 내용 Dissolve / Ease out / 75ms(화면설계서 3)
const panelFade = 'animate-[page-content-in_75ms_ease-out] motion-reduce:animate-none';

// 고른 탭을 이 화면의 history 항목에 번치 id와 함께 둠: 작성 중인 번들 등에서 뒤로 돌아오면 그 탭으로, 새로 들어오면 처음 탭으로
// 번치 id가 다르면(그사이 번치를 바꿈) 쓰지 않음
const HISTORY_KEY = 'bunchBundleTab';
const readHistoryTab = (bunchId: string): BundleTab | undefined => {
  if (typeof window === 'undefined') return undefined;
  const state = window.history.state as Record<string, unknown> | null;
  const saved = state?.[HISTORY_KEY] as { bunchId?: unknown; tab?: unknown } | undefined;
  return saved?.bunchId === bunchId && (saved.tab === 'completed' || saved.tab === 'draft')
    ? saved.tab
    : undefined;
};
const writeHistoryTab = (bunchId: string, tab: BundleTab) => {
  const state = window.history.state as object | null;
  window.history.replaceState({ ...state, [HISTORY_KEY]: { bunchId, tab } }, '');
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
  // 탭을 한 번이라도 바꿨는지(첫 진입·되돌아올 때는 디졸브 생략)
  const [tabChanged, setTabChanged] = useState(false);
  return (
    <MenuTabs.Root
      value={tab}
      onValueChange={(value) => {
        setTabChanged(true);
        setTab(value as BundleTab);
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
      {/* 페이드는 들어오는 패널에만(나가는 패널에도 붙이면 첫 전환에 이전 내용이 0부터 다시 나타나고 Base UI가 그 애니메이션을 기다려 두 패널이 겹침) */}
      <MenuTabs.Panel
        value="completed"
        className={cn(tabChanged && tab === 'completed' && panelFade)}
      >
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
      <MenuTabs.Panel value="draft" className={cn(tabChanged && tab === 'draft' && panelFade)}>
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
    </MenuTabs.Root>
  );
}
