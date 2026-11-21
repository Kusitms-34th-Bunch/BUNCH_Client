import { BundleCard } from '@app/design-system/web';
import type { DraftBundle } from '../../lib/types';

type DraftBundleListProps = {
  bundles: readonly DraftBundle[];
  /** 카드를 눌렀을 때(번들 작성 화면 이동은 번들 작성 이슈) */
  onOpen?: ((_bundleId: string) => void) | undefined;
  /** 카드에 손가락이 닿을 때(누르기 전에 삭제·발행 여부 확인을 시작). 휴지통은 제외 */
  onPressStart?: ((_bundleId: string) => void) | undefined;
  /** 삭제 버튼을 눌렀을 때(확인 창은 화면이 띄움) */
  onDelete: (_bundle: DraftBundle) => void;
};

/** 작성 중인 번들 카드 목록(탭 아래 12px, 사이 10px, 좌우 16px) */
export function DraftBundleList({ bundles, onOpen, onPressStart, onDelete }: DraftBundleListProps) {
  return (
    <ul className="gap-s5 px-s8 pt-s6 flex flex-col">
      {bundles.map((bundle) => (
        <li
          key={bundle.id}
          // 휴지통에서는 시작하지 않음(삭제 직전 확인이 이 요청에 합류해 누르기 전 상태로 판단하지 않게)
          onPointerDown={(event) => {
            if ((event.target as Element).closest('[data-card-button]')) onPressStart?.(bundle.id);
          }}
        >
          <BundleCard
            title={bundle.title}
            titleMuted={bundle.untitled}
            imageSrc={bundle.coverSrc}
            members={bundle.members}
            onCardClick={() => onOpen?.(bundle.id)}
            // 삭제 권한이 있는 사람에게만 휴지통(기능명세 5.3.2 로직 2)
            onDelete={bundle.canDelete ? () => onDelete(bundle) : undefined}
          />
        </li>
      ))}
    </ul>
  );
}
