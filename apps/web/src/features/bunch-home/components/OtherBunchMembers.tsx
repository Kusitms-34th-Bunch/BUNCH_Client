'use client';

import { Header, LineChevronLeftLargeIcon } from '@app/design-system';
import { ProfileListItem } from '@app/design-system/web';
import { notFound, useRouter } from 'next/navigation';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { BUNCH_HOME_PATHS } from '../constants/paths';
import { ROLE_LABELS } from '../constants/roles';
import { otherBunchesFixture } from '../fixtures/otherBunches.fixture';

/**
 * `/bunches/[bunchId]/members` 다른 번치의 멤버 목록(화면설계서 2500:71333 4번)
 * 확인용이라 관리 동작 없음, 역할은 이미지 배지로
 */
export function OtherBunchMembers({ bunchId }: { bunchId: string }) {
  const router = useRouter();
  const bunch = otherBunchesFixture[bunchId];
  if (!bunch) notFound();

  return (
    <PageShell
      header={
        <Header
          leading={
            <HeaderIconButton
              label="뒤로 가기"
              tone="subtle"
              onClick={() =>
                window.history.length > 1
                  ? router.back()
                  : router.replace(BUNCH_HOME_PATHS.otherBunch(bunchId))
              }
            >
              <LineChevronLeftLargeIcon />
            </HeaderIconButton>
          }
        />
      }
    >
      <h1 className="sr-only">{`${bunch.name} 멤버`}</h1>
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
    </PageShell>
  );
}
