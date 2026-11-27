'use client';

import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PHOTO_BOX_PATHS } from '@/features/photo-box/constants/paths';
import { SWIPE_BACK_EVENT } from '@/shared/hooks/native/useSwipeBackSettled';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import {
  findHeroPair,
  flyHero,
  HERO_CLOSE_MS,
  HERO_EASING,
  HERO_OPEN_MS,
  prepareHero,
} from './overlayHero';

// 상세 사진이 그려지기를 기다리는 최대 시간(그동안 사진함이 그대로 보임)
const READY_LIMIT_MS = 200;

const DETAIL_PREFIX = PHOTO_BOX_PATHS.detail('');
// Web Animations를 못 쓰는 환경(오래된 브라우저·테스트)에서는 움직임 없이 열고 닫음
const canAnimate = () => typeof Element.prototype.animate === 'function';

const underlay = () => document.querySelector<HTMLElement>('[data-overlay-under]');

// 상세의 지금 사진이 받아져 그릴 수 있을 때까지(최대 READY_LIMIT_MS)
const targetReady = (overlay: HTMLElement) =>
  new Promise<void>((resolve) => {
    const startedAt = performance.now();
    const check = () => {
      const image = overlay.querySelector<HTMLImageElement>('img[data-hero-exit-key]');
      const late = performance.now() - startedAt > READY_LIMIT_MS;
      if (image?.complete && image.naturalWidth > 0) {
        void image.decode().then(resolve, resolve);
        return;
      }
      if (late) resolve();
      else requestAnimationFrame(check);
    };
    check();
  });

/**
 * 닫히는 상세를 복제해 흐리게 사라지게 하고 지금 사진은 칸으로 날림(복제본은 누름·초점·보조기술에서 제외)
 * 탭 바·플로팅 버튼은 복제본이 비켜난 뒤 나타남(data-page-leaving, nativeBottomCover)
 */
const prepareClose = (overlay: HTMLElement) => {
  const under = underlay();
  const pair = under ? findHeroPair(overlay, under) : null;
  const ghost = overlay.cloneNode(true) as HTMLElement;
  ghost.removeAttribute('data-screen-overlay');
  ghost.dataset.pageLeaving = '';
  ghost.inert = true;
  ghost.setAttribute('aria-hidden', 'true');
  for (const element of ghost.querySelectorAll<HTMLElement>('[data-hero-exit-key]')) {
    element.removeAttribute('data-hero-exit-key');
    element.style.visibility = 'hidden';
  }
  // 칸은 숨기지 않음(복사본이 그 위에 내려앉아 구멍이 보이지 않음)
  const startFly = pair ? prepareHero(pair, 'close') : undefined;
  return () => {
    // React가 관리하는 부모 밖(body)에 붙여 재조정과 섞이지 않게
    document.body.append(ghost);
    const fade = ghost.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: HERO_CLOSE_MS,
      easing: HERO_EASING,
      fill: 'forwards',
    });
    const fly = startFly?.();
    void Promise.all([fade.finished.catch(() => undefined), fly?.finished]).then(() =>
      ghost.remove(),
    );
    // 애니메이션이 멈춰도 복제본이 남지 않게(남으면 나가는 화면 표식이 탭 바·토스트를 계속 기다리게 함)
    setTimeout(() => ghost.remove(), HERO_CLOSE_MS * 2);
  };
};

// 숨겨 둔 칸·상세 사진을 되돌림
const show = (...elements: (HTMLElement | null | undefined)[]) => {
  for (const element of elements) if (element) element.style.visibility = '';
};
const hide = (...elements: HTMLElement[]) => {
  for (const element of elements) element.style.visibility = 'hidden';
};

/**
 * 사진함에서 연 사진 상세를 사진함 위에 겹쳐 띄움(#598). 사진함은 그대로 남아 돌아올 때 다시 그리지 않음
 * 돌아올 때 사진함을 새로 그리면 WebKit에서 캐시에 있는 사진도 몇 프레임 비어 칸이 하얗게 보였음
 * 지금 주소가 사진 상세일 때만 보임(병렬 slot은 다른 경로로 가도 이전 화면을 남겨 둠). 열고 닫을 때 칸과 상세 사진을 hero로 이음
 */
export function PhotoDetailOverlay({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // 상세에서 사진을 넘기면 주소만 그 사진으로 바뀜(replaceUrl)이라 사진 상세 주소면 열린 것으로 봄
  const active =
    pathname.startsWith(DETAIL_PREFIX) && !pathname.slice(DETAIL_PREFIX.length).includes('/');
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  // iOS 스와이프 뒤로 가기면 쉘이 미는 화면을 맡아 닫는 hero를 건너뜀
  const swiping = useRef(false);
  const [shown, setShown] = useState(active);
  const [leaving, setLeaving] = useState(false);
  if (active && (!shown || leaving)) {
    setShown(true);
    setLeaving(false);
  }
  if (!active && shown && !leaving) setLeaving(true);

  useEffect(() => {
    const onSwipe = (event: Event) => {
      swiping.current = (event as CustomEvent<unknown>).detail === true;
    };
    window.addEventListener(SWIPE_BACK_EVENT, onSwipe);
    return () => window.removeEventListener(SWIPE_BACK_EVENT, onSwipe);
  }, []);

  // 떠 있는 동안 뒤 사진함은 누름·초점·보조기술에서 제외(RouteFocus도 inert 밖의 h1을 찾음)
  const covering = shown && !leaving;
  useLayoutEffect(() => {
    const under = underlay();
    if (!under || !covering) return;
    under.inert = true;
    return () => {
      under.inert = false;
    };
  }, [covering]);

  // 열기: 상세 사진이 그려진 뒤 칸에서 날아오고 상세 화면은 나타남(그 전에는 보이지 않게 둠)
  const opened = useRef(false);
  useLayoutEffect(() => {
    const overlay = ref.current;
    if (!overlay || !covering || opened.current) return;
    opened.current = true;
    if (reducedMotion || !canAnimate()) return;
    overlay.style.opacity = '0';
    let cancelled = false;
    let fly: ReturnType<typeof flyHero> | undefined;
    let pair: ReturnType<typeof findHeroPair> = null;
    let under: HTMLElement | null = null;
    let markTimer: ReturnType<typeof setTimeout> | undefined;
    void targetReady(overlay).then(() => {
      if (cancelled) return;
      under = underlay();
      pair = under ? findHeroPair(overlay, under) : null;
      overlay.style.opacity = '';
      overlay.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: HERO_OPEN_MS,
        easing: HERO_EASING,
      });
      if (!pair) return;
      const { source, target } = pair;
      hide(target);
      // 날아가는 동안 뒤 사진함을 나가는 화면으로 표시: 상세의 원본 교체를 끝날 때까지 미루고(PhotoDetailSlide, 두 장 겹침 방지)
      // 누른 칸 뒤에 같은 사진을 깔아 숨긴 칸이 비지 않게 함(PhotoCell, #587)
      if (under) under.dataset.pageLeaving = '';
      // 끝 신호가 늦어도(앱이 뒤로 감 등) 표식이 남지 않게
      markTimer = setTimeout(() => {
        if (under) delete under.dataset.pageLeaving;
      }, HERO_OPEN_MS * 2);
      fly = flyHero(pair, 'open');
      // 날아가는 복사본이 그려진 다음 프레임에 칸을 숨김(먼저 숨기면 누른 칸이 한 프레임 흰 구멍으로 보임, #587)
      requestAnimationFrame(() => {
        if (!cancelled) hide(source);
      });
      void fly.finished.then(() => {
        show(source, target);
        if (under) delete under.dataset.pageLeaving;
      });
    });
    return () => {
      cancelled = true;
      fly?.cancel();
      overlay.style.opacity = '';
      show(pair?.source, pair?.target);
      clearTimeout(markTimer);
      if (under) delete under.dataset.pageLeaving;
    };
  }, [covering, reducedMotion]);

  // 닫기: 뒤로 가기는 Next가 이 slot을 바로 비워 언마운트되고, 앱 안 이동(삭제 뒤 사진함 등)은 주소만 바뀜
  // 두 경우 모두 DOM이 붙어 있는 순간 화면을 복제해 흐리게 하고 상세 사진은 칸으로 날려 보냄(prepareClose)
  const skipClose = useRef(false);
  useEffect(() => {
    skipClose.current = reducedMotion;
  }, [reducedMotion]);
  useLayoutEffect(() => {
    const overlay = ref.current;
    if (!leaving || !overlay) return;
    if (!skipClose.current && !swiping.current && canAnimate()) prepareClose(overlay)();
    swiping.current = false;
    opened.current = false;
    setShown(false);
  }, [leaving]);
  // 닫은 뒤 다시 열면 겹침 div가 새로 생겨, 언마운트 때는 마지막으로 붙은 div를 씀
  const lastOverlay = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    if (ref.current) lastOverlay.current = ref.current;
  });
  useLayoutEffect(
    () => () => {
      const overlay = lastOverlay.current;
      if (!overlay?.isConnected || skipClose.current || swiping.current || !canAnimate()) return;
      // 위치·복제본은 화면이 붙어 있는 지금 준비하고, 실제로 빠졌을 때만 재생(개발 모드 StrictMode의 다시 실행은 붙은 채라 건너뜀)
      const start = prepareClose(overlay);
      queueMicrotask(() => {
        if (!overlay.isConnected) start();
      });
    },
    [],
  );

  if (!shown) return null;
  return (
    <div
      ref={ref}
      data-screen-overlay=""
      // 단독 상세처럼 사진이 화면 끝까지(건너뛰기 링크 등은 in-data-bottom-bleed로 홈 인디케이터 위)
      data-bottom-bleed=""
      className="bg-surface-primary fixed inset-x-0 inset-y-0 z-40 mx-auto flex w-full max-w-(--app-max-width) flex-col pt-(--safe-area-top) pr-(--safe-area-right) pl-(--safe-area-left)"
    >
      {children}
    </div>
  );
}
