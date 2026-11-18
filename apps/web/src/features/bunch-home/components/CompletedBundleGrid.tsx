import { LineMemberSmallIcon } from '@app/design-system';
import type { CompletedBundle } from '../lib/types';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';

type CompletedBundleGridProps = {
  bundles: readonly CompletedBundle[];
};

/**
 * 완성된 번들 대표 사진 3열 그리드(123×163 비율, 사이 1px, 위 2px, 좌우 2px), 멤버 공개 번들은 오른쪽 위에 멤버 아이콘
 * 번들 상세 route는 있으나 칸을 눌러도 이동은 미연결(2026-11-16 확인, spec 확인할 항목)
 */
export function CompletedBundleGrid({ bundles }: CompletedBundleGridProps) {
  return (
    <ul className="px-s1 pt-s1 grid grid-cols-3 gap-px">
      {bundles.map((bundle) => (
        <li
          key={bundle.id}
          className="bg-surface-secondary relative aspect-123/163 overflow-hidden"
        >
          {/* 데이터 주소·외부 이미지를 그대로 쓰므로 next/image 최적화 대상이 아님 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bundle.coverSrc}
            alt={
              bundle.memberOnly
                ? `${bundle.title}, ${BUNCH_HOME_MESSAGES.bundleMemberOnly}`
                : bundle.title
            }
            className="size-full object-cover"
          />
          {bundle.memberOnly && (
            <span
              aria-hidden="true"
              className="bg-overlay-pressed text-icon-inversed top-s3 right-s3 absolute flex size-6 items-center justify-center rounded-full"
            >
              <LineMemberSmallIcon />
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
