'use client';

import { Button, Header, LineChevronLeftLargeIcon } from '@app/design-system';
import { ChipButton, ProfileListItem } from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import type { PhotoBoxMember } from '@/features/photo-box/lib/types';
import { NoBunch } from '@/features/photo-box/components/NoBunch';
import { PhotoBoxError } from '@/features/photo-box/components/PhotoBoxError';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { BUNDLE_SELECT_MESSAGES } from '../../constants/selectMessages';
import { BUNDLE_SELECT_PATHS } from '../../constants/selectPaths';
import { useBundleSelect } from '../../contexts/bundleSelectContext';

// 사진함 멤버 역할을 역할 배지로 옮김(일반 멤버는 배지 없음)
const toBadge = (role: PhotoBoxMember['role']) =>
  role === 'OWNER' ? 'owner' : role === 'CO_OWNER' ? 'coOwner' : undefined;

/**
 * `/bunch/bundles/new/members` 번들 만들기 첫 단계: 사진을 고르기 전에 함께 만들 멤버를 고름(Figma `5664:99697`·`99724`)
 * 나는 목록에서 빼고(항상 참여), 「추가하기」를 누르면 「추가됨」이 되며 다시 누르면 해제
 * 1명 이상 추가해야 「다음」이 켜지고, 고른 멤버는 사진 선택 화면의 멤버 칩 범위가 됨
 */
export function BundleMemberSelect() {
  const router = useRouter();
  const backOr = useBackOr();
  const { photoState, retry, memberIds, toggleMember } = useBundleSelect();

  if (photoState.kind === 'loading') return <PageLoading />;
  if (photoState.kind === 'error') return <PhotoBoxError onRetry={retry} />;
  if (photoState.kind === 'no-bunch') {
    return (
      <PageShell>
        <h1 className="sr-only">{BUNDLE_SELECT_MESSAGES.membersTitle}</h1>
        <NoBunch />
      </PageShell>
    );
  }

  const { members, viewer } = photoState.data;
  const candidates = members.filter((member) => member.id !== viewer.memberId);
  // 번치에서 빠진 멤버가 남아 있어도 세지 않음
  const addedCount = candidates.filter((member) => memberIds.includes(member.id)).length;

  return (
    <PageShell
      header={
        <Header
          leading={
            <HeaderIconButton
              label={BUNDLE_SELECT_MESSAGES.back}
              // 직접 주소로 들어와 돌아갈 기록이 없으면 번치 홈으로 이동
              onClick={() => backOr(BUNDLE_SELECT_PATHS.bunchHome)}
            >
              <LineChevronLeftLargeIcon aria-hidden="true" />
            </HeaderIconButton>
          }
        />
      }
      bottom={
        // 안전 영역은 AppFrame이 이미 띄우므로 버튼 아래 간격만
        <div className="bg-surface-primary pt-padding-p7 px-padding-p8 pb-s4">
          <Button
            className="w-full"
            disabled={addedCount === 0}
            onClick={() => router.push(BUNDLE_SELECT_PATHS.select)}
          >
            {BUNDLE_SELECT_MESSAGES.next}
          </Button>
        </div>
      }
    >
      <h1 className="typography-title-1-semi-bold text-text-primary px-s8 pt-s8">
        {BUNDLE_SELECT_MESSAGES.membersTitle}
      </h1>
      {/* 추가한 멤버 수를 알리는 live region(항상 마운트해 문구만 바꿈) */}
      <p role="status" className="sr-only">
        {BUNDLE_SELECT_MESSAGES.membersStatus(addedCount)}
      </p>
      {candidates.length === 0 ? (
        // 번치에 나 혼자라 함께 만들 멤버가 없음(「다음」이 꺼진 이유를 알림)
        <p className="typography-body-3-regular text-text-tertiary px-s8 pt-s8">
          {BUNDLE_SELECT_MESSAGES.membersRequired}
        </p>
      ) : null}
      <ul className="gap-s4 px-padding-p8 pt-s8 flex flex-col">
        {candidates.map((member) => {
          const added = memberIds.includes(member.id);
          const badge = toBadge(member.role);
          return (
            <li key={member.id}>
              <ProfileListItem
                name={member.name}
                imageSrc={member.avatarSrc}
                memberRole={badge}
                roleLabel={badge ? BUNDLE_SELECT_MESSAGES.memberRoleLabel[badge] : undefined}
                action={
                  <ChipButton
                    size="M"
                    selected={added}
                    // 행끼리 구분되도록 보이는 글자 뒤에 멤버 이름을 붙임
                    aria-label={BUNDLE_SELECT_MESSAGES.memberAddLabel(member.name, added)}
                    onClick={() => toggleMember(member.id)}
                  >
                    {added ? BUNDLE_SELECT_MESSAGES.memberAdded : BUNDLE_SELECT_MESSAGES.memberAdd}
                  </ChipButton>
                }
              />
            </li>
          );
        })}
      </ul>
    </PageShell>
  );
}
