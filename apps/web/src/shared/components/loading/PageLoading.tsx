import { LoadingDots } from './LoadingDots';

/**
 * 페이지 전체 로딩(앱 공통 기준, 편집 중이 아닌 로딩 상태는 모두 이 표시): 화면 전체를 `overlay-dim-subtle`로 덮고 가운데에 점 3개(Figma 사진함_12)
 * 덮는 동안 아래 화면은 눌러도 반응하지 않고, 상태 안내는 호출하는 쪽의 live region이 담당
 */
export function PageLoading() {
  return (
    <div className="bg-overlay-dim-subtle fixed inset-0 z-30 flex items-center justify-center">
      <LoadingDots />
    </div>
  );
}
