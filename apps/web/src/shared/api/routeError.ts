import { normalizeError } from '@app/api-core';
import { NextResponse } from 'next/server';

/**
 * Route Handler 오류를 BFF 응답(`{ message, code }`)으로 변환
 * 상태 코드가 있는 오류(백엔드 HTTP 오류 포함)는 그대로 전달, 백엔드 연결 실패는 502, 그 외는 내부 메시지 노출 없이 500
 */
export const toErrorResponse = (error: unknown): NextResponse => {
  const normalized = normalizeError(error);

  if (normalized.category === 'network') {
    return NextResponse.json(
      { message: '서버에 연결하지 못했습니다.', code: 'BFF_UPSTREAM_UNAVAILABLE' },
      { status: 502 },
    );
  }

  if (normalized.status === undefined) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }

  return NextResponse.json(
    { message: normalized.message, code: normalized.code },
    { status: normalized.status },
  );
};
