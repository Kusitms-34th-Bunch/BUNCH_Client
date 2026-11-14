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
  /** 입력한 내용을 문서에 반영(바뀐 부분만 splice). 문서를 아직 불러오지 못했으면 false */
  edit: (_next: string) => boolean;
  /** 서버로 보낼 전체 저장 문서(base64). 문서를 아직 불러오지 못했으면 undefined */
  serialize: () => string | undefined;
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
  const docRef = useRef<TitleDoc | undefined>(undefined);
  const bundleRef = useRef<string | undefined>(undefined);
  const composingRef = useRef(false);
  // 조합 중에 원격 변경이 문서에 병합됐지만 화면에는 아직 반영하지 않은 상태
  const heldRef = useRef(false);
  const [text, setText] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (state === undefined || bundleId === undefined) return;
    let cancelled = false;
    ensureTitleCrdt().then(
      () => {
        if (cancelled) return;
        const remote = loadTitleDoc(state);
        const sameBundle = bundleRef.current === bundleId;
        bundleRef.current = bundleId;
        const merged =
          sameBundle && docRef.current ? mergeTitleDocs(docRef.current, remote) : remote;
        docRef.current = merged;
        if (composingRef.current) {
          heldRef.current = true;
          return;
        }
        setText(titleText(merged));
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [state, bundleId]);

  const edit = useCallback((next: string) => {
    const doc = docRef.current;
    if (!doc) return false;
    docRef.current = editTitle(doc, next);
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
    setText(titleText(docRef.current));
  }, []);

  return { text, edit, serialize, setComposing };
}
