import { useRouter } from 'next/navigation';

/**
 * 뒤로 가기: 기록이 있으면 `router.back()`, 직접 진입이라 없으면 `fallback`으로 `replace`
 * 기록 유무는 `window.history.length > 1`로만 판단(앱 안 이동 여부를 알리는 공개 신호가 없음)
 */
export function useBackOr() {
  const router = useRouter();
  return (fallback: string) =>
    window.history.length > 1 ? router.back() : router.replace(fallback);
}
