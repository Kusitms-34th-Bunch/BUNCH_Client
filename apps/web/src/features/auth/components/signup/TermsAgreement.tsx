'use client';

import { Button } from '@app/design-system';
import { Label, PageHeader, TermsLabel } from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { SIGNUP_PATHS } from '../../constants/paths';
import { TERMS_ITEMS } from '../../constants/terms';
import { useTermsAgreement } from '../../contexts/termsAgreementContext';
import { usePermissionRequests } from '../../hooks/usePermissionRequests';
import { useAgreeToTermsMutation, useLeaveSignupMutation } from '../../queries/signup';
import { PermissionGuide } from './PermissionGuide';
import { SignupFrame } from './SignupFrame';

/**
 * 약관 동의 화면(필수 3개와 선택 1개, 전체·개별 체크 동기화, 필수를 모두 동의해야 시작하기 활성화)
 * 시작하기는 동의를 서버에 저장하고(실패하면 이동하지 않음) 시스템 권한(사진 → 카메라 → 알림)을 차례로 요청한 뒤 프로필 화면으로 이동
 * 뒤로 가기는 로그아웃하고 로그인 화면으로(기획 1.3.5)
 */
export function TermsAgreement() {
  const router = useRouter();
  const { agreed, allAgreed, requiredAgreed, setAgreed, setAllAgreed } = useTermsAgreement();
  const { isRequesting, requestAll } = usePermissionRequests();
  const agreeToTerms = useAgreeToTermsMutation();
  const leaveSignup = useLeaveSignupMutation();
  const busy = isRequesting || agreeToTerms.isPending;

  // 권한 요청 중 화면을 벗어났으면(뒤로 가기) 끝난 뒤 프로필 이동 생략
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const start = async () => {
    if (busy) return;
    // 저장 실패(토스트는 공통 처리) 시 체크 상태를 유지한 채 화면에 머묾
    try {
      await agreeToTerms.mutateAsync({ demographics: agreed.demographics });
    } catch {
      return;
    }
    await requestAll();
    if (mounted.current) router.push(SIGNUP_PATHS.profile);
  };

  return (
    <SignupFrame
      onBack={() => {
        // 저장·권한 요청 중에는 무시(요청이 겹치거나 팝업이 화면 밖에 남지 않도록)
        if (!busy && !leaveSignup.isPending) leaveSignup.mutate();
      }}
      bottom={
        <div className="px-padding-p8 pt-padding-p7">
          <Button
            // 처리 중에는 disabled 대신 aria-busy와 중복 실행 가드로 막음(포커스된 버튼이 disabled가 되며 포커스를 잃지 않도록)
            disabled={!requiredAgreed}
            aria-busy={busy || undefined}
            className="w-full"
            onClick={() => void start()}
          >
            시작하기
          </Button>
        </div>
      }
    >
      {/* 저장 중 상태를 스크린 리더에 알림(화면에는 숨김) */}
      <p role="status" className="sr-only">
        {agreeToTerms.isPending ? '약관 동의를 저장하는 중이에요' : ''}
      </p>
      {busy ? <PageLoading /> : null}
      <PageHeader
        title="시작하기 전에 확인해 주세요!"
        description="서비스 이용에 필요한 필수 내용만 확인할게요."
      />
      <div className="pt-s20 pb-padding-p8 gap-s16 flex flex-col">
        <div className="px-padding-p8 gap-s6 flex flex-col">
          <Label checked={allAgreed} onChange={(event) => setAllAgreed(event.target.checked)}>
            전체 동의하기
          </Label>
          <div role="group" aria-label="약관 동의 항목" className="gap-s4 flex flex-col">
            {TERMS_ITEMS.map(({ id, label, required, documentId }) => (
              <TermsLabel
                key={id}
                tag={required ? '[필수]' : '[선택]'}
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
