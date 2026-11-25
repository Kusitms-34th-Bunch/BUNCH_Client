'use client';

import { Button, Header, Skeleton } from '@app/design-system';
import { LabeledTextField, PageHeader } from '@app/design-system/web';
import { useId, useState } from 'react';
import { HeaderBackButton } from '@/shared/components/layout/HeaderBackButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { TextFieldSkeleton } from '@/shared/components/skeleton/TextFieldSkeleton';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';

// 번치 정보 값 한 줄의 받는 중 자리
const ValueSkeleton = () => (
  <span aria-hidden="true" className="inline-flex h-lh items-center">
    <Skeleton className="h-3.5 w-24" />
  </span>
);

type BunchDeleteScreenProps = {
  /** 안내(삭제되는 항목) 또는 확인 문구 입력 */
  step: 'info' | 'confirm';
  /** 아직 모르면(받는 중·hydration 전) 서버 값 자리만 회색으로 그림 */
  bunchName: string | undefined;
  /** 소속 멤버 이름(나는 「(나)」를 붙여 맨 앞) */
  memberNames: readonly string[];
  onBack: () => void;
  /** 안내의 「다음」 */
  onNext: () => void;
  /** 확인 문구를 맞게 입력한 뒤 「삭제하기」 */
  onDelete: () => void;
};

/**
 * 번치 삭제(기능명세 5.9, 화면설계서 2236:41816 1~2-2): 삭제되는 항목 안내 → 「삭제하기」 입력 확인
 * 확인 문구가 정확히 맞을 때만 삭제 버튼 활성
 */
export function BunchDeleteScreen({
  step,
  bunchName,
  memberNames,
  onBack,
  onNext,
  onDelete,
}: BunchDeleteScreenProps) {
  const formId = useId();
  const hintId = useId();
  const [phrase, setPhrase] = useState('');
  const confirmed = phrase === BUNCH_HOME_MESSAGES.deleteConfirmPhrase;

  return (
    <PageShell
      header={<Header leading={<HeaderBackButton tone="subtle" onClick={onBack} />} />}
      bottom={
        // Figma Indicator + CTA: 위 14
        <div className="pt-padding-p7 px-padding-p8">
          {step === 'info' ? (
            <Button className="w-full" disabled={!bunchName} onClick={onNext}>
              다음
            </Button>
          ) : (
            <Button
              type="submit"
              form={formId}
              className="w-full"
              disabled={!confirmed || bunchName === undefined}
            >
              삭제하기
            </Button>
          )}
        </div>
      }
    >
      {step === 'info' ? (
        // 제목 아래 20(Figma 21), 안내 상자 사이 12(Figma 2255:43337)
        <div className="gap-s10 pb-s8 flex flex-col">
          <PageHeader
            title={
              bunchName === undefined ? (
                <>
                  {/* 받는 중에도 제목이 비어 읽히지 않게(받는 중 안내는 상태 영역) */}
                  <span className="sr-only">{BUNCH_HOME_MESSAGES.deleteTitleLoading}</span>
                  {/* 행 높이 28px 안에 24px 자리 */}
                  <span aria-hidden="true" className="flex h-lh items-center">
                    <Skeleton className="h-6 w-52" />
                  </span>
                </>
              ) : (
                BUNCH_HOME_MESSAGES.deleteTitle(bunchName)
              )
            }
          />
          <div className="gap-s6 px-padding-p8 flex flex-col">
            <section className="bg-surface-secondary rounded-r5 p-padding-p8 gap-s3 flex flex-col">
              <h2 className="typography-body-2-semibold text-text-primary">삭제되는 항목</h2>
              <ul className="typography-body-3-regular text-text-tertiary ps-s10 list-disc">
                {BUNCH_HOME_MESSAGES.deletedItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
            <p className="border-border-tertiary rounded-r4 px-padding-p8 py-padding-p5 typography-caption-1-regular text-system-fail-text border break-keep">
              {BUNCH_HOME_MESSAGES.deleteWarning.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>
          </div>
        </div>
      ) : (
        // 제목 아래 32, 입력과 번치 정보 사이 36(Figma 2255:43857)
        <div className="gap-s14 pb-s8 flex flex-col">
          <PageHeader
            title={BUNCH_HOME_MESSAGES.deleteConfirmTitle}
            description={BUNCH_HOME_MESSAGES.deleteConfirmDescription}
          />
          <div className="gap-s15 px-padding-p8 flex flex-col">
            {bunchName === undefined ? (
              <TextFieldSkeleton labelClassName="w-20" />
            ) : (
              <form
                id={formId}
                className="gap-s3 flex flex-col"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (confirmed) onDelete();
                }}
              >
                <LabeledTextField
                  title="확인 문구 입력"
                  placeholder={BUNCH_HOME_MESSAGES.deleteConfirmPhrase}
                  value={phrase}
                  onChange={(event) => setPhrase(event.target.value)}
                  // 키보드 완료 키도 「삭제하기」와 같은 제출(문구가 맞을 때만 삭제, #579)
                  onEnterKey={() =>
                    (document.getElementById(formId) as HTMLFormElement | null)?.requestSubmit()
                  }
                  autoComplete="off"
                  spellCheck={false}
                  aria-describedby={hintId}
                />
                <p id={hintId} className="typography-caption-1-medium text-system-fail-text">
                  <span aria-hidden="true">*</span>
                  {BUNCH_HOME_MESSAGES.deleteConfirmHint}
                </p>
              </form>
            )}
            <section className="bg-surface-secondary rounded-r5 pt-padding-p6 pb-padding-p8 px-padding-p8 gap-s4 flex flex-col">
              <h2 className="typography-body-2-semibold text-text-secondary">삭제할 번치 정보</h2>
              <dl className="typography-body-3-regular text-text-tertiary gap-s2 flex flex-col">
                <div className="gap-s2 flex">
                  <dt className="shrink-0 after:content-[':']">번치명</dt>
                  <dd className="typography-body-3-semibold min-w-0 wrap-break-word">
                    {bunchName ?? <ValueSkeleton />}
                  </dd>
                </div>
                <div className="gap-s2 flex">
                  <dt className="shrink-0 after:content-[':']">소속 멤버</dt>
                  <dd className="typography-body-3-semibold min-w-0 wrap-break-word">
                    {bunchName === undefined ? <ValueSkeleton /> : memberNames.join(', ')}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      )}
      {/* 늘 있는 상태 영역에 받는 중 문구만 넣었다 뺌 */}
      <p role="status" className="sr-only">
        {bunchName === undefined ? BUNCH_HOME_MESSAGES.deleteLoading : ''}
      </p>
    </PageShell>
  );
}
