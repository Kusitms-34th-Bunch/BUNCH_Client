import { LineCloseSmallIcon } from '../../../icons';
import { cn } from '../../../utils';
import { CommentInput, type CommentInputProps } from '../commentInput';

export type CommentComposerProps = CommentInputProps & {
  /** 닫기 버튼 접근성 이름. 기본값 「답글 그만 쓰기」 */
  cancelReplyLabel?: string | undefined;
} & (
    | {
        /** 답글 대상 닉네임. 있으면 입력칸 위에 「{닉네임}님에게 답글 남기는 중」과 닫기 버튼 표시 */
        replyTarget: string;
        /** 답글 작성 그만두기(닫기 버튼). 답글 중에는 필수 */
        onCancelReply: () => void;
      }
    | { replyTarget?: undefined; onCancelReply?: undefined }
  );

/**
 * 화면 아래에 고정되는 댓글 입력 영역(Figma `CommentComposer`): 위쪽 1px 선, 답글 대상 줄, 입력칸
 * Figma 변형 이름은 반대로 붙어 있음(`Mode=Comment`가 답글 대상 줄이 있는 모양). 여기서는 `replyTarget` 유무로 구분
 */
export const CommentComposer = ({
  replyTarget,
  onCancelReply,
  cancelReplyLabel = '답글 그만 쓰기',
  className,
  label,
  ...inputProps
}: CommentComposerProps) => (
  <div className={cn('border-border-tertiary bg-surface-primary border-t', className)}>
    {replyTarget ? (
      <div className="pt-s4 px-padding-p8 typography-body-4-regular text-text-tertiary flex items-center">
        {/* 닉네임만 줄이고 뒤 문구는 그대로 둠 */}
        <span className="truncate">{replyTarget}</span>
        <span className="flex-1 shrink-0 whitespace-nowrap">님에게 답글 남기는 중</span>
        {/* 아이콘 16px, 누르는 영역은 before로 가로 40·세로 32px(아래 입력칸과 겹치지 않게) */}
        <button
          type="button"
          aria-label={cancelReplyLabel}
          onClick={onCancelReply}
          className="text-icon-quaternary focus-visible:outline-border-brand relative flex shrink-0 cursor-pointer touch-manipulation rounded-full before:absolute before:-inset-x-3 before:-inset-y-2 focus-visible:outline-2"
        >
          <LineCloseSmallIcon aria-hidden />
        </button>
      </div>
    ) : null}
    <div className="pt-padding-p5 pb-padding-p2 px-padding-p8">
      {/* 답글 중이면 입력칸 이름에 대상을 넣어 화면 낭독에서도 구분 */}
      <CommentInput
        {...inputProps}
        label={
          label ??
          (replyTarget ? `${replyTarget}님에게 답글, ${inputProps.placeholder}` : undefined)
        }
      />
    </div>
  </div>
);
