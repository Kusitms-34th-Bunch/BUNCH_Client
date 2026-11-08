import { LoadingRipple } from './LoadingRipple';

/**
 * 페이지 전체 로딩(앱 공통 기준, 편집 중이 아닌 로딩 상태는 모두 이 표시): 화면 전체를 `overlay-dim-subtle`로 덮고 가운데에 물결 점 패턴(`loading.json`)
 * 덮는 동안 아래 화면은 눌러도 반응하지 않고, 상태 안내는 호출하는 쪽의 live region이 담당
 */
export function PageLoading() {
  return (
    <div className="bg-overlay-dim-subtle fixed inset-0 z-30 flex items-center justify-center">
      <LoadingRipple />
    </div>
  );
}
