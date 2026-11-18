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
import { useBlockRelation } from '../../hooks/useBlockRelation';
import {
  otherBunchHomeQueryOptions,
  otherBunchMembersQueryOptions,
} from '../../queries/otherBunch';
import { BunchHomeError } from '../home/BunchHomeError';
import { PrivateBunchNotice } from '../PrivateBunchNotice';
import { BlockedBunchScreen } from './BlockedBunchScreen';

const statusOf = (error: unknown) => (isApiError(error) ? error.status : undefined);

/**
 * `/bunches/[bunchId]/members` 다른 번치의 멤버 목록(화면설계서 2500:71333 4번)
 * 확인용이라 관리 동작 없음, 역할은 이미지 배지로. 접근(404·차단 403)과 잠금은 그 번치 홈(프로필과 같은 캐시) 기준
 */
export function OtherBunchMembers({ bunchId }: { bunchId: string }) {
  const backOr = useBackOr();
  const me = useQuery(myProfileQueryOptions());
  const viewerId = me.data ? (me.data.bunch?.id ?? null) : undefined;
  const home = useQuery(otherBunchHomeQueryOptions(bunchId, viewerId));
  // 비공개 번치는 팔로우 승인 전에 멤버 명단을 볼 수 없음(기능명세 5.10, 서버 canViewMembers)
  const canView = home.data?.canViewMembers ?? false;
  const members = useQuery(otherBunchMembersQueryOptions(bunchId, viewerId, canView));
  const { access } = useBlockRelation(bunchId);
  const errorStatus = statusOf(home.error);
  const membersStatus = statusOf(members.error);
  // 접근 불가 안내(409 BUNCH_008: 나를 내보냈거나 지운 번치), 명단 404(BUNCH_009: 그사이 차단·삭제)는 다시 받아도 같음
  const unavailable = errorStatus === 409 || membersStatus === 409 || membersStatus === 404;
  const blocked = access === 'blocked' || errorStatus === 403 || unavailable;
  // 기록이 없으면 프로필로, 차단한 번치면 프로필도 접근 제한이라 피드로
  const back = () => backOr(blocked ? BUNCH_HOME_PATHS.feed : BUNCH_HOME_PATHS.otherBunch(bunchId));
  // 내가 차단한 번치는 서버 응답(404 등)보다 먼저 접근 제한
  if (access === 'blocked') return <BlockedBunchScreen onBack={back} />;
  if (errorStatus === 400 || errorStatus === 404) notFound();
  if (unavailable) return <BlockedBunchScreen onBack={back} />;
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
  // 명단 403(AUTH_002)은 그사이 비공개로 바뀌었거나 팔로우가 끊긴 경우라 잠금으로, 나머지는 다시 시도
  const membersFailed = members.isError && !members.data && membersStatus !== 403;
  if ((me.isError && !me.data) || (home.isError && !home.data) || membersFailed) {
    return (
      <BunchHomeError
        onRetry={() => {
          void me.refetch();
          if (viewerId !== undefined) void home.refetch();
          if (membersFailed) void members.refetch();
        }}
        onBack={back}
      />
    );
  }
  if (access === 'checking' || !home.data) return <BlockedBunchScreen onBack={back} checking />;
  const locked = !canView || membersStatus === 403;
  const loading = !locked && !members.data;

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
      <h1 className="sr-only">{`${home.data.bunch.name} 멤버`}</h1>
      {locked ? (
        <PrivateBunchNotice
          description={BUNCH_HOME_MESSAGES.privateListDescription}
          className="mx-padding-p8 mt-s6"
        />
      ) : members.data ? (
        <ul className="gap-s5 px-padding-p8 pt-padding-p6 pb-s8 flex flex-col">
          {members.data.map((member) => (
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
      ) : null}
      {/* 늘 있는 상태 영역에 로딩 문구만 넣었다 뺌(새로 끼운 영역은 낭독되지 않을 수 있음) */}
      <p role="status" className="sr-only">
        {loading ? BUNCH_HOME_MESSAGES.membersLoading : ''}
      </p>
    </PageShell>
  );
}
