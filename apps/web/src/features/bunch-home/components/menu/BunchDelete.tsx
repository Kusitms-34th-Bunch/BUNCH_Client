'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { toastAfterNavigation } from '@/shared/lib/toastAfterNavigation';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { useMyBunchMemberships } from '../../hooks/useMyBunchMemberships';
import { BunchHomeError } from '../home/BunchHomeError';
import { BunchDeleteScreen } from './BunchDeleteScreen';

/**
 * `/bunch/menu/delete`(안내)·`/bunch/menu/delete/confirm`(문구 입력) 메인 관리자의 번치 삭제
 * 서버에서 삭제한 뒤 번치 탭으로(새 기본 번치나 번치 없음). 메인 관리자가 아니면 더보기 메뉴로
 */
export function BunchDelete({ step }: { step: 'info' | 'confirm' }) {
  const router = useRouter();
  const backOr = useBackOr();
  // 삭제하는 동안에는 삭제한 번치가 고정돼, 화면이 빠질 때까지 다음 번치가 아니라 그 번치를 그림
  const { bunchName, managed, failed, retry, depart } = useMyBunchMemberships();
  const isOwner = managed?.myRole === 'owner';
  // 화면설계서 2번: 나를 맨 앞에 「(나)」로
  const memberNames = [...(managed?.members ?? [])]
    .sort((a, b) => Number(Boolean(b.isMe)) - Number(Boolean(a.isMe)))
    .map((member) => (member.isMe ? `${member.name}(나)` : member.name));

  useEffect(() => {
    if (managed && !isOwner) router.replace(BUNCH_HOME_PATHS.menu);
  }, [managed, isOwner, router]);

  if (failed) return <BunchHomeError onRetry={retry} />;

  const back = () => backOr(step === 'info' ? BUNCH_HOME_PATHS.menu : BUNCH_HOME_PATHS.delete);

  return (
    <BunchDeleteScreen
      step={step}
      bunchName={managed && isOwner ? bunchName : undefined}
      memberNames={memberNames}
      onBack={back}
      onNext={() => router.push(BUNCH_HOME_PATHS.deleteConfirm)}
      onDelete={() =>
        depart({ kind: 'delete', confirmation: BUNCH_HOME_MESSAGES.deleteConfirmPhrase }, () => {
          // 들어온 길(번치 탭 → 메뉴 → 안내 → 확인)을 세 칸 되돌아가 삭제한 번치 화면을 뒤로 가기 대상에서 뺌. 기록이 모자라면 replace
          if (window.history.length > 3) window.history.go(-3);
          else router.replace(BUNCH_HOME_PATHS.home);
          if (bunchName) toastAfterNavigation(BUNCH_HOME_MESSAGES.deleted(bunchName));
        })
      }
    />
  );
}
