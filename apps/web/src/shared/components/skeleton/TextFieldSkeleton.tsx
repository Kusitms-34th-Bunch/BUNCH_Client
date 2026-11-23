import { cn, Skeleton } from '@app/design-system';

type TextFieldSkeletonProps = {
  /** 입력란 제목 자리의 폭(실제 제목 길이에 맞춤) */
  labelClassName?: string | undefined;
  /** 필수 칸(별표 때문에 제목 줄이 24px) */
  required?: boolean | undefined;
  /** 글자 수 자리(오른쪽 아래) */
  counter?: boolean | undefined;
};

/**
 * 제목 있는 입력란(LabeledTextField)의 받는 중 자리: 제목·입력란·글자 수 모두 회색(실제와 같은 크기)
 * 값이 오기 전에는 입력할 수 없게 실제 input을 두지 않음
 */
export function TextFieldSkeleton({
  labelClassName = 'w-12',
  required = false,
  counter = false,
}: TextFieldSkeletonProps) {
  return (
    <div aria-hidden="true" className="gap-s3 flex w-full flex-col items-end">
      <div className="gap-s2 flex w-full flex-col items-start">
        {/* 실측 높이(2026-11-23, 개발 서버): 제목 줄 21px·필수 24px, 입력란 47px, 글자 수 줄 18px */}
        <span className={cn('flex items-center', required ? 'h-6' : 'h-5.25')}>
          <Skeleton className={cn('h-4', labelClassName)} />
        </span>
        <Skeleton className="rounded-r5 h-11.75 w-full" />
      </div>
      {counter ? (
        <span className="flex h-4.5 items-center">
          <Skeleton className="h-3.5 w-8" />
        </span>
      ) : null}
    </div>
  );
}
