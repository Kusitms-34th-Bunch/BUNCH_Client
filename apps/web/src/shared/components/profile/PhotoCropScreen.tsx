import { Header, LineChevronLeftLargeIcon, TextButton } from '@app/design-system';
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useCropDrag } from '../../hooks/useCropDrag';
import {
  clampCrop,
  type Crop,
  cropAnnouncement,
  cropLayout,
  encodeCircleCrop,
  fitScale,
  initialCrop,
  moveCrop,
  resizeCropBy,
} from '../../lib/photoCrop';
import { HeaderIconButton } from '../layout/HeaderIconButton';
import { LoadingRipple } from '../loading/LoadingRipple';
import { CropFrame } from './CropFrame';

// 방향키 한 번에 옮기는 거리(화면 px)와 +·- 한 번의 크기 배율
const KEY_STEP = 10;
const KEY_RESIZE = 1.1;
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
 * 프로필 사진 조정(화면 설계서 MY(2) 5·6번, Figma 가로 5878:90300·세로 6501:138753)
 * 사진은 화면 폭에 맞춰 통째로 보이고, 칸(비율 자유)을 끌어 옮기고 모서리를 끌어 가로·세로를 따로 바꾼 뒤 「완료」로 자름
 * 원은 칸 안에 꽉 차게(지름 = 칸의 짧은 쪽) 따라 커지고 줄며, 원이 덮는 정사각형을 자름
 * 처음 칸은 사진 폭 × 짧은 쪽(가로 사진은 사진 전체, 세로 사진은 가운데 정사각형). 방향키로 옮기고 +·-로 크기를 바꿈
 * body에 그리고 열린 동안 나머지 body 자식은 inert. 사진 교체 시 `key`로 새로 그리기와 닫힌 뒤 초점 복귀는 호출하는 쪽
 */
export function PhotoCropScreen({ src, onCancel, onComplete, onFail }: PhotoCropScreenProps) {
  const titleId = useId();
  const hintId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  // 키를 누르고 있는 동안은 읽지 않고 뗄 때 한 번 읽음(반복 입력마다 안내가 쌓이지 않게)
  const keyRepeating = useRef(false);
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  // 자를 칸(원본 px). 사진을 불러오기 전에는 null
  const [crop, setCrop] = useState<Crop | null>(null);
  // 마지막으로 읽어 줄 칸: 손을 떼거나 키를 누를 때만 갱신(끄는 동안 매 프레임 읽지 않게, 처음 열 때는 안내 문구만)
  const [spoken, setSpoken] = useState<Crop | null>(null);

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

  const scale = natural ? fitScale(natural, stage) : 0;
  // 영역 크기를 알고 사진 크기가 정상일 때만 칸을 그리고 자름(아니면 NaN 영역으로 흰 사진이 저장됨)
  const ready = Boolean(natural && crop) && scale > 0;
  // 화면 크기가 바뀌어 최소 크기가 달라져도 범위 안에 있게 그릴 때마다 다시 맞춤
  const current = natural && crop && ready ? clampCrop(crop, natural, scale) : null;
  const width = natural ? natural.width * scale : 0;
  const height = natural ? natural.height * scale : 0;
  const imageBox = {
    width,
    height,
    left: stage.width / 2 - width / 2,
    top: stage.height / 2 - height / 2,
  };
  const shape = current ? cropLayout(current, scale, imageBox) : null;
  const circle = shape?.circle ?? null;
  const {
    frameRef,
    shadowRef,
    ringRef,
    onPointerDown,
    onCornerDown,
    onPointerMove,
    endDrag,
    shownCrop,
  } = useCropDrag({
    current,
    natural,
    scale,
    imageBox,
    stageRef,
    areaRef,
    onCommit: (final) => {
      setCrop(final);
      setSpoken(final);
    },
  });

  const update = (next: (_prev: Crop) => Crop, speak = true) => {
    if (!natural || !ready || !current) return;
    const value = next(current);
    setCrop(value);
    if (speak) setSpoken(value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    // 브라우저 단축키(Ctrl·Cmd +·- 확대, Alt ←·→ 뒤로)는 그대로 둠
    if (!natural || event.ctrlKey || event.metaKey || event.altKey) return;
    const step = KEY_STEP / (scale || 1);
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[event.key];
    const resize =
      event.key === '+' || event.key === '=' ? KEY_RESIZE : event.key === '-' ? 1 / KEY_RESIZE : 0;
    if (!move && !resize) return;
    event.preventDefault();
    if (event.repeat) keyRepeating.current = true;
    if (move)
      update((prev) => moveCrop(prev, { x: move[0], y: move[1] }, natural, scale), !event.repeat);
    else update((prev) => resizeCropBy(prev, resize, natural, scale), !event.repeat);
  };
  const onKeyUp = () => {
    if (!keyRepeating.current) return;
    keyRepeating.current = false;
    setSpoken(current);
  };

  const complete = () => {
    const image = imageRef.current;
    // 다른 손가락으로 끄는 중에 누르면 화면에 보이는(제한한) 칸으로 자름
    const shown = shownCrop();
    if (!image || !shown) return;
    const dataUrl = encodeCircleCrop(image, shown);
    if (dataUrl === null) {
      onFail();
      return;
    }
    onComplete(dataUrl);
  };

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
            disabled={!current}
            onClick={complete}
          >
            완료
          </TextButton>
        }
      />
      {/* contain: 끄는 동안 바뀌는 칸·원의 레이아웃·그리기를 이 영역 안에 가둬 화면 나머지를 다시 계산하지 않게 */}
      <div
        ref={stageRef}
        className="relative min-h-0 flex-1 overflow-hidden contain-[layout_paint]"
      >
        {src ? (
          <>
            {/* 고른 사진의 data URL을 직접 그려 자르므로 next/image 최적화 대상이 아님 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imageRef}
              src={src}
              alt=""
              draggable={false}
              onLoad={(event) => {
                const size = {
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                };
                setNatural(size);
                setCrop(initialCrop(size));
              }}
              // 앱이 넘긴 사진은 디코딩 확인 전이라 실패하면 빈 조정 화면 대신 닫음
              onError={onFail}
              className="pointer-events-none absolute max-w-none select-none"
              style={{ ...imageBox, visibility: natural ? 'visible' : 'hidden' }}
            />
            {/* 원 밖 scrim은 사진 위에만(Figma Subtract): 원 모양 요소의 큰 그림자를 사진 상자로 잘라 그림 */}
            {/* 끄는 동안 매 프레임 사진 크기 mask를 다시 계산하지 않아 손을 따라 매끄럽게 움직임 */}
            {circle ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute overflow-hidden"
                style={imageBox}
              >
                <div
                  className="absolute rounded-full shadow-[0_0_0_9999px_var(--color-overlay-scrim)]"
                  ref={shadowRef}
                  style={circle}
                />
              </div>
            ) : null}
            {/* 끌기·방향키로 칸을 옮기고 모서리·+/-로 크기를 바꾸는 영역. 포커스와 키 입력을 기본 제공하는 버튼(누르는 동작은 없음) */}
            <button
              ref={areaRef}
              type="button"
              aria-label="자를 영역 조정"
              aria-describedby={hintId}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              // 캡처가 비정상으로 끊겨 up·cancel이 오지 않아도 다음 끌기가 막히지 않게
              onLostPointerCapture={endDrag}
              onKeyDown={onKeyDown}
              onKeyUp={onKeyUp}
              className="focus-visible:outline-border-brand absolute inset-0 cursor-grab touch-none focus-visible:outline-2 focus-visible:-outline-offset-2 active:cursor-grabbing"
            >
              {shape ? (
                <CropFrame
                  frame={shape.frame}
                  ring={shape.ring}
                  frameRef={frameRef}
                  ringRef={ringRef}
                  onCornerDown={onCornerDown}
                />
              ) : null}
            </button>
          </>
        ) : (
          <div
            role="status"
            className="gap-s4 typography-body-3-regular text-text-quinary flex h-full flex-col items-center justify-center"
          >
            <LoadingRipple />
            사진을 불러오는 중
          </div>
        )}
      </div>
      {src ? (
        <p id={hintId} className="typography-body-3-regular text-text-quinary py-s14 text-center">
          원하는 부분에 원을 맞춰주세요.
          <span className="sr-only">
            {' '}
            끌거나 방향키로 옮기고, 모서리를 끌거나 +·- 키로 크기를 바꿔요.
          </span>
        </p>
      ) : null}
      {/* 옮기거나 크기를 바꾸면 크기와 가운데 위치를 비율로 읽어 줌(눈으로 볼 수 없어도 어디를 골랐는지 알 수 있게) */}
      {src ? (
        <p aria-live="polite" className="sr-only">
          {spoken && natural ? cropAnnouncement(spoken, natural) : ''}
        </p>
      ) : null}
    </div>,
    document.body,
  );
}
