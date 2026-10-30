import type { Metadata } from 'next';
import { PhotoBox } from '@/features/photo-box/components';
import { parsePreview } from '@/features/photo-box/lib/preview';

// 번치 멤버의 개인 사진 화면이라 검색에서 제외
export const metadata: Metadata = { title: '사진함', robots: { index: false } };

type PhotosPageProps = {
  searchParams: Promise<{ preview?: string | string[] }>;
};

export default async function PhotosPage({ searchParams }: PhotosPageProps) {
  const { preview } = await searchParams;

  return <PhotoBox preview={parsePreview(preview)} />;
}
