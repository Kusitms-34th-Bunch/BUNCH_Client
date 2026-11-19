import { Header } from '@app/design-system';
import { PageShell } from '@/shared/components/layout/PageShell';

const CELLS = Array.from({ length: 9 }, (_, index) => index);

/**
 * 첫 목록을 불러오는 동안의 회색 자리표시(Figma에 없는 상태라 사진 칸과 같은 회색 사용)
 * 헤더도 같은 높이로 그려 다 받은 뒤 내용이 헤더만큼 밀리지 않게 함(번치 이름은 목록과 함께 와서 자리만)
 */
export function PhotoBoxSkeleton() {
  return (
    <PageShell
      header={
        <Header
          aria-hidden="true"
          leading={<div className="bg-surface-secondary rounded-r2 h-6 w-24" />}
        />
      }
    >
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
