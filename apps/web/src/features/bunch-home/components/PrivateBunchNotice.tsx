import { cn, LineLockLargeIcon } from '@app/design-system';
import { useId } from 'react';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';

/**
 * 비공개 번치를 팔로우(승인)하기 전에 가리는 자리의 안내(Figma 3086:68654)
 * 회색 상자 r12·위아래 40, 자물쇠 원 40과 글자 사이 20. 제목이 영역 이름
 */
export function PrivateBunchNotice({
  description,
  className,
}: {
  description: string;
  className?: string | undefined;
}) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        'bg-surface-secondary rounded-r6 py-padding-p18 px-padding-p8 gap-s10 flex flex-col items-center text-center',
        className,
      )}
    >
      <span className="bg-surface-tertiary rounded-r10 text-icon-tertiary flex size-10 items-center justify-center">
        <LineLockLargeIcon />
      </span>
      <div>
        <h2 id={titleId} className="typography-body-1-medium text-text-primary">
          {BUNCH_HOME_MESSAGES.privateBunchTitle}
        </h2>
        <p className="typography-body-4-regular text-text-tertiary break-keep">{description}</p>
      </div>
    </section>
  );
}
