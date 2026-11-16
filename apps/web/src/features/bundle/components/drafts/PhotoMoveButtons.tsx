import { BUNDLE_MESSAGES } from '../../constants/messages';

// 포커스가 있을 때만 보이는 버튼(눈에는 안 보이고 키보드·스크린 리더로만 닿음), 130px 썸네일 안에서 글자가 넘치지 않도록 폭에 맞춰 줄바꿈함
const HIDDEN_BUTTON =
  'typography-body-4-regular w-full text-center leading-snug break-keep focus-visible:bg-surface-primary focus-visible:text-text-primary focus-visible:rounded-r4 focus-visible:px-s4 focus-visible:py-s3 focus-visible:outline-border-brand sr-only focus-visible:not-sr-only focus-visible:outline-2';

type PhotoMoveButtonsProps = {
  /** 이 사진의 자리(0부터)와 전체 장수 */
  index: number;
  total: number;
  onMoveBefore: () => void;
  onMoveAfter: () => void;
  /** 버튼 묶음의 위치(썸네일 위에 얹을 때 지정) */
  className?: string | undefined;
};

/**
 * 끌어서 순서 바꾸기의 키보드·스크린 리더 대체 수단(기능 spec 접근성): 이 사진을 한 칸 앞·뒤로 옮김
 * 눈에는 보이지 않다가 포커스가 오면 썸네일 하단에 얹혀 나타남. 맨 앞·맨 뒤에서는 `aria-disabled`로 두어 포커스를 잃지 않고 누르면 아무것도 하지 않음
 * 어느 사진인지 알 수 있도록 접근성 이름에 몇 번째 사진인지 붙이고, 눈에 보이는 글자(`사진을 앞으로 옮기기`)는 그 이름에 포함됨
 * `data-move`는 옮긴 뒤 같은 버튼으로 포커스를 돌려주는 데 씀
 */
export function PhotoMoveButtons({
  index,
  total,
  onMoveBefore,
  onMoveAfter,
  className,
}: PhotoMoveButtonsProps) {
  return (
    <div className={className ?? 'relative'}>
      <button
        type="button"
        data-move="before"
        aria-label={BUNDLE_MESSAGES.movePhotoBeforeLabel(index + 1)}
        onClick={() => index > 0 && onMoveBefore()}
        aria-disabled={index <= 0 ? true : undefined}
        className={HIDDEN_BUTTON}
      >
        {BUNDLE_MESSAGES.movePhotoBefore}
      </button>
      <button
        type="button"
        data-move="after"
        aria-label={BUNDLE_MESSAGES.movePhotoAfterLabel(index + 1)}
        onClick={() => index < total - 1 && onMoveAfter()}
        aria-disabled={index >= total - 1 ? true : undefined}
        className={HIDDEN_BUTTON}
      >
        {BUNDLE_MESSAGES.movePhotoAfter}
      </button>
    </div>
  );
}
