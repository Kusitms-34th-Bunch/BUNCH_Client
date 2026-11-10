'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { toastAfterNavigation } from '@/shared/lib/toastAfterNavigation';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { useCurrentBunch } from '../../hooks/useCurrentBunch';
import { leaveBunch } from '../../hooks/useLeftBunches';
import { BunchDeleteScreen } from './BunchDeleteScreen';

/**
 * `/bunch/menu/delete`(안내)·`/bunch/menu/delete/confirm`(문구 입력) 메인 관리자의 번치 삭제
 * 삭제하면 남은 번치의 번치 탭으로(남은 번치가 없으면 번치 없음), 서버 요청은 API 연결 때
 * 메인 관리자가 아니면 더보기 메뉴로(접근 제어가 아니라 API 전 임시 처리)
 */
export function BunchDelete({ step }: { step: 'info' | 'confirm' }) {
  const router = useRouter();
  const backOr = useBackOr();
  // 삭제 뒤 화면이 빠지는 동안에도 다음 번치가 아니라 삭제한 번치를 그림
  const [deletedId, setDeletedId] = useState<string | null>(null);
  // 첫 hydration은 저장된 번치를 몰라 본문을 그리지 않음
  const { bunch, setCurrentId, members, myRole } = useCurrentBunch(deletedId);
  const isOwner = myRole === 'owner';
  // 화면설계서 2번: 나를 맨 앞에 「(나)」로
  const memberNames = [...(members ?? [])]
    .sort((a, b) => Number(Boolean(b.isMe)) - Number(Boolean(a.isMe)))
    .map((member) => (member.isMe ? `${member.name}(나)` : member.name));

  // 삭제 중에는 메뉴로 돌려보내지 않고, 전환 중 다시 제출(Enter 반복·연타)해도 한 번만 삭제
  const deleting = useRef(false);
  useEffect(() => {
    if (bunch && members && !isOwner && !deleting.current) router.replace(BUNCH_HOME_PATHS.menu);
  }, [bunch, members, isOwner, router]);

  const back = () => backOr(step === 'info' ? BUNCH_HOME_PATHS.menu : BUNCH_HOME_PATHS.delete);

  return (
    <BunchDeleteScreen
      step={step}
      bunchName={bunch && members && isOwner ? bunch.name : undefined}
      memberNames={memberNames}
      onBack={back}
      onNext={() => router.push(BUNCH_HOME_PATHS.deleteConfirm)}
      onDelete={() => {
        if (!bunch || deleting.current) return;
        deleting.current = true;
        setDeletedId(bunch.id);
        // 내 목록에서 빠지는 결과는 나가기와 같아 같은 저장소 사용(API 연결 때 삭제 요청으로 분리)
        const next = leaveBunch(bunch.id);
        if (next) setCurrentId(next);
        // 들어온 길(번치 탭 → 메뉴 → 안내 → 확인)을 세 칸 되돌아가 삭제한 번치 화면을 뒤로 가기 대상에서 뺌. 기록이 모자라면 replace
        if (window.history.length > 3) window.history.go(-3);
        else router.replace(BUNCH_HOME_PATHS.home);
        toastAfterNavigation(BUNCH_HOME_MESSAGES.deleted(bunch.name));
      }}
    />
  );
}
