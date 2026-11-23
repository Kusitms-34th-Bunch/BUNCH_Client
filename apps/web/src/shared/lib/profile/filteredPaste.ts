import type { ClipboardEvent } from 'react';

type Selection = { start: number; end: number };
/** 넣을 결과. `null`이면 입력을 바꾸지 않고, `'native'`면 브라우저 기본 붙여넣기 */
export type PasteResult = { value: string; caret: number } | null | 'native';

/**
 * 붙여넣기를 규칙에 맞게 직접 넣는 입력란 `onPaste` 처리기(허용하지 않는 문자 거르기 등)
 * 직접 넣은 붙여넣기는 브라우저 실행 취소 기록에 남지 않을 수 있음
 */
export const filteredPaste =
  (
    paste: (_current: string, _selection: Selection, _pasted: string) => PasteResult,
    setValue: (_value: string) => void,
  ) =>
  (event: ClipboardEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const result = paste(
      input.value,
      { start: input.selectionStart ?? 0, end: input.selectionEnd ?? 0 },
      event.clipboardData.getData('text'),
    );
    if (result === 'native') return;
    event.preventDefault();
    if (!result) return;
    setValue(result.value);
    requestAnimationFrame(() => input.setSelectionRange(result.caret, result.caret));
  };
