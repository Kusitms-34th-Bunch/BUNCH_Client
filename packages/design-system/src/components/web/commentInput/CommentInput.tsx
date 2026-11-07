import { useRef, type ComponentProps, type SyntheticEvent } from 'react';
import {
  GraphicCommentSendDisabledIcon,
  GraphicCommentSendIcon,
  GraphicCommentSendPressedIcon,
} from '../../../icons';
import { cn } from '../../../utils';
import inputScale from '../../core/textField/inputScale.module.css';
import { useTextareaAutoHeight } from '../labeledTextField/useTextareaAutoHeight.internal';

export type CommentInputProps = Omit<
  ComponentProps<'form'>,
  'children' | 'onSubmit' | 'onChange'
> & {
  /** 입력값(제어 컴포넌트) */
  value: string;
  /** 입력이 바뀔 때 */
  onValueChange: (_value: string) => void;
  /** 보내기. 공백만 있으면 버튼이 비활성이라 호출되지 않음. 앞뒤 공백 정리는 호출자 담당 */
  onSubmit: (_value: string) => void;
  /** 안내 문구(예: 「여행가조로 댓글 달기」) */
  placeholder: string;
  /** 입력칸 접근성 이름. 기본값은 안내 문구 */
  label?: string | undefined;
  /** 보내기 버튼 접근성 이름. 기본값 「보내기」 */
  submitLabel?: string | undefined;
  /** 최대 글자 수 */
  maxLength?: number | undefined;
  /** 보내는 중처럼 입력과 보내기를 모두 막을 때 */
  disabled?: boolean | undefined;
};

/**
 * 댓글 입력칸(Figma `Input Field`): 둥근 회색 칸 안의 여러 줄 입력과 보내기 버튼(`IconButton/ArrowUp`)
 * 줄바꿈을 유지하므로 Enter는 줄바꿈이고 보내기는 버튼으로만 함. 입력이 늘면 4줄까지 칸이 커지고 이후 스크롤
 * iOS 포커스 확대 방지와 높이 자동 조절은 LabeledTextArea와 같은 방식(inputScale·useTextareaAutoHeight)
 */
export const CommentInput = ({
  value,
  onValueChange,
  onSubmit,
  placeholder,
  label,
  submitLabel = '보내기',
  maxLength,
  disabled,
  className,
  ...props
}: CommentInputProps) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  useTextareaAutoHeight(ref, value);
  const canSubmit = !disabled && value.trim().length > 0;
  const submit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canSubmit) onSubmit(value);
  };

  return (
    <form
      {...props}
      onSubmit={submit}
      className={cn(
        // Figma 높이 42(위아래 6 + 버튼 30). 여러 줄이 되면 알약 모양 대신 둥근 사각형이 되도록 반경 24
        'bg-surface-secondary rounded-r10 pl-padding-p6 pr-padding-p4 py-padding-p3 gap-s2 flex items-end',
        // 입력 중 표시: SearchField와 같은 1px 짙은 선(Figma Focused에는 없음, 확인할 항목)
        'focus-within:outline-primitive-gray-700 focus-within:outline-1 forced-colors:focus-within:outline-2',
        className,
      )}
    >
      {/* 4줄(88px)까지 늘고 이후 스크롤. iOS는 0.875배로 줄여 그리므로 textarea 최대 높이를 그만큼 키움 */}
      <div className={cn(inputScale.textareaSlot, 'my-s1 max-h-22 min-w-0 flex-1')}>
        <textarea
          ref={ref}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={placeholder}
          aria-label={label ?? placeholder}
          maxLength={maxLength}
          disabled={disabled}
          rows={1}
          className={cn(
            'typography-body-3-regular text-text-primary py-padding-p1 block max-h-[calc(5.5rem/var(--input-scale,1))] w-full resize-none bg-transparent outline-none',
            'placeholder:text-text-quinary placeholder:font-(--semantic-font-weights-pretendard-1) placeholder:tracking-(--semantic-letter-spacing-1)',
          )}
        />
      </div>
      <button
        type="submit"
        aria-label={submitLabel}
        disabled={!canSubmit}
        className={cn(
          // 30px 그래픽, 누르는 영역은 before로 40px까지 넓힘(입력칸과 겹치지 않는 범위)
          'group relative flex size-7.5 shrink-0 cursor-pointer touch-manipulation rounded-full before:absolute before:-inset-1.25 disabled:cursor-default',
          'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:outline-offset-2',
        )}
      >
        {canSubmit ? (
          <>
            <GraphicCommentSendIcon className="group-active:hidden" />
            <GraphicCommentSendPressedIcon className="hidden group-active:block" />
          </>
        ) : (
          <GraphicCommentSendDisabledIcon />
        )}
      </button>
    </form>
  );
};
