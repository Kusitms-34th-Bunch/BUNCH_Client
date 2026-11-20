import { LineChevronDownMediumIcon, Skeleton } from '@app/design-system';

/**
 * 관리자 넘기기 목록의 받는 중 자리(AdminTransferScreen과 같은 여백, 카드 사이 6, Figma에 없는 상태)
 * 접힌 번치 카드(BunchAccordion)의 테두리·펼침 화살표는 실제 모양, 번치 사진·이름만 회색
 */
export function AdminTransferSkeleton() {
  return (
    <div aria-hidden="true" className="gap-s3 px-padding-p8 pt-s8 pb-s8 flex flex-col">
      {['w-24', 'w-20'].map((width) => (
        <div
          key={width}
          className="rounded-r4 outline-border-tertiary px-padding-p6 py-padding-p5 gap-s3 flex items-center outline -outline-offset-1"
        >
          <Skeleton shape="round" className="size-10" />
          <span className="typography-body-2-medium flex h-lh min-w-0 flex-1 items-center">
            <Skeleton className={`h-4 ${width}`} />
          </span>
          <LineChevronDownMediumIcon className="text-icon-quaternary shrink-0" />
        </div>
      ))}
    </div>
  );
}
