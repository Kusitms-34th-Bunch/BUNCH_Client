import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { cn } from '../../../utils';

export type BundleCaptionProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 캡션 본문. 줄바꿈 유지 */
  content: string;
  /** 펼치기 버튼 글자. 기본값 「..더보기」 */
  moreLabel?: string | undefined;
};

/**
 * 사진 캡션(Figma `Comment Card`·`ReadMore`): 회색 상자에 2줄까지 보이고 넘치면 끝에 「..더보기」, 누르면 전체를 펼침
 * 내용이 바뀌면(다른 사진으로 넘김) 다시 접힘. 캡션이 없는 사진은 호출자가 그리지 않음
 */
export const BundleCaption = ({
  content,
  moreLabel = '..더보기',
  className,
  ...props
}: BundleCaptionProps) => {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  // 펼친 캡션을 기억해 내용이 바뀌면 자동으로 접힘
  const [expandedContent, setExpandedContent] = useState<string | null>(null);
  const expanded = expandedContent === content;

  useEffect(() => {
    const element = textRef.current;
    if (!element || expanded) return;
    const measure = () => setOverflowing(element.scrollHeight > element.clientHeight + 1);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [content, expanded]);

  return (
    <div
      className={cn('bg-surface-secondary rounded-r5 p-padding-p7 relative', className)}
      {...props}
    >
      <p
        ref={textRef}
        // 더보기 버튼이 사라지므로 펼친 본문이 초점을 받음
        tabIndex={-1}
        className={cn(
          'typography-body-3-regular text-text-tertiary wrap-break-word whitespace-pre-line outline-none',
          !expanded && 'line-clamp-2',
        )}
      >
        {content}
      </p>
      {overflowing && !expanded ? (
        // 둘째 줄 끝을 같은 배경으로 덮고 그 위에 버튼
        <button
          type="button"
          aria-label={moreLabel.replace(/^\.+/, '')}
          onClick={() => {
            setExpandedContent(content);
            textRef.current?.focus();
          }}
          className="bg-surface-secondary typography-body-3-regular text-text-quinary right-padding-p7 bottom-padding-p7 focus-visible:outline-border-brand pl-s1 absolute cursor-pointer touch-manipulation before:absolute before:-inset-x-2 before:-inset-y-3 focus-visible:outline-2"
        >
          {moreLabel}
        </button>
      ) : null}
    </div>
  );
};
