import type { ComponentProps } from 'react';
import { cn } from '../../../utils';
import styles from './editingAnimation.module.css';

export type EditingAnimationProps = Omit<
  ComponentProps<'span'>,
  'children' | 'role' | 'tabIndex' | 'aria-label' | 'aria-hidden' | 'aria-labelledby'
> & {
  /** 상태 이름(예: "편집 중"). 있으면 이미지로 노출, 없으면 장식(aria-hidden) 처리 */
  label?: string;
};

/**
 * 사진 편집·공동 편집 구간 표시: 점 3개가 차례로 커졌다 작아지는 30×25 애니메이션(Figma `EditingAnimation`)
 * 표시 시점과 문구는 호출하는 쪽 담당, `TextField`의 `editing` 점과는 별개 컴포넌트
 */
export const EditingAnimation = ({ label, className, ...props }: EditingAnimationProps) => (
  <span
    {...props}
    className={cn(styles.root, className)}
    {...(label?.trim() ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
  >
    <span className={styles.dot} />
    <span className={styles.dot} />
    <span className={styles.dot} />
  </span>
);
