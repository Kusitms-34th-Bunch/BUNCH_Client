import {
  readHistoryEntry,
  removeHistoryEntry,
  writeHistoryEntry,
} from '@/shared/lib/navigation/historyEntry';
import { FEED_PATHS } from '../constants/paths';

const ATTR = 'data-ssgoi-transition';
const HISTORY_KEY = 'leftToBunch';
const BUNCH_DRILL_ID = FEED_PATHS.transitionIds.bundleToBunch;

// 상세 틀의 전환 id를 번치 drill용으로 바꿈. 이 화면에 남은 채 다음 입력·기록 이동이 오면 원래 id로 되돌림(push 완료·실패를 알 수 없음)
const holdBunchDrillId = (page: Element) => {
  const id = page.getAttribute(ATTR);
  if (!id || id === BUNCH_DRILL_ID) return;
  page.setAttribute(ATTR, BUNCH_DRILL_ID);
  // 첫 입력 하나만 봄(셋 중 하나가 오면 모두 해제). 이미 떠났거나 나가는 중이면 그대로 둠
  const listening = new AbortController();
  const restore = () => {
    listening.abort();
    if (!page.isConnected || page.hasAttribute('data-page-leaving')) return;
    page.setAttribute(ATTR, id);
    clearLeftToBunch();
  };
  for (const type of ['pointerdown', 'keydown', 'popstate'])
    window.addEventListener(type, restore, { capture: true, signal: listening.signal });
};

const clearLeftToBunch = () => removeHistoryEntry(HISTORY_KEY);

/** 번치 이름으로 떠나기 직전: drill id 적용과 이 기록 항목 표시(돌아올 때 같은 id 사용) */
export const leaveToBunch = (page: Element) => {
  holdBunchDrillId(page);
  writeHistoryEntry({ [HISTORY_KEY]: true });
};

// 돌아오는 drill이 끝나길 기다리는 최대 시간
const RETURN_WAIT_MS = 1000;

/**
 * 번치 drill로 떠났던 항목에 다시 그려질 때: 같은 id로 둬 SSGOI가 push 때 기억한 drill을 반대로 재생
 * (id가 다르면 기억한 규칙과 맞지 않아 격자 zoom이 열리는 모양이 됨). 전환이 끝나면 원래 id로 되돌림
 * 뒤로 가기의 popstate는 Next가 먼저 처리해 전환이 시작된 뒤라, 입력을 기다리지 않고 끝나는 시점에 되돌림
 */
export const returnFromBunch = (page: Element) => {
  const id = page.getAttribute(ATTR);
  if (!readHistoryEntry(HISTORY_KEY) || !id || id === BUNCH_DRILL_ID) return;
  page.setAttribute(ATTR, BUNCH_DRILL_ID);
  // 표시는 지금 항목일 때 바로 지움(기다리는 동안 다른 화면으로 가면 엉뚱한 항목을 지움)
  clearLeftToBunch();
  const startedAt = performance.now();
  const restore = () => {
    if (
      document.querySelector('[data-page-leaving]') !== null &&
      performance.now() - startedAt < RETURN_WAIT_MS
    ) {
      requestAnimationFrame(restore);
      return;
    }
    if (page.isConnected) page.setAttribute(ATTR, id);
  };
  requestAnimationFrame(restore);
};
