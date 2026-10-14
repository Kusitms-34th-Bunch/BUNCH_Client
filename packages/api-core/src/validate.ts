import type { z, ZodType } from 'zod';

export interface ParseResponseOptions {
  context?: string;
  // eslint-disable-next-line unused-imports/no-unused-vars -- 타입 시그니처, 구현이 아니라 문서화 목적
  onValidationError?: (error: z.ZodError, context?: string) => void;
}

export const parseResponse = <Schema extends ZodType>(
  schema: Schema,
  data: unknown,
  options: ParseResponseOptions = {},
): z.infer<Schema> | undefined => {
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  options.onValidationError?.(result.error, options.context);
  return undefined;
};
