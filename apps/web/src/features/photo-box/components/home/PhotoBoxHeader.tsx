import { AccountSwitcher, Header, TextButton } from '@app/design-system';
import type { PhotoBoxBunch } from '../../lib/types';

type PhotoBoxHeaderProps = {
  bunch: PhotoBoxBunch;
  /** 번치 이름·화살표를 눌렀을 때(번치 전환 시트 열기) */
  onBunchClick?: (() => void) | undefined;
  /** 전환 시트가 열려 있는지(트리거의 aria-expanded) */
  switcherOpen?: boolean | undefined;
  /** 선택 모드 여부(켜면 「선택」 대신 「취소」) */
  selecting?: boolean | undefined;
  /** 「선택」을 눌렀을 때 */
  onSelectClick?: (() => void) | undefined;
  /** 고를 사진이 없음(보이는 목록 0장). 「선택」을 자리 그대로 흐리게 막음(#583) */
  selectDisabled?: boolean | undefined;
  /** 「취소」를 눌렀을 때 */
  onCancelClick?: (() => void) | undefined;
};

/** 상단 고정 헤더: 번치 이름·전환 화살표와 「선택」(선택 모드에서는 「취소」) */
export function PhotoBoxHeader({
  bunch,
  onBunchClick,
  switcherOpen = false,
  selecting = false,
  onSelectClick,
  selectDisabled = false,
  onCancelClick,
}: PhotoBoxHeaderProps) {
  return (
    <Header
      leading={
        <AccountSwitcher
          label={bunch.name}
          aria-haspopup="dialog"
          aria-expanded={switcherOpen}
          onClick={onBunchClick}
        />
      }
      trailing={
        <TextButton
          size="sm"
          onClick={selecting ? onCancelClick : onSelectClick}
          disabled={!selecting && selectDisabled}
          // 비활성 색으로 바로 바뀌지 않고 Figma 뗄 때 모션(180ms)으로 흐려지고 돌아옴
          className="[--press-color-duration:180ms] [--press-color-ease:cubic-bezier(0.2,0,0,1)]"
        >
          {selecting ? '취소' : '선택'}
        </TextButton>
      }
    />
  );
}
