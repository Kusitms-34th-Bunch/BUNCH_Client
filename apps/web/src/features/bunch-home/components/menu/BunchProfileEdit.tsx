'use client';

import { isApiError } from '@app/api-core';
import { toast } from '@app/design-system';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { checkBunchNameAvailability } from '@/shared/api/bunchNameAvailability';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { toastAfterNavigation } from '@/shared/lib/toastAfterNavigation';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { toEditableBunchProfile } from '../../model/bunchHome';
import { bunchHomeQueryOptions, useUpdateBunchProfileMutation } from '../../queries/bunchHome';
import { BunchHomeError } from '../home/BunchHomeError';
import { type BunchProfileDraft, BunchProfileEditScreen } from './BunchProfileEditScreen';

// 서버가 이름 중복으로 거절한 코드(번치 만들기와 같음)
const NAME_TAKEN_CODE = 'BUNCH_001';

/**
 * `/bunch/menu/profile` 번치 프로필 편집: 내 기본 번치(`members/me`)의 번치 홈 프로필이 초기값
 * 프로필을 바꿀 권한(`permissions.canEditProfile`)이 없으면 더보기 메뉴로, 번치가 없으면 번치 탭으로
 * 저장하면 바뀐 값을 다시 받은 뒤 번치 메인탭으로 이동하고 거기서 토스트(화면설계서 2145:39607 6, 사용자 결정)
 */
export function BunchProfileEdit() {
  const router = useRouter();
  const backOr = useBackOr();
  const me = useQuery(myProfileQueryOptions());
  const bunchId = me.data?.bunch?.id;
  // 저장해 둔 값이 아직 새것이어도 서버에서 다시 받음(그 뒤에 폼을 엶). 번치를 알게 돼 key가 바뀔 때도 받도록 staleTime 0
  const home = useQuery({ ...bunchHomeQueryOptions(bunchId), staleTime: 0 });
  const profile = home.data ? toEditableBunchProfile(home.data) : undefined;
  const update = useUpdateBunchProfileMutation(bunchId);
  const [takenName, setTakenName] = useState<string | null>(null);
  // 다른 곳에서 바뀐 걸 알게 되면 폼을 최신 값으로 다시 엶
  const [formRevision, setFormRevision] = useState(0);

  const hasNoBunch = me.isSuccess && bunchId === undefined;
  const cannotEdit = profile !== undefined && !profile.canEdit;
  useEffect(() => {
    if (hasNoBunch) router.replace(BUNCH_HOME_PATHS.home);
    else if (cannotEdit) router.replace(BUNCH_HOME_PATHS.menu);
  }, [hasNoBunch, cannotEdit, router]);

  // 받은 값이 하나도 없을 때만 오류 화면(다시 받기만 실패하면 입력 중인 폼을 지우지 않음)
  if ((me.isError && !me.data) || (home.isError && !home.data)) {
    return (
      <BunchHomeError
        onRetry={() => {
          // 실패한 쪽을 모두 다시 받음(me 다시 받기만 실패하고 번치 홈은 값 없이 실패한 경우 포함)
          if (me.isError) void me.refetch();
          if (home.isError) void home.refetch();
        }}
      />
    );
  }

  // 받는 동안·다른 화면으로 보내는 동안은 로딩(번치 홈과 같은 안내)
  // 저장해 둔 값(앱 다시 열기)이 있어도 서버에서 새로 받은 뒤 폼을 엶: 폼은 연 순간의 값과 버전으로 저장함
  if (!profile?.canEdit || !home.isFetchedAfterMount) {
    return (
      <>
        <p role="status" className="sr-only">
          번치 프로필을 불러오는 중이에요
        </p>
        <PageLoading />
      </>
    );
  }
  // 버전이 없으면 저장할 수 없으므로 폼을 열지 않고 다시 받기를 권함(서버가 주지 않는 경우 대비)
  if (profile.profileVersion === undefined) {
    return <BunchHomeError onRetry={() => void home.refetch()} />;
  }

  const save = ({
    name,
    description,
    isPrivate,
    image,
    expectedProfileVersion,
  }: BunchProfileDraft) => {
    if (expectedProfileVersion === undefined || update.isPending) return;
    update.mutate(
      { name, introduction: description, isPrivate, image, expectedProfileVersion },
      {
        onSuccess: () => {
          router.replace(BUNCH_HOME_PATHS.home);
          // 저장하면 번치 탭으로 이동하므로 도착 화면의 전환·로딩이 끝난 뒤 탭 막대 위에 뜸
          toastAfterNavigation(BUNCH_HOME_MESSAGES.profileSaved, { icon: 'success' });
        },
        onError: (error) => {
          if (isApiError(error) && error.code === NAME_TAKEN_CODE) {
            setTakenName(name.normalize('NFC').trim());
            return;
          }
          // 버전 충돌 코드는 Swagger에 없어, 다시 받은 버전이 폼을 연 때와 다르면 다른 곳에서 바뀐 것으로 봄
          void home.refetch().then(({ data }) => {
            const latest = data?.profileVersion;
            if (latest !== undefined && latest !== null && latest !== expectedProfileVersion) {
              setFormRevision((revision) => revision + 1);
              toast(BUNCH_HOME_MESSAGES.profileChangedElsewhere);
              return;
            }
            toast(BUNCH_HOME_MESSAGES.profileSaveFailed);
          });
        },
      },
    );
  };

  return (
    <BunchProfileEditScreen
      // 번치가 바뀌거나 다른 곳에서 바뀐 걸 알면 입력 상태를 새 초기값으로
      key={`${bunchId}:${formRevision}`}
      characterType={profile.characterType}
      initial={profile}
      onBack={() => backOr(BUNCH_HOME_PATHS.menu)}
      onSave={save}
      saving={update.isPending}
      takenName={takenName}
      checkName={
        bunchId === undefined
          ? undefined
          : (name) => checkBunchNameAvailability(name, { excludeBunchId: bunchId })
      }
    />
  );
}
