import { BundleCard } from '@app/design-system/web';
import type { DraftBundle } from '../lib/types';

type DraftBundleListProps = {
  bundles: readonly DraftBundle[];
  /** 카드를 눌렀을 때(번들 작성 화면 이동은 번들 작성 이슈) */
  onOpen?: ((_bundleId: string) => void) | undefined;
  /** 삭제 버튼을 눌렀을 때(확인 창은 화면이 띄움) */
  onDelete: (_bundle: DraftBundle) => void;
};

/** 작성 중인 번들 카드 목록(사이 10px, 좌우 16px) */
export function DraftBundleList({ bundles, onOpen, onDelete }: DraftBundleListProps) {
  return (
    <ul className="gap-s5 px-s8 flex flex-col">
      {bundles.map((bundle) => (
        <li key={bundle.id}>
          <BundleCard
            title={bundle.title}
            imageSrc={bundle.coverSrc}
            members={bundle.members}
            onCardClick={() => onOpen?.(bundle.id)}
            onDelete={() => onDelete(bundle)}
          />
        </li>
      ))}
    </ul>
  );
}
