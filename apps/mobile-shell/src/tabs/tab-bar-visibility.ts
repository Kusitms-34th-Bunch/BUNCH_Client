import type { TabId } from './tabs';

/** 탭 바 숨김 상태: 탭마다 마지막으로 알려 온 값과 지금 선택된 탭(#481) */
export type TabBarVisibilityState = {
  /** 지금 탭 바에 적용된 숨김 여부 */
  barHidden?: boolean;
  /** 탭 WebView마다 마지막으로 알려 온 숨김 여부(알려 온 적 없으면 표시) */
  hiddenByTab?: Partial<Record<TabId, boolean>>;
  /** 지금 선택된 탭. 아직 모르면 웹이 처음 고른 탭으로 봄 */
  focusedTab?: TabId;
};

/**
 * 탭 WebView가 알려 온 표시 여부를 저장하고, 그 탭이 지금 탭이면 탭 바에도 적용
 * 뒤에 있는 탭이 보낸 값은 저장만 해 지금 화면의 탭 바를 바꾸지 않음
 */
export const reportTabBar = <T extends TabBarVisibilityState>(
  state: T,
  tab: TabId,
  visible: boolean,
  initialTab: TabId,
): T => {
  const focused = state.focusedTab ?? initialTab;
  const barHidden = tab === focused ? !visible : state.barHidden;
  // 같은 값이면 그대로 돌려줘 쉘이 다시 그리지 않음(탭 WebView 4개가 경로마다 보냄)
  if (state.hiddenByTab?.[tab] === !visible && state.barHidden === barHidden) return state;
  return { ...state, hiddenByTab: { ...state.hiddenByTab, [tab]: !visible }, barHidden };
};

/**
 * 탭이 바뀌면 그 탭이 마지막으로 알려 온 값으로 탭 바를 맞춤(알려 온 적 없으면 표시)
 * 탭별 값을 한 번도 받지 않았으면(탭 ID를 보내지 않는 이전 웹) 지금 탭 바를 그대로 둠(이전 웹이 보낸 숨김 유지)
 */
export const focusTabBar = <T extends TabBarVisibilityState>(state: T, tab: TabId): T => {
  const perTab = state.hiddenByTab !== undefined && Object.keys(state.hiddenByTab).length > 0;
  const barHidden = perTab ? (state.hiddenByTab?.[tab] ?? false) : (state.barHidden ?? false);
  if (state.focusedTab === tab && state.barHidden === barHidden) return state;
  return { ...state, focusedTab: tab, barHidden };
};
