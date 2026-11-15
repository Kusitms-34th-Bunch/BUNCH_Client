'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { BundleDetail } from '../model/bundle';
import {
  editTitle,
  ensureTitleCrdt,
  loadTitleDoc,
  mergeTitleDocs,
  saveTitleDoc,
  titleText,
  type TitleDoc,
} from '../lib/titleCrdt';

export type TitleCrdt = {
  /** 입력란에 보일 제목 원문. 문서를 불러오기 전에는 undefined(서버가 준 제목을 보임) */
  text: string | undefined;
  /** 문서를 불러와 입력할 수 있는지(문서가 없는 번들은 불러올 것이 없으므로 true) */
  ready: boolean;
  /** 제목 문서를 불러오지 못했는지(네트워크 등). `retry`로 다시 불러옴 */
  failed: boolean;
  retry: () => void;
  /** 입력한 내용을 문서에 반영(바뀐 부분만 splice). 문서를 아직 불러오지 못했으면 false */
  edit: (_next: string) => boolean;
  /** 서버로 보낼 전체 저장 문서(base64). 문서를 아직 불러오지 못했으면 undefined */
  serialize: () => string | undefined;
  /** 서버에 보내지 못한 입력을 버리고 마지막으로 받은 서버 문서로 되돌림(연결이 끊겼을 때) */
  reset: () => void;
  /** 한글 조합처럼 입력이 끝나지 않은 동안은 원격 변경을 화면에 반영하지 않고 끝난 뒤 반영 */
  setComposing: (_composing: boolean) => void;
};

/**
 * 번들 제목의 로컬 CRDT 문서: 상세의 `titleCrdtState`(처음 불러온 문서, 이후 서버 저장 응답·TITLE 이벤트·재조회로 바뀐 문서)를
 * 로컬 문서에 병합해 두고, 입력은 문서에 바로 반영함. 병합은 같은 문서를 다시 받아도 결과가 같고, 저장 전 입력도 잃지 않음
 */
export function useTitleCrdt(detail: BundleDetail | undefined): TitleCrdt {
  const bundleId = detail?.id;
  const state = detail?.status === 'DRAFT' ? detail.titleCrdtState : undefined;
  // 서버·원격 변경까지 병합한 문서
  const docRef = useRef<TitleDoc | undefined>(undefined);
  // 화면에 보이는 문서(조합 중에는 보류한 원격 변경이 빠져 있음). 입력은 이 문서 기준으로 반영해 보류한 변경을 지우지 않음
  const viewRef = useRef<TitleDoc | undefined>(undefined);
  const bundleRef = useRef<string | undefined>(undefined);
  const composingRef = useRef(false);
  // 조합 중에 원격 변경이 문서에 병합됐지만 화면에는 아직 반영하지 않은 상태
  const heldRef = useRef(false);
  const [text, setText] = useState<string | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (state === undefined || bundleId === undefined) return;
    let cancelled = false;
    const apply = () => {
      const remote = loadTitleDoc(state);
      const sameBundle = bundleRef.current === bundleId;
      bundleRef.current = bundleId;
      const merged = sameBundle && docRef.current ? mergeTitleDocs(docRef.current, remote) : remote;
      docRef.current = merged;
      if (composingRef.current) {
        heldRef.current = true;
        return;
      }
      viewRef.current = merged;
      setFailed(false);
      setText(titleText(merged));
    };
    ensureTitleCrdt()
      // 문서를 불러오지 못하거나(청크 로드 실패) 서버 문서가 손상돼 읽지 못하면 입력은 계속 막히므로 알리고, 다시 시도할 수 있게 함
      .then(() => {
        if (!cancelled) apply();
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [state, bundleId, attempt]);

  const retry = useCallback(() => {
    setFailed(false);
    setAttempt((count) => count + 1);
  }, []);

  const reset = useCallback(() => {
    // 병합하지 않고 서버 문서로만 다시 불러오게 함(저장하지 못한 로컬 입력과 보류한 변경을 모두 버림)
    bundleRef.current = undefined;
    heldRef.current = false;
    setAttempt((count) => count + 1);
  }, []);

  const edit = useCallback((next: string) => {
    const doc = docRef.current;
    if (!doc) return false;
    // 화면에 보이던 문서에 입력을 반영하고 병합 문서에 합침(보류한 원격 변경은 그대로 남음)
    const view = editTitle(viewRef.current ?? doc, next);
    viewRef.current = view;
    docRef.current = heldRef.current ? mergeTitleDocs(doc, view) : view;
    setText(next);
    return true;
  }, []);

  const serialize = useCallback(
    () => (docRef.current ? saveTitleDoc(docRef.current) : undefined),
    [],
  );

  const setComposing = useCallback((composing: boolean) => {
    composingRef.current = composing;
    if (composing || !heldRef.current || !docRef.current) return;
    heldRef.current = false;
    viewRef.current = docRef.current;
    setText(titleText(docRef.current));
  }, []);

  return {
    text,
    ready: text !== undefined || state === undefined,
    failed,
    retry,
    edit,
    serialize,
    reset,
    setComposing,
  };
}
