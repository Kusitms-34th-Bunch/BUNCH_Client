# Generated OpenAPI Types

`openapi.ts`는 `yarn gen:api-types`가 생성하며 직접 수정하지 않는다.

- schema source: `OPENAPI_SCHEMA_URL` 또는 gitignore된 `.env.local`·`.env.openapi.local`
- output: `packages/api-core/src/generated/openapi.ts`
- version control: 생성된 `openapi.ts`는 검토 가능한 API 계약으로 커밋한다.

생성 타입은 API endpoint 경계에서만 import한다. UI props에는 필요한 형태로 좁힌 별도 타입을 사용한다.

```ts
import type { components, paths } from '@app/api-core/generated';
```
