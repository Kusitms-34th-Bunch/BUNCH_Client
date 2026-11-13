import { cn } from '@app/design-system';

/** Spark 패턴 모듈(4px 정사각형) 왼쪽 위 좌표: 7×7 격자의 홀수 칸으로 이은 번치 마름모(Figma `5371:13751`, 가운데 정렬 28×28) */
const MODULES: ReadonlyArray<readonly [number, number]> = [
  [12, 0],
  [12, 4],
  [8, 8],
  [16, 8],
  [0, 12],
  [4, 12],
  [12, 12],
  [20, 12],
  [24, 12],
  [8, 16],
  [16, 16],
  [12, 20],
  [12, 24],
];

type RefreshSparkProps = {
  className?: string;
};

/**
 * 당겨서 새로고침 표시기의 Spark(36×36, gray-300)
 * 모양이 90° 회전 대칭이라 한 바퀴를 네 번 끊어 도는 것과 같고, 마지막 멈춤에서 처음으로 돌아가도 이음매가 보이지 않음
 * 장식이라 스크린 리더에는 숨기고 상태는 PageShell의 live region이 알림
 */
export function RefreshSpark({ className }: RefreshSparkProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 36 36"
      className={cn(
        'fill-primitive-gray-300 size-9 shrink-0 origin-center',
        // 당기기 시작하면(`.pull-refresh`의 data-pull) 바로 90°씩 끊어 돈다(Figma `6672:47287`, 2초 주기). 동작 줄이기에서는 멈춤
        'group-data-pull/pull:animate-refresh-spark-spin motion-reduce:animate-none',
        className,
      )}
      shapeRendering="crispEdges"
    >
      {MODULES.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x + 4} y={y + 4} width={4} height={4} />
      ))}
    </svg>
  );
}
