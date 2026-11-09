import type { Metadata } from 'next';
import { BUNCH_HOME_PATHS } from '@/features/bunch-home/constants/paths';
import { BunchPlaces } from '@/features/bunch-places/components';
import { MAIN_TAB_PATHS } from '@/features/main-navigation/constants/tabs';

// 번치 멤버만 보는 화면이라 검색에서 제외(현재 번치 멤버면 역할과 관계없이 누구나 들어옴, 서버 판단은 API 연결 때)
export const metadata: Metadata = { title: '콕한 장소', robots: { index: false } };

export default function BunchPlacesPage() {
  return (
    <div
      data-ssgoi-transition={BUNCH_HOME_PATHS.places}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      <BunchPlaces backHref={BUNCH_HOME_PATHS.home} feedHref={MAIN_TAB_PATHS.feed} />
    </div>
  );
}
