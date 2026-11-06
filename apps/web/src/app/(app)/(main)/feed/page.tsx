import type { Metadata } from 'next';
import Link from 'next/link';
import { BUNCH_HOME_PATHS } from '@/features/bunch-home/constants/paths';
import { MainTabPage, TabPlaceholder } from '@/features/main-navigation/components';

// 임시 탭 화면: 내용이 생길 때까지 검색에서 제외
export const metadata: Metadata = { title: '피드', robots: { index: false } };

// 다른 번치 프로필 임시 입구(피드 화면이 생기면 피드의 번치 이름으로 대체)
const OTHER_BUNCH_LINKS = [
  { id: 'bunch-camping', label: '공개 번치 보기(캠핑러버)' },
  { id: 'bunch-book', label: '비공개 번치 보기(책방산책)' },
];

export default function FeedPage() {
  return (
    <MainTabPage tab="feed">
      <TabPlaceholder title="피드">
        <ul className="gap-s4 flex flex-col items-center">
          {OTHER_BUNCH_LINKS.map(({ id, label }) => (
            <li key={id}>
              <Link
                href={BUNCH_HOME_PATHS.otherBunch(id)}
                className="typography-body-2-medium text-text-brand underline underline-offset-4"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </TabPlaceholder>
    </MainTabPage>
  );
}
