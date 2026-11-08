'use client';

import { useSearchParams } from 'next/navigation';

/**
 * 개발 전용 카카오 웹 로그인 진입점(삭제 예정): 로그인 화면 맨 위에 작은 링크와 실패 코드를 보임
 * 서버 전용 `DEV_WEB_LOGIN=enabled`일 때만 route가 렌더하고, 서버(`/api/dev/kakao/*`)도 같은 변수로 막음
 * 일반 이동이 아니라 전체 이동이어야 해서 `a`를 씀(카카오 인가 화면으로 나갔다가 돌아옴)
 */
// 서버가 내보내는 코드 모양(KOE303, backend_AUTH_009 등)만 보임: 주소에 임의 문구를 넣어 화면에 띄우는 것을 막음
const ERROR_CODE = /^[A-Za-z0-9_]{1,40}$/;

export function DevWebLogin() {
  const raw = useSearchParams().get('devLoginError');
  const error = raw && ERROR_CODE.test(raw) ? raw : undefined;

  return (
    <div className="bg-overlay-dim-subtle gap-s3 px-padding-p8 py-s4 fixed inset-x-0 top-0 z-40 mx-auto flex max-w-(--app-max-width) flex-col items-center">
      {/* API route로의 전체 이동(카카오 인가 화면으로 나갔다 돌아옴)이라 Link를 쓰지 않음 */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        href="/api/dev/kakao/authorize"
        className="typography-label-l text-text-inversed underline"
      >
        카카오 웹 로그인 (개발용)
      </a>
      {error ? (
        <p role="alert" className="typography-caption-1-medium text-text-inversed text-center">
          웹 로그인 실패: {error}
        </p>
      ) : null}
    </div>
  );
}
