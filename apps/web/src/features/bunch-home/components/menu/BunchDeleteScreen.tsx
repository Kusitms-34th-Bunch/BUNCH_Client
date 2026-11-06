'use client';

import { Button, Header, LineChevronLeftLargeIcon } from '@app/design-system';
import { LabeledTextField, PageHeader } from '@app/design-system/web';
import { useId, useState } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';

type BunchDeleteScreenProps = {
  /** 안내(삭제되는 항목) 또는 확인 문구 입력 */
  step: 'info' | 'confirm';
  /** 아직 모르면(hydration 전) 본문을 그리지 않음 */
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
      header={
        <Header
          leading={
            <HeaderIconButton label="뒤로 가기" tone="subtle" onClick={onBack}>
              <LineChevronLeftLargeIcon />
            </HeaderIconButton>
          }
        />
      }
      bottom={
        // Figma Indicator + CTA: 위 14
        <div className="pt-padding-p7 px-padding-p8">
          {step === 'info' ? (
            <Button className="w-full" disabled={!bunchName} onClick={onNext}>
              다음
            </Button>
          ) : (
            <Button type="submit" form={formId} className="w-full" disabled={!confirmed}>
              삭제하기
            </Button>
          )}
        </div>
      }
    >
      {bunchName === undefined ? null : step === 'info' ? (
        // 제목 아래 20(Figma 21), 안내 상자 사이 12(Figma 2255:43337)
        <div className="gap-s10 pb-s8 flex flex-col">
          <PageHeader title={BUNCH_HOME_MESSAGES.deleteTitle(bunchName)} />
          <div className="gap-s6 px-padding-p8 flex flex-col">
            <section className="bg-surface-secondary rounded-r5 p-padding-p8 gap-s3 flex flex-col">
              <h2 className="typography-body-2-semi-bold text-text-primary">삭제되는 항목</h2>
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
                autoComplete="off"
                spellCheck={false}
                aria-describedby={hintId}
              />
              <p id={hintId} className="typography-caption-1-medium text-system-fail-text">
                <span aria-hidden="true">*</span>
                {BUNCH_HOME_MESSAGES.deleteConfirmHint}
              </p>
            </form>
            <section className="bg-surface-secondary rounded-r5 pt-padding-p6 pb-padding-p8 px-padding-p8 gap-s4 flex flex-col">
              <h2 className="typography-body-2-semi-bold text-text-secondary">삭제할 번치 정보</h2>
              <dl className="typography-body-3-regular text-text-tertiary gap-s2 flex flex-col">
                <div className="gap-s2 flex">
                  <dt className="shrink-0 after:content-[':']">번치명</dt>
                  <dd className="typography-body-3-semi-bold min-w-0 wrap-break-word">
                    {bunchName}
                  </dd>
                </div>
                <div className="gap-s2 flex">
                  <dt className="shrink-0 after:content-[':']">소속 멤버</dt>
                  <dd className="typography-body-3-semi-bold min-w-0 wrap-break-word">
                    {memberNames.join(', ')}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      )}
    </PageShell>
  );
}
