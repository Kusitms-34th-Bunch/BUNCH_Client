import type { CompletedBundle } from '../lib/types';

type CompletedBundleGridProps = {
  bundles: readonly CompletedBundle[];
};

/**
 * 완성된 번들 대표 사진 3열 그리드(123×163 비율, 사이 1px, 좌우 2px)
 * 누르면 열 번들 상세가 아직 없어 이동하지 않음(spec 확인할 항목)
 */
export function CompletedBundleGrid({ bundles }: CompletedBundleGridProps) {
  return (
    <ul className="px-s1 pt-s2 grid grid-cols-3 gap-px">
      {bundles.map((bundle) => (
        <li key={bundle.id} className="bg-surface-secondary aspect-123/163 overflow-hidden">
          {/* 데이터 주소·외부 이미지를 그대로 쓰므로 next/image 최적화 대상이 아님 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bundle.coverSrc} alt={bundle.title} className="size-full object-cover" />
        </li>
      ))}
    </ul>
  );
}
