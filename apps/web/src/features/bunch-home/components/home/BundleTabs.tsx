import {
  cn,
  FillPencilMediumIcon,
  FillPhotoMediumIcon,
  LinePencilMediumIcon,
  LinePhotoMediumIcon,
} from '@app/design-system';
import { MenuTabs } from '@app/design-system/web';
import { useRef, useState } from 'react';
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

type BundleTabsProps = {
  /** 처음 보일 탭(알림에서 「작성 중인 번들」로 바로 들어옴, 5.12.2) */
  initialTab?: BundleTab | undefined;
  /** 지금 번치(번들 상세 주소에 씀) */
  bunchId: string;
  /** 완성된 번들 칸을 눌렀을 때 */
  onOpenBundle?: ((_bundleId: string) => unknown) | undefined;
  /** 완성된 번들 이어서 받기(없으면 받은 것만) */
  completedMore?: ListMoreQuery | undefined;
  completedBundles: readonly CompletedBundle[];
  draftBundles: readonly DraftBundle[];
  onCreateBundle?: (() => void) | undefined;
  onOpenDraft?: ((_bundleId: string) => void) | undefined;
  /** 작성 중인 번들 삭제 버튼(확인 창은 화면이 띄움) */
  onDeleteDraft: (_bundle: DraftBundle) => void;
};

/** 번치 홈의 완성된·작성 중인 번들 탭과 빈 상태. 번치를 전환하면 화면이 key로 다시 그려 처음 탭부터 */
export function BundleTabs({
  initialTab = 'completed',
  bunchId,
  onOpenBundle,
  completedMore,
  completedBundles,
  draftBundles,
  onCreateBundle,
  onOpenDraft,
  onDeleteDraft,
}: BundleTabsProps) {
  const [tab, setTab] = useState<BundleTab>(initialTab);
  const gridRef = useRef<HTMLUListElement>(null);
  // 탭을 한 번이라도 바꿨는지(첫 진입·되돌아올 때는 디졸브 생략)
  const [tabChanged, setTabChanged] = useState(false);
  return (
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
          <DraftBundleList bundles={draftBundles} onOpen={onOpenDraft} onDelete={onDeleteDraft} />
        ) : (
          <div className="pt-s25">
            <BundleEmpty title={BUNCH_HOME_MESSAGES.draftEmptyTitle} />
          </div>
        )}
      </MenuTabs.Panel>
    </MenuTabs.Root>
  );
}
