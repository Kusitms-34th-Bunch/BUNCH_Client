'use client';

import { Button, Header, LineChevronLeftLargeIcon } from '@app/design-system';
import { BunchAccordion, ProfileRadioCard } from '@app/design-system/web';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { toastAfterNavigation } from '@/shared/lib/toastAfterNavigation';
import type { OwnedBunch } from '../../lib/types';
import { MY_MESSAGES } from '../../constants/messages';
import { MY_PATHS } from '../../constants/paths';
import { consumeTransferFromGuide, markKeepAgreed } from '../../lib/withdrawalFlow';
import { ownedBunchesQueryOptions, useTransferOwnershipMutation } from '../../queries/withdrawal';

const text = MY_MESSAGES.transfer;

/**
 * 탈퇴 전 관리자 권한 이전(화면 설계서 MY(5) 4~5번): 메인 관리자인 번치마다 새 메인 관리자 한 명 선택
 * 모든 번치를 고르면 「다음」으로 권한을 넘기고 탈퇴 안내로 복귀(실패·빈 목록 처리는 spec)
 */
export function AdminTransferScreen() {
  const router = useRouter();
  const backOr = useBackOr();
  // 탈퇴 안내에서 왔으면 완료 뒤 뒤로 가기, 주소로 바로 들어왔으면 탈퇴 안내로 교체 이동
  const [fromGuide] = useState(consumeTransferFromGuide);
  const progressId = useId();
  const owned = useQuery(ownedBunchesQueryOptions());
  const transfer = useTransferOwnershipMutation();
  // 보내는 동안·넘긴 뒤 돌아가는 전환 동안은 누른 순간의 목록을 유지(다시 받은 목록이 비어도 화면이 바뀌지 않게)
  const [frozen, setFrozen] = useState<readonly OwnedBunch[]>();
  const bunches = frozen ?? owned.data ?? [];
  const [selections, setSelections] = useState<Record<string, string>>({});
  // 돌아가는 전환 중 다시 눌러 두 화면을 되돌아가지 않도록 막음
  const [done, setDone] = useState(false);
  // 보내는 중 다시 누르기 방지(버튼을 disabled로 바꾸면 초점이 빠져서 ref로 막음)
  const sending = useRef(false);
  const failed = owned.isError && owned.data === undefined;
  // 넘길 번치가 없음(그사이 모두 넘어감·나 혼자 남음): 이 화면에 남을 이유가 없어 탈퇴 안내로
  const empty = owned.data?.length === 0 && frozen === undefined && !done;
  const left = useRef(false);
  useEffect(() => {
    if ((!failed && !empty) || left.current) return;
    left.current = true;
    if (failed) toastAfterNavigation(MY_MESSAGES.withdrawal.failed);
    else markKeepAgreed(fromGuide);
    backOr(MY_PATHS.withdrawal);
  }, [failed, empty, fromGuide, backOr]);

  // 다시 받은 목록에서 빠진 멤버를 고른 번치는 고르지 않은 것으로 셈
  const isPicked = (bunch: OwnedBunch) =>
    bunch.candidates.some((member) => member.id === selections[bunch.id]);

  const submit = () => {
    if (sending.current) return;
    sending.current = true;
    setFrozen(bunches);
    transfer.mutate(
      { bunches, selections },
      {
        onSuccess: () => {
          setDone(true);
          markKeepAgreed(fromGuide);
          if (fromGuide) router.back();
          else router.replace(MY_PATHS.withdrawal);
        },
        // 다시 받은 목록(남은 번치·새 버전)으로 다시 고르게 함
        onError: () => {
          sending.current = false;
          setFrozen(undefined);
        },
      },
    );
  };

  const picked = bunches.filter(isPicked).length;
  const ready = bunches.length > 0 && picked === bunches.length;
  const loading = owned.data === undefined && frozen === undefined;

  return (
    <>
      {/* 받는 중·보내는 중을 스크린 리더에 알림(받는 중과 화면이 바뀌어도 같은 자리에 늘 두어 읽히게) */}
      <p role="status" className="sr-only">
        {loading && owned.isPending ? text.loading : transfer.isPending ? text.sending : ''}
      </p>
      {loading ? (
        owned.isPending ? (
          <PageLoading />
        ) : null
      ) : (
        <PageShell
          header={
            <Header
              leading={
                <HeaderIconButton
                  label="뒤로 가기"
                  tone="subtle"
                  onClick={() => backOr(MY_PATHS.withdrawal)}
                >
                  <LineChevronLeftLargeIcon />
                </HeaderIconButton>
              }
            />
          }
          bottom={
            <div className="px-padding-p8">
              {/* 막힌 이유와 남은 번치를 보조기기에 전달(접힌 카드는 선택 여부가 보이지 않음) */}
              {bunches.length > 0 ? (
                <p id={progressId} className="sr-only">
                  {text.progress(picked, bunches.length)}
                </p>
              ) : null}
              <Button
                className="w-full"
                disabled={!ready || done}
                aria-busy={transfer.isPending || undefined}
                aria-describedby={bunches.length > 0 ? progressId : undefined}
                onClick={submit}
              >
                {text.next}
              </Button>
            </div>
          }
        >
          <h1 className="sr-only">{text.title}</h1>
          {/* Figma 헤더 아래 16, 카드 사이 6 */}
          <div className="gap-s3 px-padding-p8 pt-s8 pb-s8 flex flex-col">
            {bunches.map((bunch) => {
              const pickedMember = bunch.candidates.find(
                (member) => member.id === selections[bunch.id],
              );
              return (
                <BunchAccordion
                  key={bunch.id}
                  name={bunch.name}
                  imageSrc={bunch.imageSrc}
                  headingLevel={2}
                  // 새 관리자를 고르면 접혔을 때 선택 상태로 표시(Figma Status=Selected)
                  selected={pickedMember !== undefined}
                  selectedLabel={pickedMember ? text.selected(pickedMember.name) : undefined}
                >
                  {/* Figma 좌우 10, 「멤버」와 목록 사이 8, 멤버 사이 2 */}
                  <fieldset className="px-padding-p5 min-w-0">
                    <legend className="typography-body-4-semi-bold text-text-quaternary px-padding-p5 mb-s4">
                      {/* 여러 번치의 같은 「멤버」 그룹을 구분하도록 번치 이름을 함께 낭독 */}
                      <span className="sr-only">{bunch.name} </span>
                      {text.members}
                    </legend>
                    <div className="gap-s1 flex flex-col">
                      {bunch.candidates.map((member) => (
                        <ProfileRadioCard
                          key={member.id}
                          name={`new-owner-${bunch.id}`}
                          value={member.id}
                          label={member.name}
                          imageSrc={member.imageSrc}
                          memberRole={member.role === 'coOwner' ? 'coOwner' : undefined}
                          roleLabel={member.role === 'coOwner' ? text.coOwner : undefined}
                          checked={selections[bunch.id] === member.id}
                          onChange={() =>
                            setSelections((prev) => ({ ...prev, [bunch.id]: member.id }))
                          }
                        />
                      ))}
                    </div>
                  </fieldset>
                </BunchAccordion>
              );
            })}
          </div>
        </PageShell>
      )}
    </>
  );
}
