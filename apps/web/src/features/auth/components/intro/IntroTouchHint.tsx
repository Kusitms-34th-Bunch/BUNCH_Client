import { cn } from '@app/design-system';
import styles from './IntroTouchHint.module.css';

/** 오른쪽 아래 「눌러서 넘기기」 안내 원. 장면에 머무는 동안 계속 번짐(누르는 것은 화면 전체 버튼) */
export function IntroTouchHint({ shown }: { shown: boolean }) {
  return (
    <div aria-hidden="true" className={cn(styles.hint, shown && styles.shown)}>
      <div className={cn(styles.ring, styles.ripple)} />
      <div className={cn(styles.ring, styles.halo)} />
      <div className={styles.core} />
    </div>
  );
}
