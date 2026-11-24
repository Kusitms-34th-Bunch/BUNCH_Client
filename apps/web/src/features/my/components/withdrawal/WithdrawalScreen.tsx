'use client';

import {
  ActionDialog,
  Button,
  Checkbox,
  cn,
  Header,
  LineChevronLeftLargeIcon,
  toast,
} from '@app/design-system';
import { PageHeader } from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useScreenOverlay } from '@/shared/hooks/overlay/useScreenOverlay';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { useMountedRef } from '@/shared/hooks/useMountedRef';
import { MY_MESSAGES } from '../../constants/messages';
import { MY_PATHS } from '../../constants/paths';
import { clearKeepAgreed, markTransferFromGuide, peekKeepAgreed } from '../../lib/withdrawalFlow';
import { useFetchOwnedBunches, useWithdrawMutation } from '../../queries/withdrawal';
import { PendingConfirmDialog } from '../PendingConfirmDialog';

const text = MY_MESSAGES.withdrawal;

/**
 * 회원 탈퇴 안내(화면 설계서 MY(5) 1~4번): 삭제되는 정보·남는 기록, 확인 체크 뒤 「다음」
 * 「다음」을 누를 때마다 넘길 번치를 서버에서 새로 확인해, 있으면 권한 이전 안내, 없으면 최종 확인 뒤 탈퇴
 */
export function WithdrawalScreen() {
  const router = useRouter();
  const backOr = useBackOr();
  const agreeId = useId();
  const agreeTextId = useId();
  // 마이페이지에서 들어오면 해제, 권한을 넘기고 돌아오면 체크 유지(기능명세서 7.6.1 로직 1)
  const [agreed, setAgreed] = useState(peekKeepAgreed);
  useEffect(clearKeepAgreed, []);
  const openOverlay = useScreenOverlay();
  const withdraw = useWithdrawMutation();
  const fetchOwnedBunches = useFetchOwnedBunches();
  // 확인 요청 중 표시와 다시 누르기 방지(버튼을 disabled로 바꾸면 초점이 빠져서 ref로 막음)
  const [checking, setChecking] = useState(false);
  const checkingRef = useRef(false);
  // 확인 요청 중 화면을 떠났으면 결과로 창을 열지 않음(떠난 화면의 창이 다른 화면 위에 남지 않게)
  const mounted = useMountedRef();
  // 최종 확인 창이 다 닫힌 뒤 할 일(안내 창 열기·토스트). 닫히는 창의 초점 복귀와 겹치지 않게 미룸
  const afterConfirmClosed = useRef<(() => void) | undefined>(undefined);
  const openConfirm = () =>
    openOverlay(
      (rootProps) => (
        <PendingConfirmDialog
          {...rootProps}
          title={text.confirmTitle}
          description={text.confirmDescription}
          cancelLabel={MY_MESSAGES.cancel}
          confirmLabel={text.confirm}
          run={(close) => void confirmWithdraw(close)}
        />
      ),
      () => {
        const run = afterConfirmClosed.current;
        afterConfirmClosed.current = undefined;
        run?.();
      },
    );
  const openOwner = () =>
    openOverlay((rootProps, close) => (
      <ActionDialog
        {...rootProps}
        title={text.ownerTitle}
        description={text.ownerDescription}
        actions={[
          {
            label: text.ownerTransfer,
            onClick: () => {
              close();
              markTransferFromGuide();
              router.push(MY_PATHS.withdrawalTransfer);
            },
          },
        ]}
        cancelLabel={MY_MESSAGES.cancel}
        cancelAppearance="solid"
      />
    ));
  // 탈퇴 직전에 한 번 더 확인해, 그사이 메인 관리자 번치가 생겼으면 권한 이전 안내로 바꿈(기능명세서 7.6.4 로직 1)
  const confirmWithdraw = async (close: () => void) => {
    let owned;
    try {
      owned = await fetchOwnedBunches();
    } catch {
      afterConfirmClosed.current = () => toast(text.failed);
      close();
      return;
    }
    if (owned.length > 0) {
      afterConfirmClosed.current = openOwner;
      close();
      return;
    }
    // Apple 재인증 창을 닫았으면 확인 창도 닫고 이 화면에 머묾
    withdraw.mutate(undefined, {
      onError: close,
      onSuccess: (result) => {
        if (result === 'cancelled') close();
      },
    });
  };
  // 권한을 넘기고 돌아와도 다시 확인해 남은 번치로 판단(화면 설계서 5-3)
  const next = async () => {
    if (!agreed || checkingRef.current) return;
    checkingRef.current = true;
    setChecking(true);
    try {
      const owned = await fetchOwnedBunches();
      if (!mounted.current) return;
      if (owned.length > 0) openOwner();
      else openConfirm();
    } catch {
      if (mounted.current) toast(text.failed);
    } finally {
      checkingRef.current = false;
      setChecking(false);
    }
  };

  return (
    <>
      {/* 확인 요청 중임을 스크린 리더에 알림(늘 두고 글만 바꿈) */}
      <p role="status" className="sr-only">
        {checking ? text.checking : ''}
      </p>
      <PageShell
        header={
          <Header
            leading={
              // Figma 헤더 뒤로 가기 아이콘 색(#bcbec2), 다른 MY 하위 화면과 같은 연한 회색
              <HeaderIconButton
                label="뒤로 가기"
                tone="subtle"
                onClick={() => backOr(MY_PATHS.home)}
              >
                <LineChevronLeftLargeIcon />
              </HeaderIconButton>
            }
          />
        }
        bottom={
          // Figma 확인 줄(위아래 6·좌우 4, 체크와 글 사이 8)과 「다음」 사이 8
          <div className="px-padding-p8 gap-s4 flex flex-col">
            <label
              htmlFor={agreeId}
              className="px-padding-p2 py-padding-p3 gap-s4 flex cursor-pointer items-center"
            >
              <Checkbox
                id={agreeId}
                checked={agreed}
                onChange={(event) => setAgreed(event.target.checked)}
              />
              <span id={agreeTextId} className="typography-body-3-regular text-text-tertiary">
                {text.agree}
              </span>
            </label>
            <Button
              className="w-full"
              disabled={!agreed}
              aria-busy={checking || undefined}
              // 막힌 이유(확인 체크)를 보조기기에 함께 전달
              aria-describedby={agreeTextId}
              onClick={() => void next()}
            >
              {text.next}
            </Button>
          </div>
        }
      >
        {/* Figma 제목·안내 아래 20, 두 묶음 사이 18(구분선 위아래 포함) */}
        <div className="gap-s10 pb-s8 flex flex-col">
          <PageHeader title={text.title} description={text.description} />
          <div className="gap-s9 px-padding-p8 flex flex-col">
            <InfoSection
              title={text.deletedTitle}
              titleClassName="text-primitive-color-feedback-red-600"
              items={text.deleted}
            />
            <hr className="border-border-tertiary" />
            <InfoSection
              title={text.keptTitle}
              titleClassName="text-primitive-green-800"
              items={text.kept}
            />
          </div>
        </div>
      </PageShell>
    </>
  );
}

type InfoSectionProps = {
  title: string;
  /** 묶음 제목 색(삭제는 빨강, 남는 기록은 초록. Figma가 primitive 색을 씀) */
  titleClassName: string;
  items: readonly { title: string; description: string }[];
};

/** 묶음 제목(좌우 6) 아래 6, 항목 사이 4. 항목은 위아래 4·좌우 8, 제목과 설명 사이 4 */
function InfoSection({ title, titleClassName, items }: InfoSectionProps) {
  return (
    <section className="gap-s3 flex flex-col">
      <h2 className={cn('typography-caption-1-medium px-padding-p3', titleClassName)}>{title}</h2>
      <ul className="gap-s2 flex flex-col">
        {items.map((item) => (
          <li key={item.title} className="px-padding-p4 py-padding-p2 gap-s2 flex flex-col">
            <p className="typography-body-1-medium text-text-primary">{item.title}</p>
            <p className="typography-body-4-regular text-text-tertiary break-keep">
              {item.description}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
