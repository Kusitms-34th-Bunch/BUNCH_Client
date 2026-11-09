import styles from './RippleLoading.module.css';

// 70×70 패턴 안의 모듈 위치(px)와 켜지는 단계: 가운데 → 대각 → 십자 팔 → 십자 끝(Figma 5483:719 이하)
const MODULES = [
  { left: 30, top: 30, kind: styles.center },
  { left: 20, top: 20, kind: styles.diagonal },
  { left: 40, top: 20, kind: styles.diagonal },
  { left: 20, top: 40, kind: styles.diagonal },
  { left: 40, top: 40, kind: styles.diagonal },
  { left: 30, top: 10, kind: styles.arm },
  { left: 10, top: 30, kind: styles.arm },
  { left: 50, top: 30, kind: styles.arm },
  { left: 30, top: 50, kind: styles.arm },
  { left: 30, top: 0, kind: styles.tip },
  { left: 0, top: 30, kind: styles.tip },
  { left: 60, top: 30, kind: styles.tip },
  { left: 30, top: 60, kind: styles.tip },
] as const;

/**
 * 업로드처럼 끝나는 때를 모르는 긴 작업의 로딩(Figma Loading / Core Glints / Ripple): 가운데에서 퍼지는 픽셀 파동이 90°씩 돎
 * 장식이라 상태 안내는 화면의 live region이 담당
 */
export function RippleLoading() {
  return (
    <div aria-hidden="true" className={styles.root}>
      <div className={styles.pattern}>
        {MODULES.map((module) => (
          <span
            key={`${module.left}-${module.top}`}
            className={`${styles.module} ${module.kind}`}
            style={{ left: module.left, top: module.top }}
          />
        ))}
      </div>
    </div>
  );
}

/** 화면 전체를 dim으로 덮고 가운데에 파동 로딩(업로드 중, 덮는 동안 아래 화면은 눌러도 반응하지 않음) */
export function RippleLoadingOverlay() {
  return (
    <div className="bg-overlay-dim-subtle fixed inset-0 z-30 flex items-center justify-center">
      <RippleLoading />
    </div>
  );
}
