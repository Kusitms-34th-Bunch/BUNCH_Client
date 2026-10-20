'use client';

import { Button } from '@app/design-system';
import { Label, PageHeader, TermsLabel } from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { SIGNUP_PATHS } from '../../constants/paths';
import { TERMS_ITEMS } from '../../constants/terms';
import { useTermsAgreement } from '../../contexts/termsAgreementContext';
import { usePermissionRequests } from '../../hooks/usePermissionRequests';
import { PermissionGuide } from './PermissionGuide';
import { SignupFrame } from './SignupFrame';

/**
 * 필수 약관 동의 화면(전체·개별 체크 동기화, 모두 동의해야 시작하기 활성화)
 * 시작하기는 시스템 권한(사진 → 카메라 → 알림)을 차례로 요청한 뒤 프로필 화면으로 이동한다(약관 저장은 미연결)
 */
export function TermsAgreement() {
  const router = useRouter();
  const { agreed, allAgreed, setAgreed, setAllAgreed } = useTermsAgreement();
  const { isRequesting, requestAll } = usePermissionRequests();

  // 권한을 요청하는 동안 화면을 벗어났으면(뒤로 가기) 끝난 뒤에 프로필로 끌고 가지 않는다
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const start = async () => {
    if (isRequesting) return;
    await requestAll();
    if (mounted.current) router.push(SIGNUP_PATHS.profile);
  };

  return (
    <SignupFrame
      bottom={
        <div className="px-padding-p8 pt-padding-p7">
          <Button
            disabled={!allAgreed || isRequesting}
            className="w-full"
            onClick={() => void start()}
          >
            시작하기
          </Button>
        </div>
      }
    >
      <PageHeader
        title="시작하기 전에 확인해 주세요!"
        description="서비스 이용에 필요한 필수 내용만 확인할게요."
      />
      <div className="pt-s20 pb-padding-p8 gap-s16 flex flex-col">
        <div className="px-padding-p8 gap-s6 flex flex-col">
          <Label checked={allAgreed} onChange={(event) => setAllAgreed(event.target.checked)}>
            필수 항목 모두 체크하기
          </Label>
          <div className="gap-s4 flex flex-col">
            {TERMS_ITEMS.map(({ id, label, documentId }) => (
              <TermsLabel
                key={id}
                tag="[필수]"
                checked={agreed[id]}
                onChange={(event) => setAgreed(id, event.target.checked)}
                {...(documentId
                  ? {
                      onViewTerms: () => router.push(SIGNUP_PATHS.termsDocument(documentId)),
                      viewLabel: `${label} 내용 보기`,
                    }
                  : {})}
              >
                {label}
              </TermsLabel>
            ))}
          </div>
        </div>
        <div className="px-padding-p8">
          <PermissionGuide />
        </div>
      </div>
    </SignupFrame>
  );
}
