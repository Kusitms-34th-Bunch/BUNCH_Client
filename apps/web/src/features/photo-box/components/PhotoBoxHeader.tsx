import { AccountSwitcher, Header, TextButton } from '@app/design-system';
import type { PhotoBoxBunch } from '../lib/types';

type PhotoBoxHeaderProps = {
  bunch: PhotoBoxBunch;
  /** 번치 이름·화살표를 눌렀을 때(번치 전환 목록은 추후 작업이라 호출 지점만 둠) */
  onBunchClick?: (() => void) | undefined;
  /** 선택 모드 여부(켜면 「선택」 대신 「취소」) */
  selecting?: boolean | undefined;
  /** 「선택」을 눌렀을 때 */
  onSelectClick?: (() => void) | undefined;
  /** 「취소」를 눌렀을 때 */
  onCancelClick?: (() => void) | undefined;
};

/** 상단 고정 헤더: 번치 대표 이미지·이름·전환 화살표와 「선택」(선택 모드에서는 「취소」) */
export function PhotoBoxHeader({
  bunch,
  onBunchClick,
  selecting = false,
  onSelectClick,
  onCancelClick,
}: PhotoBoxHeaderProps) {
  return (
    <Header
      leading={
        <AccountSwitcher label={bunch.name} avatarSrc={bunch.imageSrc} onClick={onBunchClick} />
      }
      trailing={
        <TextButton size="sm" onClick={selecting ? onCancelClick : onSelectClick}>
          {selecting ? '취소' : '선택'}
        </TextButton>
      }
    />
  );
}
