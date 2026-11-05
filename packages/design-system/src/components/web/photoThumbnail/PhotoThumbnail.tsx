import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../../utils';
import { SelectionIndicator } from '../selectionIndicator';

export type PhotoThumbnailProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
  /** 사진 주소 */
  src: string;
  /** 사진 설명(접근성 이름). 호출하는 쪽이 사진 내용을 설명하는 글 전달 */
  alt: string;
  /** 선택 모드(Figma `SelectionMode`). 켜면 눌러서 고르는 버튼이 되고 오른쪽 위에 선택 인디케이터 표시 */
  selectionMode?: boolean;
  /** 선택 여부(Figma `Selected`). 선택 모드에서만 의미가 있음 */
  selected?: boolean;
  /** 선택된 순서(예: 1). 선택되었을 때 인디케이터 안에 표시 */
  selectionOrder?: ReactNode;
  /** 사진을 불러오지 못했을 때(호출하는 쪽이 회색 자리표시 등으로 바꿈) */
  onImageError?: (() => void) | undefined;
};

const frame = 'relative block aspect-square w-30.75 shrink-0 overflow-hidden';

/**
 * 사진 선택 썸네일(Figma `Photo`): 123px 정사각형 사진
 * 선택 모드가 꺼져 있으면 보여 주기만 하는 사진(눌러서 여는 동작은 호출하는 쪽이 감싸서 정함)
 * 선택 모드가 켜지면 사진 위에 `aria-pressed` 토글 버튼(이름은 alt와 선택 순서)을 덮고, 선택된 사진은 어두운 오버레이(overlay-pressed)와 순서 표시
 */
export const PhotoThumbnail = ({
  src,
  alt,
  selectionMode = false,
  selected = false,
  selectionOrder,
  onImageError,
  className,
  ...props
}: PhotoThumbnailProps) => {
  // 긴 목록에서 화면 밖 사진은 나중에 불러옴(lazy)
  // 선택 모드를 켜고 꺼도 같은 span·img를 유지해 사진을 다시 그리지 않음(깜빡임 방지), 선택 모드에서는 이름을 버튼이 가지므로 img는 장식
  const image = (
    <img
      src={src}
      alt={selectionMode ? '' : alt}
      loading="lazy"
      decoding="async"
      onError={onImageError}
      className="absolute inset-0 size-full object-cover"
    />
  );

  if (!selectionMode) {
    return (
      <span className={cn(frame, className)} {...props}>
        {image}
      </span>
    );
  }

  return (
    <span className={cn(frame, className)}>
      {image}
      <button
        type="button"
        className="focus-visible:outline-border-brand absolute inset-0 cursor-pointer touch-manipulation focus-visible:outline-2 focus-visible:-outline-offset-2"
        {...props}
        aria-pressed={selected}
      >
        {/* 선택 오버레이는 항상 두고 투명도만 150ms 전환(Figma 화면 설계서: Smart Animate, 0, 0, 0.35, 1) */}
        <span
          aria-hidden="true"
          className={cn(
            'bg-overlay-pressed absolute inset-0 transition-opacity duration-150 ease-[cubic-bezier(0,0,0.35,1)] motion-reduce:transition-none',
            selected ? 'opacity-100' : 'opacity-0',
          )}
        />
        <SelectionIndicator
          selected={selected}
          order={selectionOrder}
          className="top-s4 right-s4 absolute"
        />
        {/* 이름은 사진 설명 + 선택 순서. 엔진마다 span 사이 공백 처리가 달라 한 글로 묶음 */}
        <span className="sr-only">
          {selected && selectionOrder !== undefined ? `${alt}, ${selectionOrder}번째 선택` : alt}
        </span>
      </button>
    </span>
  );
};
