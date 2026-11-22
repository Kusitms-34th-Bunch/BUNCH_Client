import { LineMemberSmallIcon } from '@app/design-system';
import Link from 'next/link';
import { type RefObject, useState } from 'react';
import { bundleHeroKey } from '@/shared/lib/heroKeys';
import type { CompletedBundle } from '../lib/types';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';
import { BUNCH_HOME_PATHS } from '../constants/paths';

type CompletedBundleGridProps = {
  /** 번들이 속한 번치(번들 상세 주소에 씀) */
  bunchId: string;
  bundles: readonly CompletedBundle[];
  /** 칸을 눌렀을 때(삭제 확인 뒤 이동은 부르는 쪽, 삭제돼 남으면 true). 없으면 링크로 바로 이동 */
  onOpen?: ((_bundleId: string) => unknown) | undefined;
  /** 칸에 손가락이 닿을 때(누르기 전에 삭제 여부 확인을 시작) */
  onPressStart?: ((_bundleId: string) => void) | undefined;
  /** 그리드 목록(이어서 받기·삭제 안내 뒤 초점 자리) */
  listRef?: RefObject<HTMLUListElement | null> | undefined;
};

/**
 * 완성된 번들 대표 사진 3열 그리드(123×163 비율, 사이 1px, 위 2px, 좌우 2px), 멤버 공개 번들은 오른쪽 위에 멤버 아이콘
 * 칸은 번들 상세(6.2) 링크, 이름은 사진 대체 텍스트. 칸 사진은 상세 첫 사진으로 이어지는 hero로 열림
 */
export function CompletedBundleGrid({
  bunchId,
  bundles,
  onOpen,
  onPressStart,
  listRef,
}: CompletedBundleGridProps) {
  return (
    <ul ref={listRef} tabIndex={-1} className="px-s1 pt-s1 grid grid-cols-3 gap-px outline-none">
      {bundles.map((bundle) => (
        <li
          key={bundle.id}
          className="bg-surface-secondary relative aspect-123/163 overflow-hidden"
        >
          <Link
            href={BUNCH_HOME_PATHS.bundle(bunchId, bundle.id)}
            // 칸 사진을 상세 첫 사진으로 잇는 hero 짝(AppTransitions)
            data-hero-enter-key={bundleHeroKey(bundle.id)}
            onPointerDown={() => onPressStart?.(bundle.id)}
            onClick={(event) => {
              // 보조 키·가운데 버튼 클릭은 브라우저 기본 동작(새 탭 등)에 맡김
              const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
              if (!onOpen || modified || event.button !== 0) return;
              event.preventDefault();
              // 삭제된 번들이면 칸이 사라지므로 초점을 탭 패널(마지막 칸이라 빈 상태로 바뀌어도 남음), 없으면 그리드로
              void Promise.resolve(onOpen(bundle.id)).then((deleted) => {
                if (deleted !== true) return;
                const list = listRef?.current;
                (list?.closest<HTMLElement>('[role="tabpanel"]') ?? list)?.focus();
              });
            }}
            className="focus-visible:outline-border-brand block size-full focus-visible:outline-2 focus-visible:-outline-offset-2"
          >
            <CoverImage
              src={bundle.coverSrc}
              alt={
                bundle.memberOnly
                  ? `${bundle.title}, ${BUNCH_HOME_MESSAGES.bundleMemberOnly}`
                  : bundle.title
              }
            />
          </Link>
          {bundle.memberOnly && (
            <span
              aria-hidden="true"
              className="bg-overlay-pressed text-icon-inversed top-s3 right-s3 pointer-events-none absolute flex size-6 items-center justify-center rounded-full"
            >
              <LineMemberSmallIcon />
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** 대표 사진: 칸의 회색 배경 위에서 다 받으면 짧게 나타남(받지 못하면 회색 칸 유지) */
function CoverImage({ src, alt }: { src: string; alt: string }) {
  // 받은 사진 주소. 주소가 바뀌면 다시 숨겼다가 받은 뒤 나타남
  const [loadedSrc, setLoadedSrc] = useState<string>();
  const loaded = loadedSrc === src;
  return (
    // 데이터 주소·외부 이미지를 그대로 쓰므로 next/image 최적화 대상이 아님
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={(img) => {
        // 이미 받아 둔 사진(캐시)은 load 전에 끝나 있어 바로 보임
        if (img?.complete && img.naturalWidth > 0) setLoadedSrc(src);
      }}
      src={src}
      alt={alt}
      decoding="async"
      onLoad={() => setLoadedSrc(src)}
      data-loaded={loaded || undefined}
      className="size-full object-cover opacity-0 transition-opacity duration-200 ease-out data-loaded:opacity-100 motion-reduce:transition-none"
    />
  );
}
