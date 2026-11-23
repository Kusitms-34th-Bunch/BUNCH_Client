import styles from './pickMotion.module.css';

// 글린트 모듈 13칸의 [left, top] px(Figma 노드 순서, 10px 칸, 70×70 안)
const GLINT_CELLS = [
  [30, 0],
  [30, 10],
  [20, 20],
  [40, 20],
  [0, 30],
  [10, 30],
  [30, 30],
  [50, 30],
  [60, 30],
  [20, 40],
  [40, 40],
  [30, 50],
  [30, 60],
] as const;
// 내 칩 옆 작은 글린트 모듈 13칸(2px 칸, 14×14 안)
const MINI_CELLS = [
  [6, 0],
  [6, 2],
  [4, 4],
  [8, 4],
  [0, 6],
  [2, 6],
  [6, 6],
  [10, 6],
  [12, 6],
  [4, 8],
  [8, 8],
  [6, 10],
  [6, 12],
] as const;
// 노드별 키프레임 클래스(순서는 위 칸과 같음)
const GLINT_CLASSES = [
  styles.glintModule0,
  styles.glintModule1,
  styles.glintModule2,
  styles.glintModule3,
  styles.glintModule4,
  styles.glintModule5,
  styles.glintModule6,
  styles.glintModule7,
  styles.glintModule8,
  styles.glintModule9,
  styles.glintModule10,
  styles.glintModule11,
  styles.glintModule12,
];
const SPARK_CLASSES = [
  styles.spark0,
  styles.spark1,
  styles.spark2,
  styles.spark3,
  styles.spark4,
  styles.spark5,
  styles.spark6,
  styles.spark7,
];

/** 픽하기 모션 중 사진 위 장식(어둡게 덮기·글린트·불꽃), 화면 낭독에서 숨김 */
export function PickGlint() {
  return (
    <div aria-hidden="true">
      <span className={styles.dim} />
      <span className={styles.glint}>
        {GLINT_CELLS.map(([left, top], i) => (
          <span
            key={i}
            className={`${styles.glintModule} ${GLINT_CLASSES[i]}`}
            style={{ left, top }}
          />
        ))}
      </span>
      {SPARK_CLASSES.map((cls, i) => (
        <span key={i} className={`${styles.spark} ${cls}`} />
      ))}
    </div>
  );
}

/** 픽하기 모션 중 내 칩 옆 작은 글린트 */
export function PickMiniGlint() {
  return (
    <span aria-hidden="true" className={styles.mini}>
      {MINI_CELLS.map(([left, top], i) => (
        <span key={i} className={styles.miniModule} style={{ left, top }} />
      ))}
    </span>
  );
}
