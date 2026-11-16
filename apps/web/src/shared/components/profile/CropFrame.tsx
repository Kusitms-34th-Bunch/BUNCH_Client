import type { PointerEvent, RefObject } from 'react';
import { cn } from '@app/design-system';
import type { Box, Corner } from '../../lib/photoCrop';

const CORNERS: { corner: Corner; className: string; border: string }[] = [
  {
    corner: { x: -1, y: -1 },
    className: '-top-0.75 -left-0.75 cursor-nwse-resize',
    border: 'border-t-2 border-l-2',
  },
  {
    corner: { x: 1, y: -1 },
    className: '-top-0.75 -right-0.75 cursor-nesw-resize',
    border: 'border-t-2 border-r-2',
  },
  {
    corner: { x: -1, y: 1 },
    className: '-bottom-0.75 -left-0.75 cursor-nesw-resize',
    border: 'border-b-2 border-l-2',
  },
  {
    corner: { x: 1, y: 1 },
    className: '-right-0.75 -bottom-0.75 cursor-nwse-resize',
    border: 'border-r-2 border-b-2',
  },
];

type CropFrameProps = {
  /** 칸 위치(조정 영역 기준 화면 px) */
  frame: Box;
  /** 원 테두리 위치(칸 기준 화면 px) */
  ring: Box;
  /** 끄는 동안 `useCropDrag`가 직접 그리는 칸·원 테두리 */
  frameRef: RefObject<HTMLDivElement | null>;
  ringRef: RefObject<HTMLDivElement | null>;
  onCornerDown: (_corner: Corner) => (_event: PointerEvent<HTMLSpanElement>) => void;
};

/**
 * 칸·원 안내선과 모서리 꺾쇠(Figma Crop Frame). 꺾쇠를 끌면 가로·세로 크기 조절
 */
export function CropFrame({ frame, ring, frameRef, ringRef, onCornerDown }: CropFrameProps) {
  return (
    <div ref={frameRef} aria-hidden="true" className="absolute" style={frame}>
      <div className="border-surface-primary/60 pointer-events-none absolute inset-0 border" />
      <div
        ref={ringRef}
        className="border-surface-primary/60 pointer-events-none absolute rounded-full border"
        style={ring}
      />
      {CORNERS.map(({ corner, className, border }) => (
        // 보이는 꺾쇠는 20px, 손가락으로 잡는 영역은 44px
        <span
          key={`${corner.x}${corner.y}`}
          data-crop-corner={`${corner.x},${corner.y}`}
          onPointerDown={onCornerDown(corner)}
          className={cn('absolute size-5', className)}
        >
          <span className={cn('border-surface-primary absolute inset-0', border)} />
          <span className="absolute -inset-3" />
        </span>
      ))}
    </div>
  );
}
