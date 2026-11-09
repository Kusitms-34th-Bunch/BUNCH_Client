import { useId, type ComponentProps } from 'react';
import { FillMapPinMediumIcon } from '../../../icons';
import { cn } from '../../../utils';
import { PlacePickButton } from '../placePickButton';

export type PlacePickItemProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 장소 이름 */
  name: string;
  /** 주소(예: 「제주 제주시 애월읍」). 없으면 줄을 숨김 */
  address?: string | undefined;
  /** 현재 번치의 콕한 장소에 담겨 있음 */
  picked: boolean;
  /** 「콕하기」·「콕 했어요」를 눌렀을 때(담기·취소 확인은 호출자 담당) */
  onPick: () => void;
};

/**
 * 장소 콕하기 시트의 한 줄(Figma `PlacePick Item`, `State=Default·Selected`): 위치 아이콘 · 이름·주소 · 콕하기 버튼
 * 목록 의미(`ul`·`li`)와 바깥 간격은 호출자 담당
 */
export const PlacePickItem = ({
  name,
  address,
  picked,
  onPick,
  className,
  ...props
}: PlacePickItemProps) => {
  const nameId = useId();
  return (
    <div
      className={cn(
        'bg-surface-primary gap-s6 px-padding-p8 py-padding-p7 flex items-center',
        className,
      )}
      {...props}
    >
      <FillMapPinMediumIcon aria-hidden className="text-icon-quaternary shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span id={nameId} className="typography-body-2-medium text-text-secondary wrap-break-word">
          {name}
        </span>
        {address ? (
          <span className="typography-body-4-regular text-text-quaternary wrap-break-word">
            {address}
          </span>
        ) : null}
      </div>
      {/* 줄마다 같은 글자라 장소 이름을 설명으로 붙여 구분 */}
      <PlacePickButton picked={picked} onClick={onPick} aria-describedby={nameId} />
    </div>
  );
};
