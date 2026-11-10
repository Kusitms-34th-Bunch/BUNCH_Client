import { type ReactNode, useEffect, useRef } from 'react';

// 좌표·시각은 디자이너 Lottie(인트로_01~04, 375×812·60fps) 기준. 1 디자인 px = --u
const FPS = 60;
const CENTER = 187.5;
// 줄은 210f부터 48f 동안 15.6px 가속한 뒤 초당 약 40px로 흐름. Lottie는 624f에서 멈추지만 화면은 누를 때까지 계속 흐름
const DRIFT_FROM = 210;
const EASE_FRAMES = 48;
const EASE_PX = 15.6;
const SPEED = (244.4 / 366) * FPS;
// 360f(장면 2→3을 누른 시각)까지 흐른 거리. 사라짐·나타남 순서의 기준점이 이만큼 옮겨 감
const DRIFT_AT_TAP = 83.7;
// 한 주기를 3벌 이어 붙여 한 주기만큼 옮기면 처음과 같은 화면(이음매 없이 반복)
const COPIES = 3;

const TILE = 95;
const TILE_PITCH = 101.5;
const CARD = { width: 168, height: 216, pitch: 178 };

// Figma `Asset / *`(9×9 격자, 가운데 5×5만 사용)
const TILES = {
  cross: {
    color: 'text-primitive-bunch-500',
    cells: ['..#..', '.#.#.', '#.#.#', '.#.#.', '..#..'],
  },
  ring: { color: 'text-primitive-pink-400', cells: ['..#..', '.#.#.', '#...#', '.#.#.', '..#..'] },
  square: {
    color: 'text-primitive-green-400',
    cells: ['#...#', '.###.', '.#.#.', '.###.', '#...#'],
  },
  diamond: {
    color: 'text-primitive-orange-400',
    cells: ['..#..', '.###.', '#####', '.###.', '..#..'],
  },
} as const;
type TileKind = keyof typeof TILES;

const TILE_PATHS = Object.fromEntries(
  Object.entries(TILES).map(([kind, { cells }]) => [
    kind,
    cells
      .flatMap((row, y) =>
        [...row].map((cell, x) => (cell === '#' ? `M${x + 2} ${y + 2}h1v1h-1z` : '')),
      )
      .join(''),
  ]),
) as Record<TileKind, string>;

// first: 210f에 한 주기 첫 칸의 가운데 x. enter: 나타나기 시작하는 프레임(타일은 210f 기준 절대, 사진은 360f 뒤)
const TILE_ROWS = [
  { y: 300.5, dir: -1, first: -15.5, enter: 206.4, items: ['ring', 'square', 'diamond', 'cross'] },
  { y: 409.5, dir: 1, first: -366.5, enter: 210, items: ['cross', 'ring', 'square', 'diamond'] },
] as const satisfies readonly Row<TileKind>[];
// 사진 번호는 public/images/intro/photo-N(Figma 인트로_03 Photo Card 1~7). 3·4·6은 Figma에서 살짝 기울어 있음
const PHOTO_ROWS = [
  { y: 222, dir: -1, first: -548, enter: 8.4, items: [2, 3, 4, 1] },
  { y: 451, dir: 1, first: -487, enter: 14.4, items: [6, 5, 7] },
] as const satisfies readonly Row<number>[];
const TILTED = new Set([3, 4, 6]);

type Row<Item> = {
  y: number;
  /** -1 왼쪽, 1 오른쪽 */
  dir: -1 | 1;
  first: number;
  enter: number;
  items: readonly Item[];
};

const u = (px: number) => `calc(${px} * var(--u))`;
const ms = (frames: number) => (frames / FPS) * 1000;

type TrackProps<Item> = {
  row: Row<Item>;
  pitch: number;
  height: number;
  /** 가만히 있을 때 보일지(동작 줄이기) */
  shown: boolean;
  render: (_item: Item) => ReactNode;
  kind: 'tile' | 'photo';
};

function Track<Item>({ row, pitch, height, shown, render, kind }: TrackProps<Item>) {
  const period = row.items.length * pitch;
  // 오른쪽으로 흐르는 줄은 한 주기 왼쪽에서 시작해야 흐르는 동안 왼쪽이 비지 않음
  const firstCenter = row.dir > 0 ? row.first - period : row.first;
  const cells = Array.from({ length: row.items.length * COPIES }, (_, index) => ({
    item: row.items[index % row.items.length]!,
    x: firstCenter + index * pitch,
  }));
  return (
    <div
      data-ease
      data-dir={row.dir}
      data-period={period}
      className="absolute"
      style={{ left: u(firstCenter - pitch / 2), top: u(row.y - height / 2) }}
    >
      <div data-track className="flex">
        {cells.map(({ item, x }, index) => (
          <div
            key={index}
            data-item={kind}
            data-x={x}
            data-enter={row.enter}
            data-dir={row.dir}
            className="flex shrink-0 items-center justify-center"
            style={{ width: u(pitch), height: u(height), opacity: shown ? 1 : 0 }}
          >
            {render(item)}
          </div>
        ))}
      </div>
    </div>
  );
}

function Tile({ kind }: { kind: TileKind }) {
  return (
    <svg
      viewBox="0 0 9 9"
      className={TILES[kind].color}
      style={{ width: u(TILE), height: u(TILE) }}
    >
      <path d={TILE_PATHS[kind]} fill="currentColor" />
    </svg>
  );
}

function PhotoCard({ photo }: { photo: number }) {
  return (
    // Figma 그림자(0 12 28 12%)는 토큰이 없어 가장 가까운 navi-bar 그림자
    <div
      className="border-border-inversed overflow-hidden border-solid shadow-(--shadow-navi-bar)"
      style={{
        width: u(CARD.width),
        height: u(CARD.height),
        borderWidth: u(4),
        borderRadius: u(20),
        rotate: TILTED.has(photo) ? '-0.31deg' : undefined,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/images/intro/photo-${photo}.webp`}
        alt=""
        draggable={false}
        className="size-full object-cover"
      />
    </div>
  );
}

type IntroRowsProps = {
  /** 0 다이아몬드, 1 타일 줄, 2 사진 줄, 3 브랜드 */
  scene: number;
  /** 동작 줄이기: 흐르지 않고 장면에 맞는 줄만 보임 */
  still: boolean;
};

/**
 * 인트로 장면 2·3의 흐르는 타일·사진 줄. 누를 때까지 머무는 동안에도 끊기지 않고 흐르도록 Lottie에서 빼 직접 그림
 * 나타남·사라짐은 Lottie 키프레임을 옮긴 것. 중앙(장면 3은 흐른 만큼 옮긴 기준점)에서 먼 칸일수록 늦음
 */
export function IntroRows({ scene, still }: IntroRowsProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof root.animate !== 'function') return;
    // 인트로 도중 동작 줄이기를 켜면 이미 흐르던 줄도 멈춤
    if (still) {
      root.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
      return;
    }
    const all = (selector: string) => Array.from(root.querySelectorAll<HTMLElement>(selector));
    // 화면 폭이 375가 아니어도 디자인 좌표로 거리를 잼
    const rootBox = root.getBoundingClientRect();
    const scale = rootBox.width / 375 || 1;
    const liveX = (element: HTMLElement) => {
      const box = element.getBoundingClientRect();
      return (box.left + box.width / 2 - rootBox.left) / scale;
    };

    if (scene === 1) {
      // 누른 시각(141f)부터 210f에 흐르기 시작
      const start = ms(DRIFT_FROM - 141);
      for (const ease of all('[data-ease]')) {
        const dir = Number(ease.dataset.dir);
        const period = Number(ease.dataset.period);
        ease.animate(
          [
            { transform: 'none' },
            { transform: `translateX(${(dir * EASE_PX * 100) / (period * COPIES)}%)` },
          ],
          {
            duration: ms(EASE_FRAMES),
            delay: start,
            easing: 'cubic-bezier(0.42, 0, 1, 1)',
            fill: 'forwards',
          },
        );
        ease
          .querySelector<HTMLElement>('[data-track]')
          ?.animate(
            [{ transform: 'none' }, { transform: `translateX(${(dir * 100) / COPIES}%)` }],
            {
              duration: (period / SPEED) * 1000,
              delay: start + ms(EASE_FRAMES),
              iterations: Infinity,
            },
          );
      }
      for (const tile of all('[data-item=tile]')) {
        const steps = Math.abs(Number(tile.dataset.x) - CENTER) / TILE_PITCH;
        // 가운데 다이아몬드는 Lottie의 큰 다이아몬드가 줄어들어 놓이는 자리라 204f에 바로 보임
        if (steps < 0.01) {
          tile.animate([{ opacity: 1 }, { opacity: 1 }], {
            duration: 1,
            delay: ms(204 - 141),
            fill: 'forwards',
          });
          continue;
        }
        const delay = ms(Number(tile.dataset.enter) + 8.7 * steps - 141);
        tile.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: ms(7.2),
          delay,
          easing: 'cubic-bezier(0, 0, 0.58, 1)',
          fill: 'both',
        });
        tile.animate(
          [
            { transform: 'scale(0.4)' },
            { transform: 'scale(1.012)', offset: 0.55 },
            { transform: 'none' },
          ],
          { duration: ms(19), delay, easing: 'ease-out', fill: 'both' },
        );
      }
    }

    if (scene === 2) {
      for (const tile of all('[data-item=tile]')) {
        const origin = CENTER + Number(tile.dataset.dir) * DRIFT_AT_TAP;
        const delay = ms((6.78 * Math.abs(liveX(tile) - origin)) / TILE_PITCH);
        const timing = {
          duration: ms(18),
          delay,
          easing: 'cubic-bezier(0.42, 0, 0.58, 1)',
          fill: 'both',
        } as const;
        tile.getAnimations().forEach((animation) => animation.cancel());
        tile.animate([{ opacity: 1 }, { opacity: 0 }], timing);
        tile.animate([{ transform: 'none' }, { transform: 'scale(0.6)' }], timing);
      }
      for (const card of all('[data-item=photo]')) {
        const origin = CENTER + Number(card.dataset.dir) * DRIFT_AT_TAP;
        const delay = ms(Number(card.dataset.enter) + 0.0683 * Math.abs(liveX(card) - origin));
        const easing = 'cubic-bezier(0, 0, 0.58, 1)';
        card.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: ms(21),
          delay,
          easing,
          fill: 'both',
        });
        card.animate([{ transform: 'scale(0.879)' }, { transform: 'none' }], {
          duration: ms(18),
          delay,
          easing,
          fill: 'both',
        });
      }
    }

    if (scene === 3) {
      const fades = all('[data-photo-row]').map(
        (row) =>
          row.animate(
            [
              { opacity: 1, transform: 'none' },
              { opacity: 0, transform: 'scale(0.96)' },
            ],
            { duration: ms(24), easing: 'cubic-bezier(0.4, 0, 0.6, 1)', fill: 'forwards' },
          ).finished,
      );
      // 다 사라진 뒤에는 보이지 않는 줄을 계속 돌리지 않음
      Promise.all(fades)
        .then(() =>
          all('[data-ease], [data-track]').forEach((element) =>
            element.getAnimations().forEach((animation) => animation.cancel()),
          ),
        )
        .catch(() => {});
    }
  }, [scene, still]);

  return (
    <div ref={rootRef} aria-hidden="true" className="pointer-events-none absolute inset-0">
      {TILE_ROWS.map((row) => (
        <Track
          key={row.y}
          kind="tile"
          row={row}
          pitch={TILE_PITCH}
          height={TILE}
          shown={still && scene === 1}
          render={(kind) => <Tile kind={kind} />}
        />
      ))}
      {PHOTO_ROWS.map((row) => (
        <div
          key={row.y}
          data-photo-row
          className="absolute inset-0"
          style={{ transformOrigin: `${u(CENTER)} ${u(row.y)}` }}
        >
          <Track
            kind="photo"
            row={row}
            pitch={CARD.pitch}
            height={CARD.height}
            shown={still && scene === 2}
            render={(photo) => <PhotoCard photo={photo} />}
          />
        </div>
      ))}
    </div>
  );
}
