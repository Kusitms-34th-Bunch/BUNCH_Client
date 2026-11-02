'use client';

import { useLayoutEffect, useRef } from 'react';
import { EditingLottie } from '@/shared/components/loading/EditingLottie';
import { BUNDLE_MESSAGES } from '../constants/messages';

type PhotoCaptionFieldProps = {
  value: string;
  /** 참여 멤버가 아니면 읽기만 함 */
  readOnly: boolean;
  /** 다른 멤버가 이 사진을 편집 중이면 그 멤버 이름(없으면 undefined) */
  editorNames: readonly string[];
  onChange: (_value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  /** 읽기만 하는 사람이 입력란에 닿았을 때 */
  onDenied: () => void;
  /** 다른 멤버가 편집 중인 사진의 입력란에 닿았을 때 */
  onEditingBlocked: () => void;
};

/**
 * 캡션 입력란(Figma `1782:32837`): 줄바꿈 가능, 글자가 늘면 전체가 보이게 늘어나고 없으면 「캡션 추가...」
 * 다른 멤버가 편집 중이면 입력란 자리에 편집 중 애니메이션을 보이고 누르면 안내(사진 한 장 단위의 잠금)
 * 최대 글자 수 보정과 초과 안내는 호출하는 쪽이 함
 */
export function PhotoCaptionField({
  value,
  readOnly,
  editorNames,
  onChange,
  onFocus,
  onBlur,
  onDenied,
  onEditingBlocked,
}: PhotoCaptionFieldProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const locked = editorNames.length > 0;

  // 내용에 맞게 높이를 늘림(`field-sizing`을 못 쓰는 WebView 대비)
  useLayoutEffect(() => {
    const field = ref.current;
    if (!field) return;
    field.style.height = 'auto';
    field.style.height = `${field.scrollHeight}px`;
  }, [value, locked]);

  if (locked) {
    return (
      <button
        type="button"
        aria-label={BUNDLE_MESSAGES.editingLabel(editorNames.join(', '))}
        onClick={onEditingBlocked}
        className="py-padding-p1 flex min-h-6.25 w-full cursor-pointer touch-manipulation items-center text-left"
      >
        <EditingLottie />
      </button>
    );
  }

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      readOnly={readOnly}
      aria-label={BUNDLE_MESSAGES.captionLabel}
      // 읽기만 하는 사람에게는 입력을 권하는 안내를 보이지 않음
      placeholder={readOnly ? undefined : BUNDLE_MESSAGES.captionPlaceholder}
      onFocus={readOnly ? onDenied : onFocus}
      onBlur={onBlur}
      onChange={(event) => onChange(event.target.value)}
      className="typography-body-3-regular py-padding-p1 text-text-primary placeholder:text-text-quinary block w-full resize-none overflow-hidden bg-transparent outline-none"
    />
  );
}
