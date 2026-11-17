import {
  cn,
  FillPencilMediumIcon,
  FillPhotoMediumIcon,
  LinePencilMediumIcon,
  LinePhotoMediumIcon,
} from '@app/design-system';
import { MenuTabs } from '@app/design-system/web';
import { useState } from 'react';
import type { CompletedBundle, DraftBundle } from '../../lib/types';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { CompletedBundleGrid } from '../CompletedBundleGrid';
import { BundleEmpty } from './BundleEmpty';
import { DraftBundleList } from './DraftBundleList';

type BundleTab = 'completed' | 'draft';

// 탭 전환 시 내용 Dissolve / Ease out / 75ms(화면설계서 3)
const panelFade = 'animate-[page-content-in_75ms_ease-out] motion-reduce:animate-none';

type BundleTabsProps = {
  completedBundles: readonly CompletedBundle[];
  draftBundles: readonly DraftBundle[];
  onCreateBundle?: (() => void) | undefined;
  onOpenDraft?: ((_bundleId: string) => void) | undefined;
  /** 작성 중인 번들 삭제 버튼(확인 창은 화면이 띄움) */
  onDeleteDraft: (_bundle: DraftBundle) => void;
};

/** 번치 홈의 완성된·작성 중인 번들 탭과 빈 상태. 번치를 전환하면 화면이 key로 다시 그려 완성된 번들 탭부터 */
export function BundleTabs({
  completedBundles,
  draftBundles,
  onCreateBundle,
  onOpenDraft,
  onDeleteDraft,
}: BundleTabsProps) {
  const [tab, setTab] = useState<BundleTab>('completed');
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
          <CompletedBundleGrid bundles={completedBundles} />
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
