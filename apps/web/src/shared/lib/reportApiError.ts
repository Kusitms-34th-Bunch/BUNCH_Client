import { INVALID_RESPONSE_CODE, isApiError } from '@app/api-core';
import { captureException } from '@sentry/nextjs';

/**
 * 개발팀이 알아야 하는 오류인지(docs/architecture/data-layer.md 「오류 보고」)
 * 보고: 5xx(재시도 뒤)·분류 못 한 오류·응답 계약 위반·ApiError가 아닌 코드 결함 / 제외: 401·403·네트워크·업무 4xx(화면이 안내)
 */
export const shouldReportApiError = (error: unknown) => {
  if (!isApiError(error)) return true;
  if (error.category === 'server' || error.category === 'unknown') return true;
  return error.category === 'validation' && error.code === INVALID_RESPONSE_CODE;
};

// 서버가 준 code는 오류 코드 형식일 때만 씀(예상 밖 값이 묶음 키·제목에 실리지 않게)
const SAFE_CODE = /^[A-Z][A-Z0-9_]{0,40}$/;

/**
 * 보고 대상이면 Sentry로 전송. ApiError는 응답 원문이 든 message 대신 고정 문구로 보냄(결정 기록 006)
 * 같은 분류·status·code끼리 묶음
 */
export const reportApiError = (error: unknown) => {
  if (!shouldReportApiError(error)) return;
  if (!isApiError(error)) {
    captureException(error);
    return;
  }
  const status = String(error.status ?? '-');
  const code = error.code !== undefined && SAFE_CODE.test(error.code) ? error.code : '-';
  const report = new Error(`API ${error.category} ${status} ${code}`);
  report.name = 'ApiError';
  captureException(report, { fingerprint: ['api-error', error.category, status, code] });
};
