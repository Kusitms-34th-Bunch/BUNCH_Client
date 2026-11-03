'use client';

import { Button, ConfirmDialog, Header, LineChevronLeftLargeIcon } from '@app/design-system';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { NoBunch } from '@/features/photo-box/components/NoBunch';
import { PhotoBoxError } from '@/features/photo-box/components/PhotoBoxError';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { BUNDLE_SELECT_MESSAGES } from '../../constants/selectMessages';
import { BUNDLE_SELECT_PATHS } from '../../constants/selectPaths';
import { useBundleSelect } from '../../contexts/bundleSelectContext';
import { SelectPhotoList } from '../SelectPhotoList';
import { RecommendSheet } from './RecommendSheet';

type BundleSelectProps = {
  /** 날짜 형식(올해 여부)의 기준 연도. 기본은 올해 */
  currentYear?: number | undefined;
};

/**
 * `/bunch/bundles/new` 번들 만들기 첫 화면: 사진함 사진을 날짜별로 보며 순서대로 고르고, 추천 번들로 한 번에 고름
 * 헤더·하단 두 버튼은 고정이고 「추천 번들」은 고른 사진과 관계없이 늘 켜져 있으며 「번들 만들기」는 1장 이상 골라야 켜짐
 * 목데이터 단계라 「번들 만들기」는 로딩 뒤 샘플 초안의 작성 화면으로 이동
 */
export function BundleSelect({ currentYear = new Date().getFullYear() }: BundleSelectProps) {
  const router = useRouter();
  const select = useBundleSelect();
  const { photoState, selection, memberId, creating, scrollTarget } = select;

  // 추천 번들을 적용하면 그 날짜 섹션으로 스크롤하고 제목에 포커스(요청마다 한 번, 끝나면 대상을 비움)
  const { clearScrollTarget } = select;
  useEffect(() => {
    if (!scrollTarget) return;
    const section = document.getElementById(`select-section-${scrollTarget.dateKey}`);
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    section?.scrollIntoView?.({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
    section?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
    clearScrollTarget();
  }, [scrollTarget, clearScrollTarget]);

  if (photoState.kind === 'loading') return <PageLoading />;
  if (photoState.kind === 'error') return <PhotoBoxError />;
  if (photoState.kind === 'no-bunch') {
    return (
      <PageShell>
        <h1 className="sr-only">{BUNDLE_SELECT_MESSAGES.title}</h1>
        <NoBunch />
      </PageShell>
    );
  }

  return (
    <PageShell
      header={
        // 번들을 만드는 동안은 헤더도 막아 뒤로 가기·시트가 만드는 중에 눌리지 않게 함
        <div inert={creating}>
          <Header
            leading={
              <HeaderIconButton
                label={BUNDLE_SELECT_MESSAGES.back}
                // 직접 주소로 들어와 돌아갈 기록이 없으면 번치 홈으로 이동(뒤로 가면 고른 사진은 버려짐)
                onClick={() =>
                  window.history.length > 1
                    ? router.back()
                    : router.replace(BUNDLE_SELECT_PATHS.bunchHome)
                }
              >
                <LineChevronLeftLargeIcon aria-hidden="true" />
              </HeaderIconButton>
            }
            title={BUNDLE_SELECT_MESSAGES.title}
          />
        </div>
      }
      bottom={
        <div
          inert={creating}
          className="bg-surface-primary gap-s5 pt-padding-p7 px-padding-p8 flex"
          style={{
            paddingBottom:
              'calc(var(--safe-area-bottom, env(safe-area-inset-bottom, 0px)) + var(--spacing-s4))',
          }}
        >
          <Button variant="tertiary" className="shrink-0" onClick={select.openSheet}>
            {BUNDLE_SELECT_MESSAGES.recommend}
          </Button>
          <Button
            className="min-w-0 flex-1"
            disabled={selection.length === 0}
            onClick={select.create}
          >
            {BUNDLE_SELECT_MESSAGES.create}
          </Button>
        </div>
      }
    >
      <h1 className="sr-only">{BUNDLE_SELECT_MESSAGES.title}</h1>
      {/* 선택 개수를 알리는 live region(항상 마운트해 문구만 바꿈) */}
      <p role="status" className="sr-only">
        {creating
          ? BUNDLE_SELECT_MESSAGES.creating
          : BUNDLE_SELECT_MESSAGES.selectionStatus(selection.length)}
      </p>
      {/* 번들을 만드는 동안은 화면 전체를 dim으로 덮고 가운데에 로딩 */}
      {creating ? <PageLoading /> : null}
      <SelectPhotoList
        data={photoState.data}
        selection={selection}
        selectedCounts={select.selectedCounts}
        memberId={memberId}
        onMemberChange={select.setMemberId}
        onToggle={select.toggle}
        currentYear={currentYear}
        inert={creating}
      />
      <RecommendSheet
        open={select.sheetOpen}
        onOpenChange={(open) => (open ? select.openSheet() : select.closeSheet())}
        recommendations={select.recommendations}
        pickedId={select.pickedId}
        onPick={select.togglePicked}
        onDetail={(id) => router.push(BUNDLE_SELECT_PATHS.recommendation(id))}
        onApply={select.apply}
      />
      {/* 확인 창은 「취소」·Esc가 시트를 다시 올리고, 「변경하기」만 기존 선택을 풀고 추천 사진으로 바꿈 */}
      <ConfirmDialog
        open={select.changeOpen}
        onOpenChange={() => undefined}
        title={BUNDLE_SELECT_MESSAGES.changeTitle}
        description={BUNDLE_SELECT_MESSAGES.changeDescription}
        confirmLabel={BUNDLE_SELECT_MESSAGES.changeConfirm}
        cancelLabel={BUNDLE_SELECT_MESSAGES.cancel}
        onConfirm={select.confirmChange}
        onCancel={select.cancelChange}
      />
    </PageShell>
  );
}
