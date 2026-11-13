'use client';

import { isApiError } from '@app/api-core';
import { Header, LineChevronLeftLargeIcon } from '@app/design-system';
import { ProfileListItem } from '@app/design-system/web';
import { useQuery } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { ROLE_LABELS } from '../../constants/roles';
import { findOtherBunch } from '../../fixtures/otherBunches.fixture';
import { useBlockRelation } from '../../hooks/useBlockRelation';
import { otherBunchHomeQueryOptions } from '../../queries/otherBunch';
import { BunchHomeError } from '../home/BunchHomeError';
import { PrivateBunchNotice } from '../PrivateBunchNotice';
import { BlockedBunchScreen } from './BlockedBunchScreen';

/**
 * `/bunches/[bunchId]/members` 다른 번치의 멤버 목록(화면설계서 2500:71333 4번)
 * 확인용이라 관리 동작 없음, 역할은 이미지 배지로
 */
export function OtherBunchMembers({ bunchId }: { bunchId: string }) {
  const backOr = useBackOr();
  // ponytail: 다른 번치 멤버 API가 없어 명단은 샘플, 접근(404·차단 403)과 잠금은 그 번치 홈(서버, 프로필과 같은 캐시) 기준
  const bunch = findOtherBunch(bunchId);
  const me = useQuery(myProfileQueryOptions());
  const viewerId = me.data ? (me.data.bunch?.id ?? null) : undefined;
  const home = useQuery(otherBunchHomeQueryOptions(bunchId, viewerId));
  const { access } = useBlockRelation(bunchId);
  const errorStatus = isApiError(home.error) ? home.error.status : undefined;
  const blocked = access === 'blocked' || errorStatus === 403;
  // 기록이 없으면 프로필로, 차단한 번치면 프로필도 접근 제한이라 피드로
  const back = () => backOr(blocked ? BUNCH_HOME_PATHS.feed : BUNCH_HOME_PATHS.otherBunch(bunchId));
  // 내가 차단한 번치는 서버 응답(404 등)보다 먼저 접근 제한
  if (access === 'blocked') return <BlockedBunchScreen onBack={back} />;
  if (!bunch || errorStatus === 400 || errorStatus === 404) notFound();
  if (errorStatus === 403) {
    return (
      <BlockedBunchScreen
        onBack={back}
        onRetry={() => {
          void me.refetch();
          void home.refetch();
        }}
      />
    );
  }
  if ((me.isError && !me.data) || (home.isError && !home.data)) {
    return (
      <BunchHomeError
        onRetry={() => {
          void me.refetch();
          if (viewerId !== undefined) void home.refetch();
        }}
        onBack={back}
      />
    );
  }
  if (access === 'checking' || !home.data) return <BlockedBunchScreen onBack={back} checking />;
  // 비공개 번치는 팔로우 승인 전에 멤버 명단을 볼 수 없음(기능명세 5.10, 서버 canViewMembers)
  const locked = !(home.data.canViewMembers ?? false);

  return (
    <PageShell
      header={
        <Header
          leading={
            <HeaderIconButton label="뒤로 가기" tone="subtle" onClick={back}>
              <LineChevronLeftLargeIcon />
            </HeaderIconButton>
          }
        />
      }
    >
      <h1 className="sr-only">{`${bunch.name} 멤버`}</h1>
      {locked ? (
        <PrivateBunchNotice
          description={BUNCH_HOME_MESSAGES.privateListDescription}
          className="mx-padding-p8 mt-s6"
        />
      ) : (
        <ul className="gap-s5 px-padding-p8 pt-padding-p6 pb-s8 flex flex-col">
          {bunch.members.map((member) => (
            <li key={member.id}>
              <ProfileListItem
                name={member.name}
                imageSrc={member.imageSrc}
                memberRole={member.role === 'member' ? undefined : member.role}
                roleLabel={member.role === 'member' ? undefined : ROLE_LABELS[member.role]}
              />
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
