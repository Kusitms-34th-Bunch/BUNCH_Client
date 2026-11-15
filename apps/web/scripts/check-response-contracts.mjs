// `requestData(요청, 스키마, …)`에 넘기는 응답 스키마가 Swagger 생성 계약과 묶였는지 검사(docs/architecture/data-layer.md)
// 묶지 않은 스키마는 선언 바로 위에 `// 계약 미연결: <이유>`가 있어야 통과. 이유 없는 미연결과 낡은 주석이 남지 않게 함
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../src', import.meta.url));
const MARKER = '계약 미연결:';
// ponytail: 팀원 작업 중인 feature는 표시를 달 수 없어 통째로 제외, 그 작업이 머지되면 지우고 표시 추가
const PENDING_DIRS = ['features/bundle/'];

const sourceFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'mocks' ? [] : sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });

/** `start`(여는 괄호 다음)부터 짝이 맞는 닫는 괄호까지의 위치 */
const closingIndex = (text, start) => {
  let depth = 1;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (char === '(' || char === '[' || char === '{') depth += 1;
    else if (char === ')' || char === ']' || char === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return text.length;
};

/** 최상위 쉼표로 나눈 인자 목록(문자열·템플릿 안의 쉼표는 괄호 깊이로만 거름) */
const splitArgs = (text) => {
  const args = [];
  let depth = 0;
  let current = '';
  for (const char of text) {
    if ('([{'.includes(char)) depth += 1;
    if (')]}'.includes(char)) depth -= 1;
    if (char === ',' && depth === 0) {
      args.push(current.trim());
      current = '';
    } else current += char;
  }
  if (current.trim()) args.push(current.trim());
  return args;
};

const resolveImport = (file, specifier) => {
  const base = specifier.startsWith('@/')
    ? join(SRC, specifier.slice(2))
    : resolve(dirname(file), specifier);
  return ['.ts', '.tsx', '/index.ts'].map((ext) => base + ext).find((path) => existsSync(path));
};

/** 이름이 선언된 파일과 선언 위치(같은 파일 → import 따라감) */
const findDeclaration = (file, name, seen = new Set()) => {
  if (seen.has(`${file}:${name}`)) return undefined;
  seen.add(`${file}:${name}`);
  const text = readFileSync(file, 'utf8');
  const declaration = new RegExp(`(?:export\\s+)?const\\s+${name}\\s*=\\s*`).exec(text);
  if (declaration)
    return {
      file,
      text,
      index: declaration.index,
      valueStart: declaration.index + declaration[0].length,
    };
  const imported = new RegExp(
    `import\\s+(?:type\\s+)?\\{[^}]*\\b${name}\\b[^}]*\\}\\s+from\\s+['"]([^'"]+)['"]`,
  ).exec(text);
  if (!imported) return undefined;
  const target = resolveImport(file, imported[1]);
  return target ? findDeclaration(target, name, seen) : undefined;
};

/** 선언이 계약과 묶였거나 이유를 표시했는지. 데이터 없는 응답(z.null·z.unknown)은 계약 대상 아님 */
const isAccounted = (declaration, seen = new Set()) => {
  const { text, index, valueStart } = declaration;
  const value = text.slice(valueStart);
  if (/^z\s*\.\s*(null|unknown|void|undefined)\s*\(/.test(value)) return true;
  // 표시는 선언 바로 윗줄만 인정(이웃 선언의 표시를 빌려 통과하지 않게)
  const above = text.slice(0, index).trimEnd().split('\n').at(-1) ?? '';
  if (above.includes(MARKER)) return true;
  // z.object(…)뿐 아니라 스키마를 만드는 함수 호출(pageOf(…))도 끝난 자리에서 satisfies를 봄
  const call = /^[A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*\s*\(/.exec(value);
  if (!call) return false;
  const end = closingIndex(text, valueStart + call[0].length);
  // satisfies는 생성 계약(ApiContract)을 거친 것만 인정(부분 묶음 Pick·Omit 포함)
  const after = /^\s*satisfies\b([^;]*?)(?:;|\n\S)/s.exec(text.slice(end + 1));
  if (after?.[1]?.includes('ApiContract')) return true;
  // 묶인 항목 스키마의 배열(z.array(itemSchema))은 항목 쪽을 봄
  const arrayOf = /^z\s*\.\s*array\s*\(\s*([A-Za-z_]\w*)\s*\)/.exec(value);
  if (arrayOf && !seen.has(arrayOf[1])) {
    seen.add(arrayOf[1]);
    const item = findDeclaration(declaration.file, arrayOf[1]);
    return item ? isAccounted(item, seen) : false;
  }
  return false;
};

const missing = new Set();
const unresolved = new Set();
for (const file of sourceFiles(SRC)) {
  const rel = relative(SRC, file);
  if (PENDING_DIRS.some((dir) => rel.startsWith(dir))) continue;
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(/\brequestData\s*\(/g)) {
    const start = match.index + match[0].length;
    const schema = splitArgs(text.slice(start, closingIndex(text, start)))[1];
    if (!schema) continue;
    // 데이터 없는 응답을 바로 넘긴 경우(z.null() 등)는 계약 대상 아님
    if (/^z\s*\.\s*(null|unknown|void|undefined)\s*\(/.test(schema)) continue;
    const declaration = /^[A-Za-z_]\w*$/.test(schema) ? findDeclaration(file, schema) : undefined;
    // 공용 함수의 매개변수로 받은 스키마는 그 함수를 부르는 쪽에서 검사
    if (!declaration && new RegExp(`\\(\\s*[^)]*\\b${schema}\\s*:`).test(text)) continue;
    if (!declaration) {
      unresolved.add(`src/${rel} ${schema.slice(0, 40)}`);
      continue;
    }
    if (!isAccounted(declaration)) missing.add(`src/${relative(SRC, declaration.file)} ${schema}`);
  }
}

if (unresolved.size > 0) {
  console.error(
    `응답 스키마의 선언을 찾지 못했습니다. 스키마를 이름 있는 상수로 선언해 넘겨 주세요:\n${[...unresolved].map((item) => `  - ${item}`).join('\n')}`,
  );
}
if (missing.size > 0) {
  console.error(
    `생성 계약과 묶이지 않은 응답 스키마가 있습니다. \`satisfies z.ZodType<ApiContract<…>>\`로 묶거나 선언 바로 위에 \`// ${MARKER} <이유>\`를 적어 주세요:\n${[...missing].map((item) => `  - ${item}`).join('\n')}`,
  );
}
if (missing.size > 0 || unresolved.size > 0) process.exit(1);
