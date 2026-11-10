'use client';

import {
  Button,
  ConfirmDialog,
  Header,
  LineChevronLeftLargeIcon,
  LineSparklesSmallIcon,
  TextButton,
} from '@app/design-system';
import { BundleRecommendSheet } from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { usePreservedCallback } from 'react-simplikit';
import { NoBunch } from '@/features/photo-box/components/NoBunch';
import { PhotoBoxError } from '@/features/photo-box/components/PhotoBoxError';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { useScreenOverlay } from '@/shared/hooks/useScreenOverlay';
import { BUNDLE_SELECT_MESSAGES, MAX_RECOMMEND_CHIPS } from '../../constants/selectMessages';
import { BUNDLE_SELECT_PATHS } from '../../constants/selectPaths';
import { useBundleSelect } from '../../contexts/bundleSelectContext';
import { SelectPhotoList } from '../SelectPhotoList';

type BundleSelectProps = {
  /** 날짜 형식(올해 여부)의 기준 연도. 기본은 올해 */
  currentYear?: number | undefined;
};

/**
 * `/bunch/bundles/new` 번들 만들기 두 번째 단계: 멤버를 고른 뒤 사진함 사진을 날짜별로 보며 순서대로 고르고, 추천 번들로 한 번에 고름
 * 헤더 오른쪽 「추천 번들 보기」는 고른 사진과 관계없이 늘 켜져 있고, 하단 「이전」은 멤버 선택으로, 「다음」은 1장 이상 골라야 켜지며 초안을 만듦
 * 멤버를 고르지 않고 직접 주소로 들어오면 멤버 선택으로 되돌림(새로고침하면 선택이 사라지므로 같은 처리)
 */
export function BundleSelect({ currentYear = new Date().getFullYear() }: BundleSelectProps) {
  const router = useRouter();
  const backOr = useBackOr();
  const select = useBundleSelect();
  const { photoState, retry, selection, memberId, memberIds, creating, scrollTarget } = select;

  const openOverlay = useScreenOverlay();
  // 추천 상세로 가면 돌아왔을 때 시트를 다시 올림
  const reopenOnReturn = useRef(false);
  const { openSheet, closeSheet, sheetOpen } = select;
  useEffect(
    () => () => {
      if (reopenOnReturn.current) openSheet();
    },
    [openSheet],
  );

  // 확인 창은 「취소」·Esc가 시트를 다시 올리고, 「변경하기」만 기존 선택을 풀고 추천 사진으로 바꿈
  const openChangeConfirm = (id: string) => {
    let confirmed = false;
    openOverlay(
      (rootProps, close) => (
        <ConfirmDialog
          {...rootProps}
          title={BUNDLE_SELECT_MESSAGES.changeTitle}
          description={BUNDLE_SELECT_MESSAGES.changeDescription}
          confirmLabel={BUNDLE_SELECT_MESSAGES.changeConfirm}
          cancelLabel={BUNDLE_SELECT_MESSAGES.cancel}
          onConfirm={() => {
            confirmed = true;
            close();
            confirmChange(id);
          }}
        />
      ),
      () => {
        if (!confirmed) openSheet();
      },
    );
  };

  // 창이 열린 사이 사진함이 바뀔 수 있어 누를 때의 최신 사진으로 판단
  const pickRecommendation = usePreservedCallback(select.pickRecommendation);
  const confirmChange = usePreservedCallback(select.confirmChange);

  const openRecommend = usePreservedCallback(() => {
    // 시트가 다 닫힌 뒤 확인 창을 열어 초점이 두 창 사이에서 엉키지 않게 함
    let confirmId: string | undefined;
    openOverlay(
      (rootProps, close) => (
        <RecommendOverlay
          {...rootProps}
          initialPickedId={select.pickedId}
          bundles={select.recommendations.map((item) => ({
            id: item.id,
            imageSrc: item.imageSrc,
            title: item.title,
            members: [...item.memberNames],
            photoCount: item.photoIds.length,
            month: item.month,
            day: item.day,
          }))}
          onPick={(id) => {
            const result = pickRecommendation(id);
            if (result === 'deleted') return;
            if (result === 'confirm') confirmId = id;
            close();
          }}
          onOpenDetail={(id) => {
            reopenOnReturn.current = true;
            router.push(BUNDLE_SELECT_PATHS.recommendation(id));
          }}
          maxVisibleMembers={MAX_RECOMMEND_CHIPS}
          emptyLabel={BUNDLE_SELECT_MESSAGES.sheetLabel}
          emptyTitle={BUNDLE_SELECT_MESSAGES.emptyTitle}
          emptyDescription={BUNDLE_SELECT_MESSAGES.emptyDescription}
        />
      ),
      () => {
        if (confirmId) openChangeConfirm(confirmId);
      },
    );
  });

  // 멤버를 고르지 않고 들어오면(새로고침·직접 주소) 첫 단계로 돌려보냄
  const noMembers = memberIds.length === 0;
  useEffect(() => {
    if (noMembers) router.replace(BUNDLE_SELECT_PATHS.members);
  }, [noMembers, router]);

  // 시트 요청은 사진을 다 받은 뒤 처리(추천 상세에서 돌아온 경우 포함)
  const ready = !noMembers && photoState.kind === 'ready';
  useEffect(() => {
    if (!sheetOpen || !ready) return;
    closeSheet();
    openRecommend();
  }, [sheetOpen, ready, closeSheet, openRecommend]);

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

  if (noMembers || photoState.kind === 'loading') return <PageLoading />;
  if (photoState.kind === 'error') return <PhotoBoxError onRetry={retry} />;
  if (photoState.kind === 'no-bunch') {
    return (
      <PageShell>
        <h1 className="sr-only">{BUNDLE_SELECT_MESSAGES.title}</h1>
        <NoBunch />
      </PageShell>
    );
  }

  // 멤버 칩은 「전체」와 앞 단계에서 고른 멤버, 그리고 나(항상 참여)만 보임
  const { members, viewer } = photoState.data;
  const data = {
    ...photoState.data,
    members: members.filter(
      (member) => member.id === viewer.memberId || memberIds.includes(member.id),
    ),
  };

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
                onClick={() => backOr(BUNDLE_SELECT_PATHS.bunchHome)}
              >
                <LineChevronLeftLargeIcon aria-hidden="true" />
              </HeaderIconButton>
            }
            title={BUNDLE_SELECT_MESSAGES.title}
            trailing={
              <TextButton
                size="sm"
                leftIcon={<LineSparklesSmallIcon aria-hidden="true" />}
                onClick={select.openSheet}
              >
                {BUNDLE_SELECT_MESSAGES.viewRecommend}
              </TextButton>
            }
          />
        </div>
      }
      bottom={
        <div
          inert={creating}
          // 안전 영역은 AppFrame이 이미 띄우므로 버튼 아래 간격만
          className="bg-surface-primary border-border-tertiary gap-s5 pt-padding-p7 px-padding-p8 pb-s4 flex border-t"
        >
          <Button
            variant="tertiary"
            className="min-w-0 flex-1"
            onClick={() => backOr(BUNDLE_SELECT_PATHS.members)}
          >
            {BUNDLE_SELECT_MESSAGES.previous}
          </Button>
          <Button
            className="min-w-0 flex-1"
            disabled={selection.length === 0}
            onClick={select.create}
          >
            {BUNDLE_SELECT_MESSAGES.next}
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
        data={data}
        selection={selection}
        selectedCounts={select.selectedCounts}
        memberId={memberId}
        onMemberChange={select.setMemberId}
        onToggle={select.toggle}
        currentYear={currentYear}
        inert={creating}
      />
    </PageShell>
  );
}

type RecommendOverlayProps = Omit<
  ComponentProps<typeof BundleRecommendSheet>,
  'selectedId' | 'onSelect'
> & {
  initialPickedId: string | undefined;
  onPick: (_id: string) => void;
};

/** 시트가 열린 채 카드를 눌러도(사진이 사라진 추천) 선택 모양이 바뀌게 함(overlay는 열 때의 값으로 그려짐) */
function RecommendOverlay({ initialPickedId, onPick, ...props }: RecommendOverlayProps) {
  const [pickedId, setPickedId] = useState(initialPickedId);
  return (
    <BundleRecommendSheet
      {...props}
      selectedId={pickedId}
      onSelect={(id) => {
        setPickedId(id);
        onPick(id);
      }}
    />
  );
}
