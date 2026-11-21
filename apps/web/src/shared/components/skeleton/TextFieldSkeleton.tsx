import { cn, Skeleton } from '@app/design-system';

type TextFieldSkeletonProps = {
  /** 입력란 제목(고정 문구라 실제로 씀) */
  label: string;
  /** 필수 표시(*) */
  required?: boolean | undefined;
  /** 글자 수 자리(오른쪽 아래) */
  counter?: boolean | undefined;
  /** 받아 올 값의 폭 */
  valueClassName?: string | undefined;
};

/**
 * 제목 있는 입력란(LabeledTextField)의 받는 중 자리: 제목과 빈 입력란 테두리는 실제 모양, 받아 올 값만 회색
 * 값이 오기 전에는 입력할 수 없게 실제 input을 두지 않음
 */
export function TextFieldSkeleton({
  label,
  required = false,
  counter = false,
  valueClassName = 'w-20',
}: TextFieldSkeletonProps) {
  return (
    <div aria-hidden="true" className="gap-s3 flex w-full flex-col items-end">
      <div className="gap-s2 flex w-full flex-col items-start">
        <span className="typography-body-3-semibold gap-s2 text-text-secondary flex items-center">
          {label}
          {required ? (
            <span className="typography-body-1-semi-bold text-icon-brand shrink-0">*</span>
          ) : null}
        </span>
        {/* TextField와 같은 테두리·여백·높이(46) */}
        <div className="rounded-r5 border-border-secondary py-padding-p5 px-padding-p8 flex min-h-11.5 w-full items-center border">
          <Skeleton className={cn('h-4', valueClassName)} />
        </div>
      </div>
      {counter ? <Skeleton className="h-3.5 w-8" /> : null}
    </div>
  );
}
