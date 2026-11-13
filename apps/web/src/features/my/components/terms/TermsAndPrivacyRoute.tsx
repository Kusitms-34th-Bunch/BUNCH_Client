'use client';

import { useDemographicsConsent } from '../../hooks/useDemographicsConsent';
import { TermsAndPrivacyScreen } from './TermsAndPrivacyScreen';

/**
 * 약관 및 개인정보와 추가 개인정보 동의 상태를 잇는 컨테이너
 * 서버 API가 없어 동의 상태는 이 기기에만 저장하는 임시 값(`useDemographicsConsent`) 사용
 */
export function TermsAndPrivacyRoute() {
  const [consent, setConsent] = useDemographicsConsent();

  return (
    <TermsAndPrivacyScreen
      consent={consent}
      onChangeConsent={(agreed, done) => {
        setConsent(agreed);
        done();
      }}
    />
  );
}
