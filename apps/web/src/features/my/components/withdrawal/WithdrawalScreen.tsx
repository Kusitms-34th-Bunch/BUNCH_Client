'use client';

import {
  ActionDialog,
  Button,
  Checkbox,
  cn,
  ConfirmDialog,
  Header,
  LineChevronLeftLargeIcon,
} from '@app/design-system';
import { PageHeader } from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { MY_MESSAGES } from '../../constants/messages';
import { MY_PATHS } from '../../constants/paths';
import { useOwnedBunches } from '../../hooks/useOwnedBunches';
import { useWithdrawMutation } from '../../queries/session';

type DialogKind = 'confirm' | 'owner';

const text = MY_MESSAGES.withdrawal;

/**
 * 회원 탈퇴 안내(화면 설계서 MY(5) 1~4번): 삭제되는 정보·남는 기록, 확인 체크 뒤 「다음」
 * 메인 관리자인 번치가 있으면 권한 이전 안내, 없으면 최종 확인 뒤 탈퇴
 */
export function WithdrawalScreen() {
  const router = useRouter();
  const backOr = useBackOr();
  const agreeId = useId();
  const agreeTextId = useId();
  const [agreed, setAgreed] = useState(false);
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const withdraw = useWithdrawMutation();
  // 권한을 넘기고 돌아오면 줄어든 목록으로 다시 판단(화면 설계서 5-3)
  const hasOwnedBunch = useOwnedBunches().length > 0;
  const pending = withdraw.isPending || withdraw.isSuccess;

  return (
    <PageShell
      header={
        <Header
          leading={
            // Figma 헤더 뒤로 가기 아이콘 색(#bcbec2), 다른 MY 하위 화면과 같은 연한 회색
            <HeaderIconButton label="뒤로 가기" tone="subtle" onClick={() => backOr(MY_PATHS.home)}>
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
            // 막힌 이유(확인 체크)를 보조기기에 함께 전달
            aria-describedby={agreeTextId}
            onClick={() => setDialog(hasOwnedBunch ? 'owner' : 'confirm')}
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
      <ConfirmDialog
        open={dialog === 'confirm'}
        // 요청 중에는 취소·ESC로 닫지 않음(닫힌 뒤 탈퇴가 끝나 화면이 바뀌는 혼란 방지)
        onOpenChange={(open) => {
          if (!pending) setDialog(open ? 'confirm' : null);
        }}
        title={text.confirmTitle}
        description={text.confirmDescription}
        cancelLabel={MY_MESSAGES.cancel}
        confirmLabel={text.confirm}
        confirmDisabled={pending}
        // 성공 뒤 이동은 useWithdrawMutation이 처리, 실패하면 창만 닫음
        onConfirm={() => withdraw.mutate(undefined, { onError: () => setDialog(null) })}
      />
      <ActionDialog
        open={dialog === 'owner'}
        onOpenChange={(open) => setDialog(open ? 'owner' : null)}
        title={text.ownerTitle}
        description={text.ownerDescription}
        actions={[
          {
            label: text.ownerTransfer,
            onClick: () => {
              setDialog(null);
              router.push(MY_PATHS.withdrawalTransfer);
            },
          },
        ]}
        cancelLabel={MY_MESSAGES.cancel}
        cancelAppearance="solid"
      />
    </PageShell>
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
