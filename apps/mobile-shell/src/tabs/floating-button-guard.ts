import type { SetNativeFloatingButtonParams } from '@app/bridge';
import type { TabId } from './tabs';

type Button = NonNullable<SetNativeFloatingButtonParams['button']>;

type Deps = {
  /** 그 탭의 주소가 탭 첫 화면인지 */
  isRoot: (_tab: TabId, _url: string) => boolean;
  /** 탭 화면에 버튼을 그림(null이면 지움) */
  show: (_tab: TabId, _button: Button | null) => void;
};

/**
 * 플로팅 버튼 안전장치: 버튼은 그 탭이 첫 화면일 때만 그림(전환 중 나가는 화면이 늦게 보낸 요청이 하위 화면에 뜨지 않게)
 * 첫 화면이 아닐 때 온 요청은 보관했다가 첫 화면으로 돌아오면 그림(주소 갱신보다 요청이 먼저 오는 경우)
 */
export function createFloatingButtonGuard({ isRoot, show }: Deps) {
  // 탭 WebView마다 지금 주소. 아직 모르면 첫 화면으로 봄
  const urls = new Map<TabId, string>();
  const pending = new Map<TabId, Button>();
  const onRoot = (tab: TabId) => {
    const url = urls.get(tab);
    return !url || isRoot(tab, url);
  };

  return {
    /** 웹의 버튼 요청(null이면 지움) */
    request(tab: TabId, button: Button | null) {
      if (button && !onRoot(tab)) {
        pending.set(tab, button);
        return;
      }
      pending.delete(tab);
      show(tab, button);
    },
    /** 탭 WebView의 주소 변경: 첫 화면을 떠나면 버튼을 지우고(웹 정리가 늦거나 빠져도), 돌아오면 보관한 버튼을 그림 */
    reportUrl(tab: TabId, url: string) {
      urls.set(tab, url);
      if (!onRoot(tab)) {
        show(tab, null);
        return;
      }
      const button = pending.get(tab);
      if (!button) return;
      pending.delete(tab);
      show(tab, button);
    },
  };
}
