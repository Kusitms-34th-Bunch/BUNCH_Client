import type { useScreenOverlay } from '@/shared/hooks/overlay/useScreenOverlay';
import type { DateConfirmKind } from '../lib/photoActions';
import { DateChangeConfirmDialog } from './PhotoSelectionDialogs';

/**
 * 날짜 변경 확인 창을 열고 「확인」이면 true, 닫으면 false
 * 부른 쪽의 `useScreenOverlay()`로 열어야 그 쪽의 `closeAll`(목록이 사라질 때)이 이 창도 닫음
 */
export const askDateChangeConfirm = (
  openOverlay: ReturnType<typeof useScreenOverlay>,
  kind: DateConfirmKind,
) =>
  new Promise<boolean>((resolve) => {
    openOverlay(
      (rootProps, close) => (
        <DateChangeConfirmDialog
          {...rootProps}
          kind={kind}
          onConfirm={() => {
            resolve(true);
            close();
          }}
        />
      ),
      () => resolve(false),
    );
  });
