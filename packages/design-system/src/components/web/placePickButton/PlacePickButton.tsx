import { LineHandClickSmallIcon } from '../../../icons';
import { cn } from '../../../utils';
import { ChipButton, type ChipButtonProps } from '../chipButton';

export type PlacePickButtonProps = Omit<
  ChipButtonProps,
  | 'children'
  | 'size'
  | 'variant'
  | 'selected'
  | 'count'
  | 'leftIcon'
  | 'rightIcon'
  | 'avatarSrc'
  | 'aria-pressed'
> & {
  /** 현재 번치의 콕한 장소에 담겨 있음(다른 멤버가 콕한 것 포함) */
  picked: boolean;
  /** 담기 전 글자. 기본값 「콕하기」 */
  label?: string | undefined;
  /** 담긴 뒤 글자. 기본값 「콕 했어요」 */
  pickedLabel?: string | undefined;
};

/**
 * 콕하기 버튼(Figma `ChipButton` M, 손가락 아이콘): 담기 전 연한 회색 「콕하기」, 담긴 뒤 검은 「콕 했어요」
 * 글자가 상태를 알리므로 `aria-pressed`는 쓰지 않음(글자와 눌림 상태가 함께 바뀌면 낭독이 겹침). 담기·취소 처리는 호출자 담당
 */
export const PlacePickButton = ({
  picked,
  label = '콕하기',
  pickedLabel = '콕 했어요',
  className,
  ...props
}: PlacePickButtonProps) => (
  <ChipButton
    size="M"
    selected={picked}
    rightIcon={<LineHandClickSmallIcon aria-hidden="true" className="shrink-0" />}
    // Figma 담기 전 글자는 text-secondary(ChipButton 기본 tertiary보다 진함)
    className={cn(!picked && 'text-text-secondary', className)}
    {...props}
    aria-pressed={undefined}
  >
    {picked ? pickedLabel : label}
  </ChipButton>
);
