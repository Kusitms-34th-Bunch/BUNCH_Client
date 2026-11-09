'use client';

import { useEffect, useState, type SyntheticEvent } from 'react';

// 로고(`data-dev-login-trigger`)를 이 간격 안에 연달아 이 횟수만큼 누르면 입력이 나타남
const TAPS_TO_OPEN = 3;
const TAP_GAP_MS = 1500;

/**
 * 개발 전용 토큰 로그인(소셜 로그인 없이 닉네임으로 계정을 정함): 숨겨 두었다가 로고를 3번 누르면 로그인 화면 맨 위에 입력과 버튼을 보임
 * 서버 전용 `DEV_TOKEN_LOGIN=enabled`(운영 빌드 제외)일 때만 route가 렌더하고, `/api/dev/token`도 같은 조건으로 막음
 * 성공하면 쿠키가 생긴 상태로 화면을 새로 불러와 `AuthGate`가 가입 상태에 맞는 화면으로 보냄
 */
export function DevTokenLogin() {
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let taps = 0;
    let last = 0;
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('[data-dev-login-trigger]')) return;
      taps = event.timeStamp - last <= TAP_GAP_MS ? taps + 1 : 1;
      last = event.timeStamp;
      if (taps >= TAPS_TO_OPEN) setOpen(true);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const submit = async (event: SyntheticEvent) => {
    event.preventDefault();
    if (pending || nickname.trim() === '') return;
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch('/api/dev/token', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim() }),
      });
      if (!response.ok) {
        setError(`개발 로그인 실패(${response.status})`);
        return;
      }
      window.location.replace('/login');
    } catch {
      setError('개발 로그인 실패(네트워크)');
    } finally {
      setPending(false);
    }
  };

  if (!open) return null;

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="bg-overlay-dim-subtle gap-s3 px-padding-p8 py-s4 fixed inset-x-0 top-0 z-40 mx-auto flex max-w-(--app-max-width) flex-col items-center"
    >
      <label className="typography-label-l text-text-inversed gap-s3 flex items-center">
        개발용 로그인 닉네임
        <input
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          className="typography-body-3-regular rounded-s2 px-s3 py-s2 text-text-primary bg-white"
        />
      </label>
      <button
        type="submit"
        aria-busy={pending || undefined}
        className="typography-label-l text-text-inversed underline"
      >
        개발용 로그인
      </button>
      {error ? (
        <p role="alert" className="typography-caption-1-medium text-text-inversed text-center">
          {error}
        </p>
      ) : null}
    </form>
  );
}
