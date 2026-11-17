'use client';

import { toast } from '@app/design-system';
import { useEffect, useRef } from 'react';
import { MY_MESSAGES } from '../../constants/messages';
import {
  useAdditionalInfo,
  useUpdateAdditionalInfoConsentMutation,
} from '../../queries/additionalInfo';
import { TermsAndPrivacyScreen } from './TermsAndPrivacyScreen';

/**
 * 약관 및 개인정보와 추가 개인정보 동의 API를 잇는 컨테이너
 * 동의 상태를 받기 전·받지 못했으면(받아 둔 값이 있어도) 토글을 누를 수 없게 둠. 받지 못하면 토스트(기능명세서 7.4.4 예외)
 * 저장 실패 토스트는 mutation 공통 처리가 띄우고 토글은 원래 상태로 둠(기능명세서 7.4.5 예외)
 */
export function TermsAndPrivacyRoute() {
  const { additionalInfo, isError, hasFailed } = useAdditionalInfo();
  const save = useUpdateAdditionalInfoConsentMutation();
  // 실패 안내는 화면에 들어온 뒤 한 번만(앱 복귀 등으로 다시 받다 실패할 때마다 같은 토스트가 반복되지 않게)
  const toasted = useRef(false);

  useEffect(() => {
    if (!isError || toasted.current) return;
    toasted.current = true;
    toast(MY_MESSAGES.termsSettings.demographics.failed);
  }, [isError]);

  return (
    <TermsAndPrivacyScreen
      consent={additionalInfo?.consented ?? false}
      // 받아 둔 값이 있어도 다시 받기에 실패했으면(실패 뒤 다시 받는 중 포함) 옛 값으로 바꾸지 못하게 막음
      consentDisabled={additionalInfo === undefined || hasFailed}
      onChangeConsent={(agreed, done) => save.mutate(agreed, { onSettled: done })}
    />
  );
}
