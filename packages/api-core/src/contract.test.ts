import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { ApiContract } from './contract';

type Wire = { id: number; name?: string; role: 'A' | 'B' };

describe('ApiContract', () => {
  it('선택 필드는 생략·null을 허용하고, 필수 필드 누락과 계약 밖 enum 값은 컴파일에서 잡는다', () => {
    const matches = z.object({
      id: z.number(),
      name: z.string().nullish(),
      role: z.enum(['A', 'B']),
    }) satisfies z.ZodType<ApiContract<Wire>>;
    // @ts-expect-error 필수 필드(id) 누락
    const missingRequired = z.object({ role: z.enum(['A', 'B']) }) satisfies z.ZodType<
      ApiContract<Wire>
    >;
    const extraEnumValue = z.object({
      id: z.number(),
      role: z.enum(['A', 'B', 'C']),
      // @ts-expect-error 계약에 없는 enum 값
    }) satisfies z.ZodType<ApiContract<Wire>>;

    expect([matches, missingRequired, extraEnumValue]).toHaveLength(3);
  });
});
