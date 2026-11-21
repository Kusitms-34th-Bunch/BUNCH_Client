import { cn } from '@app/design-system';

type FloatingButtonToastAnchorProps = {
  /** 플로팅 버튼과 같은 위치 class(오른쪽·아래). 크기는 버튼(52px)과 같음 */
  className: string;
};

/**
 * 플로팅 버튼 자리의 토스트 앵커(`data-toast-anchor="floating"`): 토스트가 버튼 위 16px에 뜸(디자인 시스템 Toast spec)
 * 하단 탭 막대가 숨겨졌을 때(`HideMainTabBar`)만 크기를 가짐. 탭 막대가 있으면 토스트는 탭 막대 기준이고 플로팅 버튼은 가려져도 됨
 * iOS 시스템 탭 바는 웹에 탭 막대 앵커가 없어 디자인 시스템의 「탭 막대가 보이면 floating 무시」로는 거를 수 없으므로 여기서 숨김
 * 웹 버튼과 따로 두어 iOS 26 네이티브 버튼(웹 버튼 없음)일 때도, 버튼이 내려가는 전환 중에도 도착 위치로 잼
 */
export function FloatingButtonToastAnchor({ className }: FloatingButtonToastAnchorProps) {
  return (
    <div
      aria-hidden
      data-toast-anchor="floating"
      className={cn(
        'pointer-events-none absolute hidden size-13 group-has-data-hide-main-tab-bar/main:block',
        className,
      )}
    />
  );
}
