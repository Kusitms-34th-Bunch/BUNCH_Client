type FieldFooterProps = {
  errorId: string;
  countId: string;
  error?: string | undefined;
  /** 있으면 안내 줄 오른쪽에 `현재/최대` 표시 */
  count?: { current: number; max: number } | undefined;
};

/**
 * 입력 필드 아래 안내 줄: 왼쪽 오류 문구, 오른쪽 글자 수
 * 오류 읽기는 오류가 생기기 전부터 있어야 하는 status 영역이 담당하고, 보이는 문구는 읽기 중복 방지를 위해 숨김
 */
export function FieldFooter({ errorId, countId, error, count }: FieldFooterProps) {
  return (
    <>
      {error || count ? (
        <div className="flex items-start justify-between">
          {error ? (
            <p
              id={errorId}
              aria-hidden="true"
              className="typography-caption-1-medium text-system-fail-text"
            >
              {error}
            </p>
          ) : null}
          {count ? (
            <p id={countId} className="typography-body-3-regular text-text-tertiary ml-auto">
              {count.current}/{count.max}
            </p>
          ) : null}
        </div>
      ) : null}
      <p role="status" className="sr-only">
        {error}
      </p>
    </>
  );
}
