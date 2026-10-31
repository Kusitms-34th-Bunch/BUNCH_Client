import { PageShell } from '@/shared/components/layout/PageShell';

const CELLS = Array.from({ length: 9 }, (_, index) => index);

/** 첫 목록을 불러오는 동안의 회색 자리표시(Figma에 없는 상태라 사진 칸과 같은 회색 사용) */
export function PhotoBoxSkeleton() {
  return (
    <PageShell>
      <h1 className="sr-only">사진함</h1>
      <div role="status">
        <span className="sr-only">사진함을 불러오는 중이에요</span>
        <div aria-hidden="true">
          <div className="px-s8 pt-s9 gap-s3 flex pb-1">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="bg-surface-secondary h-10 w-20 rounded-full" />
            ))}
          </div>
          <div className="pt-s8 pr-s7 pb-s3 pl-s8">
            <div className="bg-surface-secondary rounded-r2 h-5 w-28" />
          </div>
          <div className="grid grid-cols-3 gap-px">
            {CELLS.map((index) => (
              <div key={index} className="bg-surface-secondary aspect-square" />
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
