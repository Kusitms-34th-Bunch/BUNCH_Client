/** 문자열의 바뀐 구간(UTF-16 위치): `index`부터 `remove`만큼을 `insert`로 바꿈 */
export type TextHunk = { index: number; remove: number; insert: string };

// 두 문자열의 가운데 부분이 이만큼 크면 정밀한 비교를 하지 않고 한 구간으로 처리(붙여넣기처럼 긴 변경 대비)
const MAX_CELLS = 250_000;

/**
 * 이전 문자열과 새 문자열의 차이를 바뀐 구간 여러 개로 구함(커서·선택 영역을 원격 변경 뒤에도 같은 글자에 두기 위함)
 * 공통 앞·뒤를 먼저 빼고, 가운데는 글자(코드 포인트) 단위로 가장 긴 공통 부분을 맞춰 구간을 나눔
 * 서로게이트 쌍은 한 글자로 다뤄 가르지 않고, 위치는 UTF-16 기준(입력란의 selectionStart와 같음)
 */
export const diffHunks = (before: string, after: string): TextHunk[] => {
  const a = Array.from(before);
  const b = Array.from(after);
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head += 1;
  let tail = 0;
  while (
    tail < a.length - head &&
    tail < b.length - head &&
    a[a.length - 1 - tail] === b[b.length - 1 - tail]
  ) {
    tail += 1;
  }
  const midA = a.slice(head, a.length - tail);
  const midB = b.slice(head, b.length - tail);
  if (midA.length === 0 && midB.length === 0) return [];

  // 각 글자의 UTF-16 시작 위치(마지막 칸은 전체 길이)
  const offsets = (units: readonly string[]) => {
    const result = [0];
    for (const unit of units) result.push((result.at(-1) ?? 0) + unit.length);
    return result;
  };
  const offA = offsets(a);
  const toHunk = (fromA: number, toA: number, fromB: number, toB: number): TextHunk => ({
    index: offA[fromA] ?? 0,
    remove: (offA[toA] ?? 0) - (offA[fromA] ?? 0),
    insert: b.slice(fromB, toB).join(''),
  });

  const baseA = head;
  const baseB = head;
  if (midA.length === 0 || midB.length === 0 || midA.length * midB.length > MAX_CELLS) {
    return [toHunk(baseA, baseA + midA.length, baseB, baseB + midB.length)];
  }

  // 뒤에서부터의 가장 긴 공통 부분 길이 표
  const n = midA.length;
  const m = midB.length;
  const width = m + 1;
  const lcs = new Uint16Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      lcs[i * width + j] =
        midA[i] === midB[j]
          ? (lcs[(i + 1) * width + j + 1] ?? 0) + 1
          : Math.max(lcs[(i + 1) * width + j] ?? 0, lcs[i * width + j + 1] ?? 0);
    }
  }

  const hunks: TextHunk[] = [];
  let i = 0;
  let j = 0;
  let openA = -1;
  let openB = -1;
  const close = () => {
    if (openA < 0) return;
    hunks.push(toHunk(baseA + openA, baseA + i, baseB + openB, baseB + j));
    openA = -1;
    openB = -1;
  };
  while (i < n || j < m) {
    if (i < n && j < m && midA[i] === midB[j]) {
      close();
      i += 1;
      j += 1;
      continue;
    }
    if (openA < 0) {
      openA = i;
      openB = j;
    }
    // 이전 글자를 지우는 쪽과 새 글자를 넣는 쪽 중 공통 부분이 더 길게 남는 쪽을 고름
    if (j >= m || (i < n && (lcs[(i + 1) * width + j] ?? 0) >= (lcs[i * width + j + 1] ?? 0))) {
      i += 1;
    } else {
      j += 1;
    }
  }
  close();
  return hunks;
};

/**
 * 바뀌기 전 문자열의 위치를 바뀐 뒤 문자열의 위치로 옮김
 * 바뀐 구간보다 앞(구간 시작 위치 포함)이면 그대로, 구간 뒤면 길이 차이만큼 밀고, 지워진 구간 안이면 바꾼 글자의 끝에 둠
 */
export const mapPosition = (position: number, hunks: readonly TextHunk[]): number => {
  let shift = 0;
  for (const { index, remove, insert } of hunks) {
    if (position <= index) break;
    if (position >= index + remove) {
      shift += insert.length - remove;
      continue;
    }
    return index + shift + insert.length;
  }
  return position + shift;
};
