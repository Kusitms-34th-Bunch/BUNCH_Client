import { Header, LineChevronLeftLargeIcon, TextButton } from '@app/design-system';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import {
  clampOffset,
  CROP_DIAMETER,
  CROP_OUTPUT_SIZE,
  cropSourceRect,
  fitScale,
} from '../../lib/photoCrop';
import { HeaderIconButton } from '../layout/HeaderIconButton';
import { LoadingDots } from '../loading/LoadingDots';

const KEY_STEP = 10;

type PhotoCropScreenProps = {
  /** 조정할 사진. 없으면 불러오는 중 화면 */
  src: string | undefined;
  onCancel: () => void;
  /** 원 영역을 자른 정사각 JPEG(512px) data URL */
  onComplete: (_dataUrl: string) => void;
  /** 사진을 디코딩하지 못했거나 자르기용 canvas를 만들지 못함(메모리 부족 등) */
  onFail: () => void;
};

/**
 * 프로필 사진 조정(화면 설계서 MY(2) 5·6번): 사진을 끌어 원 안에 맞추고 「완료」로 자름
 * body에 그리고 열린 동안 나머지 body 자식은 inert. 사진 교체 시 `key`로 새로 그리기와 닫힌 뒤 초점 복귀는 호출하는 쪽
 */
export function PhotoCropScreen({ src, onCancel, onComplete, onFail }: PhotoCropScreenProps) {
  const titleId = useId();
  const hintId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    const measure = () => setStage({ width: element.clientWidth, height: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // 뒤 화면을 막고 초점을 조정 영역(불러오는 중이면 뒤로 가기)으로
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const others = [...document.body.children].filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement && element !== root && !element.inert,
    );
    for (const element of others) element.inert = true;
    return () => {
      for (const element of others) element.inert = false;
    };
  }, []);
  useEffect(() => {
    (areaRef.current ?? rootRef.current?.querySelector('button'))?.focus();
  }, [src]);

  const scale = natural ? fitScale(natural, stage.width) : 0;
  // 화면 폭이 바뀌어 배율이 달라져도 원이 사진 밖으로 나가지 않게 그릴 때마다 다시 제한
  const position = natural ? clampOffset(offset, natural, scale) : offset;
  const moveBy = (dx: number, dy: number) => {
    if (!natural) return;
    setOffset((prev) => {
      const base = clampOffset(prev, natural, scale);
      return clampOffset({ x: base.x + dx, y: base.y + dy }, natural, scale);
    });
  };

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (!natural) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  };
  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    moveBy(event.clientX - current.x, event.clientY - current.y);
    drag.current = { ...current, x: event.clientX, y: event.clientY };
  };
  const endDrag = () => {
    drag.current = null;
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-KEY_STEP, 0],
      ArrowRight: [KEY_STEP, 0],
      ArrowUp: [0, -KEY_STEP],
      ArrowDown: [0, KEY_STEP],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    moveBy(...move);
  };

  const complete = () => {
    const image = imageRef.current;
    if (!image || !natural) return;
    const rect = cropSourceRect(natural, scale, position);
    const canvas = document.createElement('canvas');
    canvas.width = CROP_OUTPUT_SIZE;
    canvas.height = CROP_OUTPUT_SIZE;
    const context = canvas.getContext('2d');
    if (!context) {
      onFail();
      return;
    }
    // JPEG는 투명을 검정으로 합성하므로 투명 PNG·WebP를 위해 흰 바탕을 먼저 칠함
    context.fillStyle = '#fff';
    context.fillRect(0, 0, CROP_OUTPUT_SIZE, CROP_OUTPUT_SIZE);
    context.drawImage(
      image,
      rect.x,
      rect.y,
      rect.size,
      rect.size,
      0,
      0,
      CROP_OUTPUT_SIZE,
      CROP_OUTPUT_SIZE,
    );
    onComplete(canvas.toDataURL('image/jpeg', 0.9));
  };

  const width = natural ? natural.width * scale : 0;
  const height = natural ? natural.height * scale : 0;
  const imageBox = {
    width,
    height,
    left: stage.width / 2 - width / 2 + position.x,
    top: stage.height / 2 - height / 2 + position.y,
  };
  // 원 밖 scrim은 사진 위에만(Figma Subtract), 원 자리는 mask로 뚫음
  const hole = `radial-gradient(circle ${CROP_DIAMETER / 2}px at ${width / 2 - position.x}px ${height / 2 - position.y}px, transparent 99%, #000 100%)`;

  return createPortal(
    // Figma 배경 surface-inversed-strong(#121212)은 내보낸 토큰에 없어 같은 값의 primitive 사용
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- 대화상자 안 어디서든 Esc로 취소
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onCancel();
      }}
      className="bg-primitive-gray-900 fixed inset-0 z-40 mx-auto flex max-w-(--app-max-width) flex-col pt-(--safe-area-top) pb-(--safe-area-bottom)"
    >
      <h2 id={titleId} className="sr-only">
        프로필 사진 조정
      </h2>
      <Header
        className="bg-transparent"
        leading={
          <HeaderIconButton label="뒤로 가기" tone="inversed" onClick={onCancel}>
            <LineChevronLeftLargeIcon />
          </HeaderIconButton>
        }
        trailing={
          <TextButton
            size="sm"
            className="text-text-inversed"
            disabled={!natural}
            onClick={complete}
          >
            완료
          </TextButton>
        }
      />
      <div ref={stageRef} className="relative min-h-0 flex-1 overflow-hidden">
        {src ? (
          <>
            {/* 고른 사진의 data URL을 직접 그려 자르므로 next/image 최적화 대상이 아님 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imageRef}
              src={src}
              alt=""
              draggable={false}
              onLoad={(event) =>
                setNatural({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                })
              }
              // 앱이 넘긴 사진은 디코딩 확인 전이라 실패하면 빈 조정 화면 대신 닫음
              onError={onFail}
              className="pointer-events-none absolute max-w-none select-none"
              style={{ ...imageBox, visibility: natural ? 'visible' : 'hidden' }}
            />
            {natural ? (
              <div
                aria-hidden="true"
                className="bg-overlay-scrim pointer-events-none absolute"
                style={{ ...imageBox, maskImage: hole, WebkitMaskImage: hole }}
              />
            ) : null}
            {/* 원·정사각 안내선과 모서리 꺾쇠(Figma 사진변경 Crop) */}
            {/* 끌기·방향키로 옮기는 영역. 포커스와 키 입력을 기본 제공하는 버튼(누르는 동작은 없음) */}
            <button
              ref={areaRef}
              type="button"
              aria-label="사진 위치 조정"
              aria-describedby={hintId}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={onKeyDown}
              className="focus-visible:outline-border-brand absolute inset-0 cursor-grab touch-none focus-visible:outline-2 focus-visible:-outline-offset-2 active:cursor-grabbing"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-1/2 -translate-1/2"
                style={{ width: CROP_DIAMETER, height: CROP_DIAMETER }}
              >
                <div className="border-surface-primary/60 absolute inset-0 rounded-full border" />
                <div className="border-surface-primary/60 absolute inset-0 border" />
                <span className="border-surface-primary absolute -top-0.75 -left-0.75 size-5 border-t-2 border-l-2" />
                <span className="border-surface-primary absolute -top-0.75 -right-0.75 size-5 border-t-2 border-r-2" />
                <span className="border-surface-primary absolute -bottom-0.75 -left-0.75 size-5 border-b-2 border-l-2" />
                <span className="border-surface-primary absolute -right-0.75 -bottom-0.75 size-5 border-r-2 border-b-2" />
              </div>
            </button>
          </>
        ) : (
          <div
            role="status"
            className="gap-s4 typography-body-3-regular text-text-quinary flex h-full flex-col items-center justify-center"
          >
            <LoadingDots />
            사진을 불러오는 중
          </div>
        )}
      </div>
      {src ? (
        <p id={hintId} className="typography-body-3-regular text-text-quinary py-s14 text-center">
          원하는 부분에 원을 맞춰주세요.
          <span className="sr-only"> 끌거나 방향키로 옮겨요.</span>
        </p>
      ) : null}
    </div>,
    document.body,
  );
}
