import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const repositoryRoot = resolve(import.meta.dirname, '..');
const localEnvironmentPaths = [
  resolve(repositoryRoot, '.env.local'),
  resolve(repositoryRoot, '.env.openapi.local'),
];
const outputPath = 'packages/api-core/src/generated/openapi.ts';

const readLocalSchemaSource = () => {
  for (const environmentPath of localEnvironmentPaths) {
    if (!existsSync(environmentPath)) continue;

    const line = readFileSync(environmentPath, 'utf8')
      .split(/\r?\n/)
      .find((value) => value.trim().startsWith('OPENAPI_SCHEMA_URL='));

    const schemaSource = line
      ?.split('=')
      .slice(1)
      .join('=')
      .trim()
      .replace(/^['"]|['"]$/g, '');

    if (schemaSource) return schemaSource;
  }

  return undefined;
};

const schemaSource = process.env.OPENAPI_SCHEMA_URL ?? readLocalSchemaSource();

if (!schemaSource) {
  console.error(`OPENAPI_SCHEMA_URL이 필요합니다.

일회성 실행:
  OPENAPI_SCHEMA_URL=<raw-openapi-json-or-yaml-url> yarn gen:api-types

로컬 환경 파일:
  .env.local 또는 .env.openapi.local
  OPENAPI_SCHEMA_URL=<raw-openapi-json-or-yaml-url>

Swagger UI HTML 주소가 아니라 raw OpenAPI JSON 또는 YAML 주소를 사용하세요.`);
  process.exit(1);
}

const isRemoteSchema = /^https?:\/\//.test(schemaSource);
let temporaryDirectory;
let inputPath = schemaSource;

try {
  if (isRemoteSchema) {
    temporaryDirectory = mkdtempSync(resolve(tmpdir(), 'bunch-openapi-'));
    inputPath = resolve(temporaryDirectory, 'schema');

    const response = await fetch(schemaSource, {
      headers: { accept: 'application/json, application/yaml, text/yaml, */*' },
    });

    if (!response.ok) {
      throw new Error(`OpenAPI schema 요청에 실패했습니다. status=${response.status}`);
    }

    writeFileSync(inputPath, await response.text());
  } else {
    inputPath = resolve(repositoryRoot, schemaSource);

    if (!existsSync(inputPath)) {
      throw new Error('OpenAPI schema 파일을 찾을 수 없습니다.');
    }
  }

  const yarnCommand = process.platform === 'win32' ? 'yarn.cmd' : 'yarn';
  const result = spawnSync(
    yarnCommand,
    ['exec', 'openapi-typescript', inputPath, '-o', outputPath],
    {
      cwd: repositoryRoot,
      stdio: 'inherit',
    },
  );

  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : 'OpenAPI 타입 생성에 실패했습니다.');
  process.exitCode = 1;
} finally {
  if (temporaryDirectory) rmSync(temporaryDirectory, { force: true, recursive: true });
}
