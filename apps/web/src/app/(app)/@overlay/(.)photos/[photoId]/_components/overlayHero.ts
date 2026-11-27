// 사진함 칸 ↔ 겹친 사진 상세의 hero(#598). 페이지 전환이 아니라 SSGOI hero 대신 직접 움직임
import { PHOTO_HERO_EASING, PHOTO_HERO_MS } from '../../../../_transitions/photoHeroMotion';

// 들어갈 때는 SSGOI 사진 hero와 같은 곡선·시간, 닫기는 같은 곡선으로 조금 짧게
export const HERO_OPEN_MS = PHOTO_HERO_MS;
export const HERO_CLOSE_MS = 400;
export const HERO_EASING = `cubic-bezier(${PHOTO_HERO_EASING.join(', ')})`;

type Box = { left: number; top: number; width: number; height: number };

const boxOf = (element: Element): Box => {
  const { left, top, width, height } = element.getBoundingClientRect();
  return { left, top, width, height };
};

const onScreen = ({ left, top, width, height }: Box) =>
  width > 0 &&
  height > 0 &&
  top + height > 0 &&
  top < window.innerHeight &&
  left < window.innerWidth;

/** 상세의 지금 사진과 그 사진의 사진함 칸(둘 다 보일 때만) */
export const findHeroPair = (overlay: ParentNode, under: ParentNode) => {
  const target = overlay.querySelector<HTMLImageElement>('img[data-hero-exit-key]');
  const key = target?.dataset.heroExitKey;
  if (!target || !key) return null;
  const source = under.querySelector<HTMLElement>(`[data-hero-enter-key="${CSS.escape(key)}"]`);
  if (!source || !onScreen(boxOf(source)) || !onScreen(boxOf(target))) return null;
  return { source, target };
};

/**
 * 받은 사진을 캔버스에 그린 복사본(object-cover와 같게 자름)
 * WebKit은 캐시에 있는 사진도 새 img는 몇 프레임 비어, 날아가는 복사본을 img로 만들면 빈 채로 날았음
 */
const paintCopy = (image: HTMLImageElement, box: Box) => {
  const canvas = document.createElement('canvas');
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(box.width * scale));
  canvas.height = Math.max(1, Math.round(box.height * scale));
  const { naturalWidth: width, naturalHeight: height } = image;
  const cover = Math.max(box.width / width, box.height / height);
  const cropWidth = box.width / cover;
  const cropHeight = box.height / cover;
  canvas
    .getContext('2d')
    ?.drawImage(
      image,
      (width - cropWidth) / 2,
      (height - cropHeight) / 2,
      cropWidth,
      cropHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    );
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'fixed',
    left: `${box.left}px`,
    top: `${box.top}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
    zIndex: '60',
    pointerEvents: 'none',
    transformOrigin: 'center',
  });
  return canvas;
};

/** 상세 사진 자리(target)에 그린 복사본을 칸(source) 크기로 보이게 하는 상태: 칸을 덮도록 줄이고 넘친 부분은 자름 */
const fittedTo = (target: Box, source: Box): Keyframe => {
  const scale = Math.max(source.width / target.width, source.height / target.height);
  const insetY = (target.height - source.height / scale) / 2;
  const insetX = (target.width - source.width / scale) / 2;
  const dx = source.left + source.width / 2 - (target.left + target.width / 2);
  const dy = source.top + source.height / 2 - (target.top + target.height / 2);
  return {
    transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
    clipPath: `inset(${insetY}px ${insetX}px)`,
  };
};
const settled: Keyframe = { transform: 'translate(0px, 0px) scale(1)', clipPath: 'inset(0px 0px)' };

/**
 * 칸에서 상세 자리로(open) 또는 상세 자리에서 칸으로(close) 날 복사본을 지금 위치로 준비하고, start로 날림(끝나면 치움)
 * 닫기는 화면이 빠지기 전에 위치를 재 두고 실제로 빠졌을 때만 날리려고 둘로 나눔
 */
export const prepareHero = (
  pair: { source: HTMLElement; target: HTMLImageElement },
  direction: 'open' | 'close',
) => {
  const targetBox = boxOf(pair.target);
  const copy = paintCopy(pair.target, targetBox);
  const atSource = fittedTo(targetBox, boxOf(pair.source));
  return () => {
    document.body.append(copy);
    const animation = copy.animate(
      direction === 'open' ? [atSource, settled] : [settled, atSource],
      {
        duration: direction === 'open' ? HERO_OPEN_MS : HERO_CLOSE_MS,
        easing: HERO_EASING,
        fill: 'forwards',
      },
    );
    const done = animation.finished.then(
      () => undefined,
      () => undefined,
    );
    return {
      finished: done.then(() => copy.remove()),
      cancel: () => {
        animation.cancel();
        copy.remove();
      },
    };
  };
};

export const flyHero = (
  pair: { source: HTMLElement; target: HTMLImageElement },
  direction: 'open' | 'close',
) => prepareHero(pair, direction)();
