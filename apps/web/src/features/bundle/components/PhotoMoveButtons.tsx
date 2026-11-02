import { BUNDLE_MESSAGES } from '../constants/messages';

// 포커스가 있을 때만 보이는 버튼
const HIDDEN_BUTTON =
  'focus-visible:bg-surface-primary focus-visible:text-text-primary focus-visible:rounded-r4 focus-visible:px-s6 focus-visible:py-s4 focus-visible:outline-border-brand sr-only focus-visible:not-sr-only focus-visible:outline-2';

type PhotoMoveButtonsProps = {
  /** 가운데에 온 사진의 자리(0부터)와 전체 장수 */
  index: number;
  total: number;
  onMoveBefore: () => void;
  onMoveAfter: () => void;
};

/**
 * 끌어서 순서 바꾸기의 키보드·스크린 리더 대체 수단(기능 spec 4.3.5): 가운데 사진을 한 칸 앞·뒤로 옮김
 * 맨 앞·맨 뒤에서는 `aria-disabled`로 두고 누르면 아무것도 하지 않음
 */
export function PhotoMoveButtons({
  index,
  total,
  onMoveBefore,
  onMoveAfter,
}: PhotoMoveButtonsProps) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => index > 0 && onMoveBefore()}
        aria-disabled={index <= 0 ? true : undefined}
        className={HIDDEN_BUTTON}
      >
        {BUNDLE_MESSAGES.movePhotoBefore}
      </button>
      <button
        type="button"
        onClick={() => index < total - 1 && onMoveAfter()}
        aria-disabled={index >= total - 1 ? true : undefined}
        className={HIDDEN_BUTTON}
      >
        {BUNDLE_MESSAGES.movePhotoAfter}
      </button>
    </div>
  );
}
