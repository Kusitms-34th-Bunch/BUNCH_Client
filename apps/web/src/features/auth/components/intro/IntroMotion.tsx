import type { LottieHandle } from 'lottie-react';
import { cn } from '@app/design-system';
import { useEffect, useRef, useState } from 'react';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { createLottieLoader, type LoadedLottie } from '@/shared/lib/lottieLoader';
import { GUIDE_IMAGES } from './guideImages';
import { IntroRows } from './IntroRows';
import { IntroTouchHint } from './IntroTouchHint';
import { useTileStackIdle } from './useTileStackIdle';

// 디자이너 Lottie(인트로_01~04)에서 흐르는 줄·가짜 상태 바·흰 배경을 뺀 것. 흐르는 줄은 IntroRows가 그림
const loadIntro = createLottieLoader(() => import('@/shared/assets/lotties/intro.json'));
// 장면마다 문구가 다 나온 뒤 멈추는 프레임(60fps). 누르면 다음 멈춤까지 재생, 브랜드 화면(809f)은 끝나면 바로 가이드로
const HOLDS = [141, 360, 540, 809] as const;
// 브랜드 화면 → 가이드: 가이드 장 전환(Figma `6105:42792`)과 같은 사라짐 350ms, 50ms 뒤 가이드가 나타남
const LEAVE_MS = 350;
const LEAVE_GAP_MS = 50;
// Lottie는 가짜 상태 바(62pt)까지 그린 375×812 화면이라 그만큼 위로 올림
const STATUS_BAR = 62;
const SCENES = [
  '함께한 순간이 모이는 공간, 번치에 오신 걸 환영해요!',
  '우리 모임이 함께 쓰는 하나의 계정, 번치',
  '함께 기록하고, 우리만의 추억을 쌓아보세요.',
  'bunch, 함께한 순간이 모이는 곳',
];
const LAST = HOLDS.length - 1;
// 첫 장면 다이아몬드가 다 쌓이는 프레임(타일 키프레임 끝 96.6f). 멈춤(141f)까지 기다리지 않고 여기서 떠오르기 시작
const STACKED_FRAME = 97;
// 장면마다 문구·그림이 다 나와 그 뒤 멈춤까지 화면이 그대로인 프레임. 여기서부터 누를 수 있고, 누르면 멈춤 프레임으로 건너뛰어 다음 전환
// (장면 2: 문구 234f·타일 등장 ~277f, 장면 3: 문구 405f·사진 등장 ~440f. 흐르는 줄은 DOM이라 Lottie 화면은 그대로)
const READY_FRAMES = [STACKED_FRAME, 280, 440] as const;

type IntroMotionProps = {
  /** 브랜드 모션이 끝나거나 애니메이션을 불러오지 못했을 때 */
  onNext: () => void;
  /** 「건너뛰기」 */
  onSkip: () => void;
};

/**
 * 인트로 01~04(Figma `5730:143512`): 화면이나 오른쪽 아래 버튼을 누를 때마다 다음 장면, 브랜드 모션이 끝나면 가이드로
 * 문구는 Lottie 속 그림이라 보조 기술에는 지금 장면 문구를 따로 읽힘. 동작 줄이기면 재생 없이 장면의 멈춤 프레임만 넘김
 */
export function IntroMotion({ onNext, onSkip }: IntroMotionProps) {
  const lottieRef = useRef<LottieHandle>(null);
  const [lottie, setLottie] = useState<LoadedLottie | null>(null);
  const [scene, setScene] = useState(0);
  // 지금 재생이 브랜드 모션인지(끝나면 저절로 가이드로)
  const toGuideOnEnd = useRef(false);
  // 내용이 다 나와 누를 수 있게 된 장면(첫 장면은 다 쌓이면). 재생이 끝나면(complete)도 같은 장면으로 맞춤
  const [readyScene, setReadyScene] = useState(-1);
  const playingScene = useRef(0);
  const readyTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [brand, setBrand] = useState(false);
  // 브랜드 화면이 흐려지며 가이드로 넘어가는 중
  const [leaving, setLeaving] = useState(false);
  const still = useReducedMotion();
  const brandTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stacked, setStacked] = useState(false);
  // 첫 장면 다이아몬드가 다 쌓인 뒤 넘기기 전까지만
  useTileStackIdle(stageRef, Boolean(lottie) && scene === 0 && stacked && !still);
  const ready = still || readyScene === scene || (scene === 0 && stacked);
  const nextRef = useRef<HTMLButtonElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  // 브랜드 화면에서 「건너뛰기」가 사라지면 그 위의 초점이 body로 떨어지지 않게 다음 버튼으로 옮김
  const showBrand = () => {
    if (document.activeElement === skipRef.current) nextRef.current?.focus();
    setBrand(true);
  };

  useEffect(() => {
    let alive = true;
    loadIntro()
      .then((loaded) => {
        if (alive) setLottie(loaded);
      })
      // 애니메이션 없이는 장면을 보일 수 없어 가이드로
      .catch(() => {
        if (alive) onNext();
      });
    return () => {
      alive = false;
      clearTimeout(brandTimer.current);
      clearTimeout(readyTimer.current);
    };
  }, [onNext]);

  const next = () => {
    const player = lottieRef.current;
    // 내용이 다 나오기 전에 누르면 화면과 읽히는 문구가 한 장면씩 어긋나므로 그 뒤에만 넘김
    if (!player || !ready) return;
    if (scene === LAST) {
      // 자동 전환이 이미 시작됐으면 무시하고, 직접 넘기면 남은 자동 전환을 지워 두 번 넘어가지 않게
      if (leaving) return;
      clearTimeout(brandTimer.current);
      return onNext();
    }
    const to = scene + 1;
    const fromFrame = HOLDS[scene]!;
    const toFrame = HOLDS[to]!;
    setScene(to);
    // 가이드 첫 장 이미지를 브랜드 화면 동안 받아 둬 나타날 때 비어 있지 않게
    if (to === LAST) new Image().src = GUIDE_IMAGES[0];
    if (still) {
      player.seek(toFrame);
      // 동작 줄이기는 자동으로 넘기지 않고 다른 장면처럼 눌러서 가이드로(읽기 전에 넘어가지 않게)
      if (to === LAST) showBrand();
      return;
    }
    toGuideOnEnd.current = to === LAST;
    playingScene.current = to;
    // 멈춤 프레임 전(그대로인 구간)에 눌렀어도 멈춤 프레임부터 재생해 바로 반응
    player.playSegments([fromFrame, toFrame]);
    clearTimeout(readyTimer.current);
    if (to < LAST) {
      readyTimer.current = setTimeout(
        () => setReadyScene(to),
        ((READY_FRAMES[to]! - fromFrame) / 60) * 1000,
      );
    }
    // 누르는 즉시 알려 Safe Area(AppFrame)도 안쪽 브랜드 배경과 같은 시점·시간(200ms 뒤 550ms)으로 칠해지게
    if (to === LAST) showBrand();
  };

  const Player = lottie?.Player;
  return (
    // 브랜드 배경은 AppFrame(미리보기는 오버레이) 하나가 Safe Area까지 칠함. 따로 칠하면 경계가 늦게 따라와 보임
    <PageShell
      className="@container relative overflow-hidden bg-transparent"
      data-app-background={brand && !leaving ? 'brand' : undefined}
    >
      {/* 1 디자인 px(375 폭 기준)을 화면 폭에 맞춘 단위. 줄과 Lottie가 같은 좌표를 씀 */}
      <div
        ref={stageRef}
        // 흐려지는 동안 바깥 배경도 같은 시간·곡선으로 흰색으로 돌아가게 AppFrame에 알림
        data-brand-leaving={leaving ? '' : undefined}
        className={cn(
          'pointer-events-none absolute left-0 w-full',
          leaving && 'opacity-0 transition-opacity duration-350 ease-[cubic-bezier(0.45,0,0.55,1)]',
        )}
        style={{
          ['--u' as string]: 'calc(100cqw / 375)',
          top: `calc(${-STATUS_BAR} * var(--u))`,
          height: 'calc(812 * var(--u))',
        }}
      >
        <IntroRows scene={scene} still={still} />
        {Player && lottie ? (
          <Player
            src={lottie.data}
            lottieRef={lottieRef}
            autoplay={!still}
            loop={false}
            // 동작 줄이기는 전체를 범위로 두고 멈춤 프레임으로 옮김
            segment={[0, still ? HOLDS[3] : HOLDS[0]]}
            subscriptions={{
              ready: () => {
                if (still) lottieRef.current?.seek(HOLDS[0]);
              },
              // 첫 재생 범위가 0f부터라 이 프레임은 Lottie의 프레임과 같음
              frame: ({ currentFrame }) => {
                if (currentFrame >= STACKED_FRAME) setStacked(true);
              },
              complete: () => {
                setReadyScene(playingScene.current);
                // 브랜드 모션이 끝나면 누르지 않아도 흐려지며 가이드로
                if (toGuideOnEnd.current) {
                  setLeaving(true);
                  brandTimer.current = setTimeout(onNext, LEAVE_MS + LEAVE_GAP_MS);
                }
              },
              error: onNext,
            }}
            className="absolute inset-0"
            aria-hidden="true"
          />
        ) : null}
        {/* 누를 수 있을 때만 보이고, 브랜드 화면으로 넘기기 시작하면 사라짐(Lottie 540~558f) */}
        <IntroTouchHint shown={Boolean(lottie) && scene < LAST && ready} />
      </div>
      <h1 className="sr-only">BUNCH</h1>
      {/* 빈 채로 먼저 두고 애니메이션을 불러온 뒤 채움(내용과 함께 끼우면 첫 문구를 읽지 않는 스크린 리더가 있음) */}
      <p aria-live="polite" className="sr-only">
        {lottie ? SCENES[scene] : ''}
      </p>
      {/* 화면 어디를 눌러도 다음 장면(오른쪽 아래 둥근 원은 안내 그림 IntroTouchHint). 브랜드 화면은 모션이 끝나면 저절로 넘어감 */}
      {/* 넘기는 중에는 눌러도 반응하지 않으므로 그 상태를 알림 */}
      <button
        ref={nextRef}
        type="button"
        aria-label="다음 장면"
        aria-disabled={!lottie || !ready || leaving ? true : undefined}
        onClick={next}
        className="focus-visible:outline-border-brand absolute inset-0 focus-visible:outline-2 focus-visible:-outline-offset-4"
      />
      {/* Lottie 속 「건너뛰기 >」 자리(브랜드 화면에서는 Lottie에서도 사라짐). 누를 영역을 넓게 둠 */}
      {brand ? null : (
        <button
          ref={skipRef}
          type="button"
          onClick={onSkip}
          className="h-s18 focus-visible:outline-border-brand absolute top-0 right-0 w-28 focus-visible:outline-2 focus-visible:-outline-offset-4"
        >
          <span className="sr-only">건너뛰기</span>
        </button>
      )}
    </PageShell>
  );
}
