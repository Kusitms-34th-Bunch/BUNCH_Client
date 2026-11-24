import type { Metadata } from 'next';

// 보여 줄 화면이 없는 진입 주소라 검색에서 제외(색인 대상은 로그인뿐)
export const metadata: Metadata = { robots: { index: false } };

/**
 * 앱 진입 주소(앱 쉘이 처음 여는 `/`). 보여 줄 화면이 없고 `AuthGate`가 지금 상태의 진입 화면으로 보냄
 * 비로그인은 인트로·로그인, 가입 중은 남은 가입 단계, 가입 완료는 번치 홈 또는 번치 시작 선택(기획 1.2.8)
 */
export default function RootPage() {
  return null;
}
