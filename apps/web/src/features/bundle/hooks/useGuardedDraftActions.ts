import type { DraftActions, RawActions } from '../lib/draftContract';

// 안에서 hook을 부르지 않지만 hook으로 둠: ref를 읽는 `isDown`을 일반 함수에 넘기면 React Compiler가 렌더 중 ref 읽기로 막음
/**
 * 연결이 끊긴 동안 편집 동작이 반응하지 않게 감쌈(기능 spec 4.3.14). 이미 열린 시트·확인 창에서 늦게 눌러도 서버로 보내지 않음
 * `isDown`은 동작이 불릴 때만 읽음(렌더 중에는 읽지 않음). 막히면 false(결과를 알려 주는 동작만 그 값을 씀)
 */
export const useGuardedDraftActions = (
  rawActions: RawActions,
  isDown: () => boolean,
): DraftActions => {
  const guarded = (run: () => void) => {
    if (isDown()) return false;
    run();
    return true;
  };
  return {
    ...rawActions,
    setTitle: (...args) => guarded(() => rawActions.setTitle(...args)),
    setComment: (...args) => guarded(() => rawActions.setComment(...args)),
    addLocation: (...args) => guarded(() => rawActions.addLocation(...args)),
    replaceLocation: (...args) => guarded(() => rawActions.replaceLocation(...args)),
    removeLocation: (...args) => guarded(() => rawActions.removeLocation(...args)),
    moveLocation: (...args) => guarded(() => rawActions.moveLocation(...args)),
    setDate: (...args) => guarded(() => rawActions.setDate(...args)),
    addMember: (...args) => guarded(() => rawActions.addMember(...args)),
    removeMember: (...args) => guarded(() => rawActions.removeMember(...args)),
    removePhoto: (...args) => guarded(() => rawActions.removePhoto(...args)),
    movePhoto: (...args) => guarded(() => rawActions.movePhoto(...args)),
    replacePhotos: (...args) => guarded(() => rawActions.replacePhotos(...args)),
  };
};
