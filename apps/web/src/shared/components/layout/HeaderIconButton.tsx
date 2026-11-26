import type { ReactNode, Ref } from 'react';
import { IconButton, type IconButtonPress } from '@app/design-system';

// 아이콘 색(currentColor), subtle은 Figma 가입 단계 헤더의 연한 회색, tertiary는 Figma 약관 및 개인정보 헤더(#535A61), inversed는 어두운 배경 화면(사진 조정)
const TONES = {
  primary: 'text-icon-primary',
  subtle: 'text-icon-quaternary',
  tertiary: 'text-icon-tertiary',
  inversed: 'text-icon-inversed',
} as const;

export type HeaderIconButtonProps = {
  /** 접근성 이름(아이콘만 있어서 필수) */
  label: string;
  /** 24px 아이콘. 장식용이며 버튼 이름으로 대체 */
  children: ReactNode;
  /** 동작 미연결 시 생략 */
  onClick?: (() => void) | undefined;
  /** 아이콘 색(기본 primary) */
  tone?: keyof typeof TONES;
  /** 화면이 초점을 옮길 때(예: 다시 할 수 없는 실패 뒤 나가기로) */
  ref?: Ref<HTMLButtonElement> | undefined;
  /** 눌림(Figma 8311:57033): 뒤로 가기는 fade(아이콘 흐려짐), 그 밖은 overlay(아이콘 뒤 배경) */
  press?: IconButtonPress | undefined;
};

/**
 * 40px 터치 영역을 유지하면서 아이콘을 왼쪽 16px에 정렬.
 * 터치 영역(양옆 8px)은 레이아웃 폭에 넣지 않아 24px 아이콘 바로 옆 8px에서 제목이 시작함(Figma 헤더)
 */
export function HeaderIconButton({
  label,
  children,
  onClick,
  tone = 'primary',
  ref,
  press = 'overlay',
}: HeaderIconButtonProps) {
  return (
    <IconButton
      ref={ref}
      variant="plain"
      press={press}
      aria-label={label}
      onClick={onClick}
      // 40px 버튼이 누르는 범위라 before로 넓히지 않음
      className={`${TONES[tone]} -mx-s4 size-s16 before:inset-0 focus-visible:outline-offset-2`}
    >
      {children}
    </IconButton>
  );
}
