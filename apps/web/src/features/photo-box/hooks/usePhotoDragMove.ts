'use client';

import { useReducer } from 'react';
import type { SectionItems } from '../lib/photoDrag';

/**
 * 끌어 옮기기 상태
 * - `dragging`: 끄는 중, `confirming`: 놓은 자리에 둔 채 관리자 확인을 기다림, `moving`: 날짜 변경 요청이 도는 중
 * - 놓은 뒤(`confirming`·`moving`)에도 미리보기 순서를 유지해 결과가 올 때까지 놓은 자리에 둠
 */
type DragMoveState =
  | { phase: 'idle' }
  | { phase: 'dragging'; activeId: string; preview: SectionItems }
  | { phase: 'confirming'; preview: SectionItems }
  // 확인 창 없이 바로 옮길 때도 요청 중 표시는 켬(미리보기가 없을 수 있음)
  | { phase: 'moving'; preview?: SectionItems | undefined };

type DragMoveAction =
  | { type: 'start'; activeId: string; preview: SectionItems }
  | { type: 'preview'; preview: SectionItems }
  | { type: 'confirm' }
  | { type: 'move' }
  | { type: 'reset' };

const IDLE: DragMoveState = { phase: 'idle' };

const reducer = (state: DragMoveState, action: DragMoveAction): DragMoveState => {
  switch (action.type) {
    case 'start':
      return { phase: 'dragging', activeId: action.activeId, preview: action.preview };
    case 'preview':
      return state.phase === 'dragging' ? { ...state, preview: action.preview } : state;
    case 'confirm':
      return state.phase === 'dragging' ? { phase: 'confirming', preview: state.preview } : state;
    case 'move':
      return { phase: 'moving', preview: state.phase === 'idle' ? undefined : state.preview };
    // 요청 중(`moving`)에도 걷음: 요청이 끝난 뒤(성공·실패)에만 부름
    case 'reset':
      return IDLE;
  }
};

/** 사진함 끌어 옮기기의 끄는 사진·미리보기 순서·확인 대기·요청 중 상태 */
export function usePhotoDragMove() {
  const [state, dispatch] = useReducer(reducer, IDLE);
  return {
    state,
    activeId: state.phase === 'dragging' ? state.activeId : undefined,
    preview: state.phase === 'idle' ? undefined : state.preview,
    moving: state.phase === 'moving',
    start: (activeId: string, preview: SectionItems) =>
      dispatch({ type: 'start', activeId, preview }),
    setPreview: (preview: SectionItems) => dispatch({ type: 'preview', preview }),
    confirm: () => dispatch({ type: 'confirm' }),
    move: () => dispatch({ type: 'move' }),
    reset: () => dispatch({ type: 'reset' }),
  };
}
