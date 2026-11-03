'use client';

import { Header, LineChevronLeftLargeIcon } from '@app/design-system';
import { ProfileListItem } from '@app/design-system/web';
import { notFound } from 'next/navigation';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { ROLE_LABELS } from '../../constants/roles';
import { findOtherBunch } from '../../fixtures/otherBunches.fixture';
import { useBlockRelation } from '../../hooks/useBlockRelation';
import { useBunchFollow } from '../../hooks/useBunchFollow';
import { PrivateBunchNotice } from '../PrivateBunchNotice';
import { BlockedBunchScreen } from './BlockedBunchScreen';

/**
 * `/bunches/[bunchId]/members` 다른 번치의 멤버 목록(화면설계서 2500:71333 4번)
 * 확인용이라 관리 동작 없음, 역할은 이미지 배지로
 */
export function OtherBunchMembers({ bunchId }: { bunchId: string }) {
  const backOr = useBackOr();
  const bunch = findOtherBunch(bunchId);
  const { status } = useBunchFollow(bunch);
  const { checking, isBlocked } = useBlockRelation(bunchId);
  if (!bunch) notFound();
  // 기록이 없으면 프로필로, 차단한 번치면 프로필도 접근 제한이라 피드로
  const back = () =>
    backOr(isBlocked ? BUNCH_HOME_PATHS.feed : BUNCH_HOME_PATHS.otherBunch(bunchId));
  if (checking) return <BlockedBunchScreen onBack={back} checking />;
  if (isBlocked) return <BlockedBunchScreen onBack={back} />;
  // 비공개 번치는 팔로우 승인 전에 멤버 명단을 볼 수 없음(기능명세 5.10)
  const locked = bunch.isPrivate && status !== 'following';

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
