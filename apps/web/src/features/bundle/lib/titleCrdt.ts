/**
 * 번들 제목 CRDT(Automerge) 도우미: 서버가 준 `titleCrdtState`(전체 저장 문서)를 불러 그 문서의 `title` 텍스트를 고치고 병합함(v5 명세)
 * 회원마다 새 문서를 만들거나 `title`을 통째로 대입하지 않고, 바뀐 부분만 splice해 동시 편집이 합쳐지게 함
 * WASM은 처음 쓸 때만 불러오고(`ensureTitleCrdt`), 문서를 다루는 함수는 불러온 뒤에 쓸 수 있음
 */
import type * as AutomergeSlim from '@automerge/automerge/slim';

type Automerge = typeof AutomergeSlim;

export type TitleDoc = AutomergeSlim.Doc<{ title: string }>;

let lib: Automerge | undefined;
let loading: Promise<void> | undefined;

/** WASM을 한 번만 불러와 쓸 수 있게 함(번들 초안 화면에서만 필요하므로 따로 불러옴) */
export const ensureTitleCrdt = (): Promise<void> => {
  loading ??= (async () => {
    const [automerge, wasm] = await Promise.all([
      import('@automerge/automerge/slim'),
      import('@automerge/automerge/automerge.wasm.base64'),
    ]);
    await automerge.initializeBase64Wasm(wasm.automergeWasmBase64);
    lib = automerge;
  })().catch((error: unknown) => {
    // 불러오기에 실패하면 다음에 다시 시도할 수 있게 비움
    loading = undefined;
    throw error;
  });
  return loading;
};

export const isTitleCrdtReady = () => lib !== undefined;

const api = (): Automerge => {
  if (!lib) throw new Error('title crdt is not ready');
  return lib;
};

const base64ToBytes = (value: string): Uint8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  // 큰 문서에서 인자 수 제한에 걸리지 않게 나눠서 변환
  for (let start = 0; start < bytes.length; start += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000));
  }
  return btoa(binary);
};

/** 서버의 `titleCrdtState`(base64)로 문서를 불러옴 */
export const loadTitleDoc = (state: string): TitleDoc =>
  api().load<{ title: string }>(base64ToBytes(state));

/** 문서를 서버로 보낼 base64 전체 저장 문서로 바꿈 */
export const saveTitleDoc = (doc: TitleDoc): string => bytesToBase64(api().save(doc));

/** 문서의 제목 원문(NFC·trim 전, 커서 위치와 일치) */
export const titleText = (doc: TitleDoc): string => doc.title;

const isHighSurrogate = (code: number) => code >= 0xd800 && code <= 0xdbff;
const isLowSurrogate = (code: number) => code >= 0xdc00 && code <= 0xdfff;

/**
 * 이전 문자열과 새 문자열의 공통 앞·뒤를 빼고 바뀐 가운데만 구함(UTF-16 위치, 서로게이트 쌍은 가르지 않음)
 * 한글 조합처럼 한 글자가 바뀌는 입력과 붙여넣기·잘라내기를 모두 한 번의 splice로 나타냄
 */
export const diffText = (before: string, after: string) => {
  let start = 0;
  const limit = Math.min(before.length, after.length);
  while (start < limit && before.charCodeAt(start) === after.charCodeAt(start)) start += 1;
  // 서로게이트 쌍의 중간에서 끊지 않음
  if (start > 0 && isHighSurrogate(before.charCodeAt(start - 1))) start -= 1;
  let endBefore = before.length;
  let endAfter = after.length;
  while (
    endBefore > start &&
    endAfter > start &&
    before.charCodeAt(endBefore - 1) === after.charCodeAt(endAfter - 1)
  ) {
    endBefore -= 1;
    endAfter -= 1;
  }
  if (endBefore < before.length && isLowSurrogate(before.charCodeAt(endBefore))) {
    endBefore += 1;
    endAfter += 1;
  }
  return { index: start, remove: endBefore - start, insert: after.slice(start, endAfter) };
};

/** 문서의 제목을 새 문자열로 맞춤: 바뀐 부분만 splice(내용이 같으면 같은 문서를 돌려줌) */
export const editTitle = (doc: TitleDoc, next: string): TitleDoc => {
  const { index, remove, insert } = diffText(doc.title, next);
  if (remove === 0 && insert === '') return doc;
  const automerge = api();
  return automerge.change(doc, (draft) => {
    automerge.splice(draft, ['title'], index, remove, insert);
  });
};

/** 두 문서를 병합(같은 문서를 다시 병합해도 결과가 같음) */
export const mergeTitleDocs = (local: TitleDoc, remote: TitleDoc): TitleDoc =>
  api().merge(api().clone(local), remote);

/** 테스트와 가짜 서버가 제목 문서를 만들 때 씀(실제 앱은 서버의 문서를 불러 씀) */
export const createTitleDoc = (text: string): TitleDoc => api().from({ title: text });
