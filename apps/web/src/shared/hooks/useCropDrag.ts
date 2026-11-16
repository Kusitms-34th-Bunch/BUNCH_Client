import { useEffect, useRef, type PointerEvent, type RefObject } from 'react';
import {
  type Box,
  type Corner,
  type Crop,
  cropLayout,
  moveCrop,
  moveCropRaw,
  resizeCropFromCorner,
  resizeCropFromCornerRaw,
  rubberBand,
} from '../lib/photoCrop';
import { useReducedMotion } from './useReducedMotion';

type CropDragOptions = {
  /** 지금 그린(사진 안으로 제한한) 칸. 그릴 수 없으면 null */
  current: Crop | null;
  /** 사진 원본 크기. 칸을 그릴 수 있을 때만 값 */
  natural: { width: number; height: number } | null;
  /** 원본 px → 화면 px 배율 */
  scale: number;
  /** 조정 영역 안 사진 상자 */
  imageBox: Box;
  stageRef: RefObject<HTMLDivElement | null>;
  /** 포인터를 캡처할 조정 영역 */
  areaRef: RefObject<HTMLButtonElement | null>;
  /** 손을 뗐을 때 최종 칸 */
  onCommit: (_crop: Crop) => void;
};

const px = (box: Box) => ({
  width: `${box.width}px`,
  height: `${box.height}px`,
  left: `${box.left}px`,
  top: `${box.top}px`,
});

/**
 * 칸 끌어 옮기기·모서리로 크기 바꾸기. 고무줄로 넘친 칸을 끄는 동안 보여 주고 놓으면 끝으로 돌려 놓음
 * 끄는 동안은 React를 거치지 않고 화면 갱신마다 반환한 ref의 DOM에 직접 그림
 */
export function useCropDrag({
  current,
  natural,
  scale,
  imageBox,
  stageRef,
  areaRef,
  onCommit,
}: CropDragOptions) {
  // 진행 중인 끌기: 칸 옮기기(move) 또는 모서리로 크기 바꾸기(corner)
  // 끌기 시작 때의 칸과 손가락 위치를 기준으로 계산(이벤트를 화면 갱신마다 하나로 묶어도 이동량이 빠지지 않게)
  const drag = useRef<
    | { kind: 'move'; pointerId: number; start: { x: number; y: number }; crop: Crop }
    | {
        kind: 'corner';
        pointerId: number;
        corner: Corner;
        grab: { x: number; y: number };
        crop: Crop;
      }
    | null
  >(null);
  // 끄는 동안은 React를 거치지 않고 화면 갱신(requestAnimationFrame)마다 한 번 DOM에 직접 그림
  // 손을 뗄 때만 상태(crop)를 바꿔 React가 한 번 그림. 매 이벤트 다시 그리면 손을 늦게 따라와 끊겨 보임
  const frameRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const pendingFrame = useRef<number | null>(null);
  const pendingCrop = useRef<Crop | null>(null);
  // 끄는 동안 마지막으로 계산한, 사진 안으로 제한한 칸(손을 떼면 이 값으로 돌아감)
  const latest = useRef<Crop | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const reducedMotion = useReducedMotion();
  useEffect(
    () => () => {
      if (pendingFrame.current !== null) cancelAnimationFrame(pendingFrame.current);
      clearTimeout(settleTimer.current);
    },
    [],
  );

  // 끄는 동안 DOM에 직접 그림(React 상태는 그대로)
  const paint = (value: Crop) => {
    const next = cropLayout(value, scale, imageBox);
    if (frameRef.current) Object.assign(frameRef.current.style, px(next.frame));
    if (shadowRef.current) Object.assign(shadowRef.current.style, px(next.circle));
    if (ringRef.current) Object.assign(ringRef.current.style, px(next.ring));
  };
  const schedulePaint = (value: Crop) => {
    pendingCrop.current = value;
    if (pendingFrame.current !== null) return;
    pendingFrame.current = requestAnimationFrame(() => {
      pendingFrame.current = null;
      if (pendingCrop.current) paint(pendingCrop.current);
    });
  };
  const paintedElements = () => [frameRef.current, shadowRef.current, ringRef.current];
  // 복귀 전환 중에 다시 잡으면 손을 늦게 따라가므로 끄기 시작할 때 전환을 지움
  const stopSettle = () => {
    clearTimeout(settleTimer.current);
    for (const element of paintedElements()) if (element) element.style.transition = '';
  };
  // 고무줄로 넘친 칸이 끝으로 돌아가는 짧은 전환(동작 줄이기면 바로)
  const settle = () => {
    const elements = paintedElements();
    const transition = reducedMotion
      ? ''
      : 'left 150ms ease-out, top 150ms ease-out, width 150ms ease-out, height 150ms ease-out';
    for (const element of elements) if (element) element.style.transition = transition;
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      for (const element of elements) if (element) element.style.transition = '';
    }, 160);
  };

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (!current || drag.current || event.button !== 0) return;
    stopSettle();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      kind: 'move',
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      crop: current,
    };
  };
  const onCornerDown = (corner: Corner) => (event: PointerEvent<HTMLSpanElement>) => {
    if (!current || drag.current || event.button !== 0) return;
    // 칸 옮기기(버튼)로 이어지지 않게 막고, 손가락을 이 모서리가 계속 받게 함
    event.stopPropagation();
    stopSettle();
    areaRef.current?.setPointerCapture(event.pointerId);
    // 꺾쇠를 잡은 자리와 실제 모서리의 차이: 빼 주지 않으면 첫 움직임에 칸이 그만큼 튐
    const stageRect = stageRef.current?.getBoundingClientRect();
    const { frame } = cropLayout(current, scale, imageBox);
    const grab = stageRect
      ? {
          x: event.clientX - (stageRect.left + frame.left + (corner.x === 1 ? frame.width : 0)),
          y: event.clientY - (stageRect.top + frame.top + (corner.y === 1 ? frame.height : 0)),
        }
      : { x: 0, y: 0 };
    drag.current = { kind: 'corner', pointerId: event.pointerId, corner, grab, crop: current };
  };
  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId || !natural || !current) return;
    if (active.kind === 'move') {
      const delta = {
        x: (event.clientX - active.start.x) / scale,
        y: (event.clientY - active.start.y) / scale,
      };
      const clamped = moveCrop(active.crop, delta, natural, scale);
      latest.current = clamped;
      schedulePaint(rubberBand(moveCropRaw(active.crop, delta), clamped));
      return;
    }
    // 손가락 위치를 원본 px로(사진 왼쪽 위 기준)
    const stageRect = stageRef.current?.getBoundingClientRect();
    if (!stageRect) return;
    const point = {
      x: (event.clientX - active.grab.x - stageRect.left - imageBox.left) / scale,
      y: (event.clientY - active.grab.y - stageRect.top - imageBox.top) / scale,
    };
    const clamped = resizeCropFromCorner(active.crop, active.corner, point, natural, scale);
    latest.current = clamped;
    schedulePaint(rubberBand(resizeCropFromCornerRaw(active.crop, active.corner, point), clamped));
  };
  const endDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    if (pendingFrame.current !== null) cancelAnimationFrame(pendingFrame.current);
    pendingFrame.current = null;
    const final = latest.current;
    latest.current = null;
    if (!final) return;
    // 고무줄로 넘친 자리에서 끝으로 돌아감. React가 같은 값이라 DOM을 건드리지 않아도 맞도록 직접 그림
    settle();
    paint(final);
    onCommit(final);
  };
  // 다른 손가락으로 끄는 중이면 화면에 보이는(제한한) 칸
  const shownCrop = () => (drag.current ? (latest.current ?? current) : current);

  return {
    frameRef,
    shadowRef,
    ringRef,
    onPointerDown,
    onCornerDown,
    onPointerMove,
    endDrag,
    shownCrop,
  };
}
