const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;
const FINAL_COUNT = 28;
const FINAL_RIEUL = 8;

/** 마지막 글자의 받침 번호. 받침이 없거나 한글이 아니면 0 */
function finalOf(word: string) {
  const code = word.charCodeAt(word.length - 1);
  if (Number.isNaN(code) || code < HANGUL_START || code > HANGUL_END) return 0;
  return (code - HANGUL_START) % FINAL_COUNT;
}

/** 「{이름}으로」·「{이름}로」: 받침이 없거나 ㄹ이면 「로」. 한글이 아닌 글자로 끝나도 「로」 */
export function withRo(word: string) {
  const final = finalOf(word);
  return `${word}${final === 0 || final === FINAL_RIEUL ? '로' : '으로'}`;
}

/** 주격 조사 「이」·「가」: 받침이 없으면 「가」. 한글이 아닌 글자로 끝나도 「가」 */
export function subjectParticle(word: string) {
  return finalOf(word) === 0 ? '가' : '이';
}
