import { requireOptionalNativeModule } from 'expo';
import { setStatusBarHidden } from 'expo-status-bar';

type ScreenSwitchModule = {
  begin: () => Promise<boolean>;
  finish: () => Promise<void>;
  cancel: () => Promise<void>;
};

// 쉘의 네이티브 모듈(modules/screen-switch). Expo Go와 이전 개발 앱에는 없음
const ScreenSwitch = requireOptionalNativeModule<ScreenSwitchModule>('ScreenSwitch');

// 덮은 뒤 끝 신호가 오지 않으면(웹이 새 화면을 그리지 못함) 치우는 상한. 네이티브에도 같은 상한(JS가 멈춰도 치움)
const COVER_CAP_MS = 3000;
let capTimer: ReturnType<typeof setTimeout> | undefined;

// 상태 바를 숨기면 위 안전 영역이 줄어 웹 레이아웃이 올라갔다 내려옴. 전환 동안(다시 보인 뒤 값이 돌아올 때까지) 웹에 주는 값을 고정
const INSETS_SETTLE_MS = 400;
let insetsHeld = false;
let releaseTimer: ReturnType<typeof setTimeout> | undefined;
const holdListeners = new Set<() => void>();
const setInsetsHeld = (held: boolean) => {
  clearTimeout(releaseTimer);
  if (insetsHeld === held) return;
  insetsHeld = held;
  holdListeners.forEach((listener) => listener());
};
const releaseInsetsLater = () => {
  clearTimeout(releaseTimer);
  releaseTimer = setTimeout(() => setInsetsHeld(false), INSETS_SETTLE_MS);
};
export const insetsHold = {
  subscribe: (listener: () => void) => {
    holdListeners.add(listener);
    return () => holdListeners.delete(listener);
  },
  get: () => insetsHeld,
};

const clearCap = () => {
  clearTimeout(capTimer);
  capTimer = undefined;
};

// 진행 중인 전환(덮기부터 끝·취소까지)과 그 세대. 거절된 begin·늦게 끝난 정리가 새 전환의 상태를 풀지 않게
let active = false;
let generation = 0;

/** 번치 전환: 화면 전체를 붙잡아 덮음. 덮은 사진에 상태 바 글자가 들어 있어 진짜 상태 바는 숨김(겹쳐 보이지 않게) */
export const beginScreenSwitch = async () => {
  if (!ScreenSwitch || active) return false;
  active = true;
  const mine = ++generation;
  clearCap();
  // 덮기 전에 고정(덮은 뒤 상태 바를 숨기는 순간 바뀐 값이 웹에 가지 않게)
  setInsetsHeld(true);
  // 덮지 못했거나(진행 중·동작 줄이기) 네이티브가 실패하면 고정을 바로 풂
  const covered = await ScreenSwitch.begin().catch(() => false);
  if (mine !== generation) return false;
  if (!covered) {
    active = false;
    setInsetsHeld(false);
    return false;
  }
  setStatusBarHidden(true, 'none');
  capTimer = setTimeout(() => void cancelScreenSwitch(), COVER_CAP_MS);
  return true;
};

// 끝·취소: 이 전환의 정리만(그사이 새 전환이 시작됐으면 그 상태를 건드리지 않음)
const settle = async (run: () => Promise<void> | undefined, animation: 'fade' | 'none') => {
  const mine = generation;
  clearCap();
  try {
    await run();
  } finally {
    if (mine === generation) {
      active = false;
      setStatusBarHidden(false, animation);
      releaseInsetsLater();
    }
  }
};

export const finishScreenSwitch = () => settle(() => ScreenSwitch?.finish(), 'fade');

export const cancelScreenSwitch = () => settle(() => ScreenSwitch?.cancel(), 'none');
