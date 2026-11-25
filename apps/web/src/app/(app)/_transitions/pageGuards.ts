import type { ComponentProps } from 'react';
import { type MultiAnimation } from '@ssgoi/react';
import { type WebAnimation } from '@ssgoi/react/view-transitions';
import type { PageShell } from '@/shared/components/layout/PageShell';

// 나가는 화면은 포커스·보조기술에서 제외(inert)하고 data-page-leaving 표식(AppFrame이 그 화면의 배경 표식을 무시해 상태 바 영역도 함께 전환)
// 중단된 이전 전환에서 돌아오는 DOM은 다시 조작 가능하게 처리
const guardPair = (
  incoming: HTMLElement | undefined,
  outgoing: HTMLElement | undefined,
  track: WebAnimation | undefined,
) => {
  if (incoming) {
    incoming.inert = false;
    delete incoming.dataset.pageLeaving;
    delete incoming.dataset.sheetMoving;
  }
  if (!outgoing || !track) return;
  const wasInert = outgoing.inert;
  const dispose = track.onDispose;
  outgoing.inert = true;
  outgoing.dataset.pageLeaving = '';
  track.onDispose = (context) => {
    dispose?.(context);
    if (!context.owns(outgoing)) return;
    outgoing.inert = wasInert;
    delete outgoing.dataset.pageLeaving;
  };
};
export const guardOutgoing = (animation: MultiAnimation<'out' | 'in'>) => {
  const outgoing = animation.select('out').getMotionTracks()[0];
  guardPair(animation.select('in').getMotionTracks()[0]?.element, outgoing?.element, outgoing);
};
// 다른 전환과 같이 나가는 화면은 전환 동안 inert·나가는 화면 표식(초점·상태 바 배경)
export const guardHero = ({
  animation,
}: {
  animation: MultiAnimation<'shared' | 'out' | 'in'>;
}) => {
  const outgoing = animation.select('out').getMotionTracks()[0];
  guardPair(animation.select('in').getMotionTracks()[0]?.element, outgoing?.element, outgoing);
};
// zoom 프리셋의 나가는 화면은 경계 id로 찾아 다른 전환과 같은 표식
type ZoomGroup = 'overlay' | 'content' | 'chrome' | 'background' | 'tile';
export const guardZoom =
  (opening: boolean, behindIds: readonly string[], frontId: string) =>
  ({
    animation,
    context,
  }: {
    animation: MultiAnimation<ZoomGroup>;
    context: { positionedParent: HTMLElement };
  }) => {
    const groups: ZoomGroup[] = ['tile', 'content', 'overlay', 'chrome', 'background'];
    const track = groups.map((group) => animation.select(group).getMotionTracks()[0]).find(Boolean);
    const last = (id: string) =>
      [
        ...context.positionedParent.querySelectorAll<HTMLElement>(
          `[data-ssgoi-transition="${id}"]`,
        ),
      ].at(-1);
    const behind = behindIds.map(last).find(Boolean);
    const front = last(frontId);
    if (opening) guardPair(front, behind, track);
    else guardPair(behind, front, track);
  };
// AppFrame 상태 바 색 전환(motion-safe duration-150)보다 조금 길게
const SHEET_BAND_HOLD_MS = 200;
type SheetGuard = { timer?: ReturnType<typeof setTimeout>; frame?: number };
// 요소마다 마지막으로 맡은 시트 전환(중단·재사용된 노드에서 이전 전환이 새 전환의 표식을 지우지 않게)
const sheetGuards = new WeakMap<HTMLElement, SheetGuard>();
// 시트 요소의 표식은 모두 guardSheet가 붙인 것이라 통째로 지움
const clearSheetMarks = (element: HTMLElement) => {
  clearTimeout(sheetGuards.get(element)?.timer);
  const frame = sheetGuards.get(element)?.frame;
  if (frame !== undefined) cancelAnimationFrame(frame);
  delete element.dataset.sheetMoving;
  delete element.dataset.sheetArrived;
  delete element.dataset.sheetBand;
  delete element.dataset.appBackground;
  // 화면 이동 띠가 같은 요소에 붙어 있으면 그 띠는 guardPush 정리에 맡김
  if (element.dataset.pushBand === undefined) element.style.removeProperty('box-shadow');
};
// sheet 프리셋은 움직이는 화면(sheet)만 track이라 뒤 화면은 경계 id로 찾아 나가는 화면 표식(상태 바 색 즉시 전환)
// 중단된 이전 전환의 노드가 남아 있을 수 있어 같은 id 중 가장 나중에 붙은 노드 사용
export const guardSheet =
  (opening: boolean, behindId: string) =>
  ({
    animation,
    context,
  }: {
    animation: MultiAnimation<'overlay' | 'sheet' | 'background'>;
    context: { positionedParent: HTMLElement };
  }) => {
    const track = animation.select('sheet').getMotionTracks()[0];
    if (!track) return;
    const sheetElement = track.element;
    // 중단된 이전 전환이 남긴 표식·띠를 지우고 이번 전환을 이 요소의 주인으로 둠
    clearSheetMarks(sheetElement);
    const guard: SheetGuard = {};
    sheetGuards.set(sheetElement, guard);
    const behind = [
      ...context.positionedParent.querySelectorAll<HTMLElement>(
        `[data-ssgoi-transition="${behindId}"]`,
      ),
    ].at(-1);
    if (opening) guardPair(sheetElement, behind, track);
    else guardPair(behind, sheetElement, track);
    // 움직이는 동안 AppFrame이 상태 바 영역 색을 시트 도착에 맞춰 천천히 바꾸도록 표식
    sheetElement.dataset.sheetMoving = '';
    // 올라오는 동안은 상태 바 영역을 뒤 화면 색으로 둠(뒤 화면은 떠나는 화면이라 AppFrame이 무시하므로 시트에 잠시 옮김)
    const keep = opening
      ? behind?.querySelector('[data-app-background]')?.getAttribute('data-app-background')
      : null;
    if (keep) {
      sheetElement.dataset.appBackground = keep;
      // 스프링 멈춤 신호(onDispose)는 보이는 도착보다 1초 넘게 늦어 실제 위치로 판단: 절반을 지나면 배경 색을 300ms에 걸쳐 바꾸기 시작하고
      // 남은 이동이 1px 아래면(도착) 남은 색 전환 없이 바로 맞춤
      let moved = false;
      let farthest = 0;
      const watch = () => {
        const offset = new DOMMatrixReadOnly(getComputedStyle(sheetElement).transform).m42;
        farthest = Math.max(farthest, Math.abs(offset));
        if (moved && Math.abs(offset) < farthest / 2) delete sheetElement.dataset.appBackground;
        if (Math.abs(offset) >= 1) moved = true;
        else if (moved) {
          delete sheetElement.dataset.appBackground;
          delete sheetElement.dataset.sheetMoving;
          sheetElement.dataset.sheetArrived = '';
          return;
        }
        guard.frame = requestAnimationFrame(watch);
      };
      guard.frame = requestAnimationFrame(watch);
    }
    // 시트 위·아래 안전 영역 높이의 흰 띠: 올라오며 상태 바·아래 영역을 덮고 내려가며 뒤 화면 색을 드러냄(iOS 전체 화면 모달처럼)
    // 전환 영역은 넘침을 잘라서 띠가 있는 동안만 위아래로 넓힘(data-sheet-band, AppTransitions 전환 영역 className)
    sheetElement.dataset.sheetBand = '';
    sheetElement.style.boxShadow =
      '0 calc(-1 * var(--safe-area-top, 0px)) 0 var(--color-surface-primary), 0 var(--safe-area-bottom, 0px) 0 var(--color-surface-primary)';
    const dispose = track.onDispose;
    track.onDispose = (disposal) => {
      dispose?.(disposal);
      // 이 요소를 새로 맡은 전환이 있으면 그 표식을 건드리지 않음. 중단됐으면 남긴 표식만 지움
      if (sheetGuards.get(sheetElement) !== guard) return;
      if (!disposal.owns(sheetElement)) {
        clearSheetMarks(sheetElement);
        return;
      }
      if (guard.frame !== undefined) cancelAnimationFrame(guard.frame);
      delete sheetElement.dataset.sheetMoving;
      delete sheetElement.dataset.sheetArrived;
      if (keep) delete sheetElement.dataset.appBackground;
      // 띠는 AppFrame 색 전환(150ms)이 끝난 뒤에 걷음(도착 순간 덜 바뀐 색이 비치지 않게)
      // ponytail: 고정 지연, 전환 시간이 바뀌면 함께 맞춤
      guard.timer = setTimeout(() => {
        if (sheetElement.dataset.pushBand === undefined) {
          sheetElement.style.removeProperty('box-shadow');
        }
        delete sheetElement.dataset.sheetBand;
      }, SHEET_BAND_HOLD_MS);
    };
  };

// 화면 배경 표식 → 상태 바 띠 색(AppFrame이 칠하는 색과 같음, 투명은 띠 없음)
type BandBackground = Exclude<
  NonNullable<ComponentProps<typeof PageShell>['data-app-background']>,
  'transparent'
>;
// 키를 PageShell 목록으로 묶어 배경 값이 늘면 typecheck에서 걸림
const BAND_COLORS: Record<BandBackground, string> = {
  'brand-subtle-1': 'var(--color-surface-brand-subtle-1)',
  brand: 'var(--color-primitive-gray-800)',
  secondary: 'var(--color-surface-secondary)',
  'orange-50': 'var(--color-primitive-orange-50)',
  'pink-50': 'var(--color-primitive-pink-50)',
  'green-50': 'var(--color-primitive-green-50)',
};
const bandColorOf = (page: HTMLElement) => {
  const marker = page.matches('[data-app-background]')
    ? page
    : page.querySelector('[data-app-background]');
  const value = marker?.getAttribute('data-app-background');
  if (value === 'transparent') return undefined;
  return (value && BAND_COLORS[value as BandBackground]) || 'var(--color-surface-primary)';
};
// 요소마다 마지막으로 띠를 붙인 전환(중단 뒤 이전 전환의 정리가 새 띠를 지우지 않게)
const pushBands = new WeakMap<HTMLElement, object>();
/**
 * drill·slide 동안 두 화면 위에 상태 바 높이의 자기 색 띠를 붙여 상태 바 영역도 화면과 함께 밀림
 * (AppFrame 색은 띠 아래에서 바뀌어 보이지 않음, 전환 영역은 data-push-band 동안 위로 넓힘)
 */
export const guardPush = (animation: MultiAnimation<'out' | 'in'>) => {
  guardOutgoing(animation);
  for (const track of [
    animation.select('in').getMotionTracks()[0],
    animation.select('out').getMotionTracks()[0],
  ]) {
    if (!track) continue;
    const page = track.element;
    const color = bandColorOf(page);
    if (!color) continue;
    const owner = {};
    pushBands.set(page, owner);
    page.dataset.pushBand = '';
    page.style.boxShadow = `0 calc(-1 * var(--safe-area-top, 0px)) 0 ${color}`;
    const dispose = track.onDispose;
    track.onDispose = (context) => {
      dispose?.(context);
      if (pushBands.get(page) !== owner) return;
      pushBands.delete(page);
      delete page.dataset.pushBand;
      // sheet 띠가 같은 요소에 남아 있으면 그 띠는 sheet 정리에 맡김
      if (page.dataset.sheetBand === undefined) page.style.removeProperty('box-shadow');
    };
  }
};
