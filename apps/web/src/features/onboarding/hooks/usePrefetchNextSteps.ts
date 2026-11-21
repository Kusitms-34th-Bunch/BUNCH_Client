import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * 다음 단계 화면의 코드를 그 화면이 그려지는 즉시 미리 받음(누른 뒤 받느라 멈추지 않게)
 * 개발 서버는 미리 받지 않으므로 효과는 운영 빌드에서 확인
 */
export function usePrefetchNextSteps(...paths: string[]) {
  const router = useRouter();
  // 매 렌더 새 배열이라 글자로 묶어 바뀔 때만 다시 부름
  const key = paths.join('\n');
  useEffect(() => {
    for (const path of key.split('\n')) router.prefetch(path);
  }, [router, key]);
}
