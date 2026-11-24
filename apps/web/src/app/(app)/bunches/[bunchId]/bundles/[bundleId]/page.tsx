import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isWireId } from '@/shared/api/client/ids';
import { BundleDetailFrame } from './BundleDetailFrame';

// 지금 번치 명의로 보는 화면이라 검색에서 제외(다른 번치 프로필과 같음)
export const metadata: Metadata = { title: '번들', robots: { index: false } };

// 처음 방문할 때 한 번 그려 두는 정적 화면: 피드에서 미리 받아 두고 누르자마자 열림(요청마다 그리면 누른 뒤 서버 왕복을 기다림, #532)
// 서버 출력은 사용자와 무관한 틀뿐이고 내용은 클라이언트가 받음
export function generateStaticParams() {
  return [];
}

export default async function BundleDetailPage({
  params,
}: {
  params: Promise<{ bunchId: string; bundleId: string }>;
}) {
  const { bunchId, bundleId } = await params;
  // 서버 ID 형식이 아닌 주소는 그리지 않음(아무 경로나 정적 캐시에 쌓이지 않게, 수정 화면과 같은 기준)
  if (!isWireId(bunchId) || !isWireId(bundleId)) notFound();
  return <BundleDetailFrame bunchId={bunchId} bundleId={bundleId} />;
}
