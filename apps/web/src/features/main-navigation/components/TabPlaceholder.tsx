import { PageShell } from '@/shared/components/layout/PageShell';

/**
 * 탭 화면 내용이 정해지기 전의 임시 화면
 * 하단 탭 막대가 본문 위에 떠 있어도 스크롤 끝 여백은 PageShell이 확보(고정 버튼만 화면이 --main-tab-bar-height로 올림)
 */
export function TabPlaceholder({ title }: { title: string }) {
  return (
    <PageShell>
      <div className="gap-s4 flex h-full flex-col items-center justify-center">
        <h1 className="typography-title-1 text-text-primary">{title}</h1>
        <p className="typography-body-1-medium text-text-secondary">탭 화면 준비 중 (임시)</p>
      </div>
    </PageShell>
  );
}
