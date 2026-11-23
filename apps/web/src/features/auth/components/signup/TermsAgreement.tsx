'use client';

import { Button } from '@app/design-system';
import { Label, PageHeader, TermsLabel } from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { LATE_OVERLAY_MS, PageLoading } from '@/shared/components/loading/PageLoading';
import { useRefocusWhenEnabled } from '@/shared/hooks/overlay/useRefocusWhenEnabled';
import { SIGNUP_PATHS } from '../../constants/paths';
import { TERMS_ITEMS } from '../../constants/terms';
import { useTermsAgreement } from '../../contexts/termsAgreementContext';
import { usePermissionRequests } from '../../hooks/usePermissionRequests';
import { useAgreeToTermsMutation, useLeaveSignupMutation } from '../../queries/signup';
import { PermissionGuide } from './PermissionGuide';
import { SignupFrame } from './SignupFrame';

/**
 * 약관 동의 화면(필수 3개와 선택 1개, 전체·개별 체크 동기화, 필수를 모두 동의해야 시작하기 활성화)
 * 시작하기는 동의를 서버에 저장하고(실패하면 이동하지 않음), 저장에 성공한 뒤에만 시스템 권한(사진 → 카메라 → 알림)을 차례로 요청한 다음
 * 프로필 화면으로 이동(기능명세 1.3.4, 「전체 동의하기」 체크로는 요청하지 않음)
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
  // 저장이 끝나는 즉시 넘어가도록 다음 화면(프로필)을 미리 받아 둠
  useEffect(() => {
    router.prefetch(SIGNUP_PATHS.profile);
  }, [router]);

  // 같은 틱의 연타도 한 번만 실행(state는 다음 렌더에야 반영)
  const starting = useRef(false);
  // 저장을 시작한 뒤에는 이동할 때까지 체크를 잠금(저장한 동의와 화면 체크가 어긋나지 않게), 저장 실패 시 해제
  const [submitted, setSubmitted] = useState(false);
  // 누른 뒤 이동할 때까지(저장·권한 요청·이동) 비활성. 저장 실패로 다시 활성이 되면 초점을 돌려줌
  const startDisabled = !requiredAgreed || busy || submitted;
  const [startRef, refocusStart] = useRefocusWhenEnabled<HTMLButtonElement>(!startDisabled);
  const start = async () => {
    if (starting.current) return;
    starting.current = true;
    setSubmitted(true);
    try {
      // 저장 실패(토스트는 공통 처리) 시 체크 상태를 유지한 채 화면에 머묾
      try {
        await agreeToTerms.mutateAsync({ demographics: agreed.demographics });
      } catch {
        setSubmitted(false);
        refocusStart();
        return;
      }
      // 저장하는 사이 화면을 떠났으면 권한을 묻지 않음
      if (!mounted.current) return;
      await requestAll();
      if (mounted.current) router.push(SIGNUP_PATHS.profile);
    } finally {
      starting.current = false;
    }
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
            ref={startRef}
            // 누르면 바로 비활성, 덮개 없이 이동(motion.md 로딩 상태)
            disabled={startDisabled}
            aria-busy={busy || undefined}
            className="w-full"
            onClick={() => void start()}
          >
            시작하기
          </Button>
        </div>
      }
    >
      {/* 저장·권한 요청 중 상태를 스크린 리더에 알림(화면에는 숨김). 권한 팝업이 뜰 때 이유를 들려줌 */}
      <p role="status" className="sr-only">
        {agreeToTerms.isPending
          ? '약관 동의를 저장하는 중이에요'
          : isRequesting
            ? '앱 접근 권한을 요청하는 중이에요'
            : ''}
      </p>
      {/* 짧은 동작이라 버튼만 비활성, 1초를 넘기면 그때 덮음(motion.md 로딩 상태) */}
      {agreeToTerms.isPending ? <PageLoading delayMs={LATE_OVERLAY_MS} /> : null}
      <PageHeader
        title="시작하기 전에 확인해 주세요!"
        description="서비스 이용에 필요한 필수 내용만 확인할게요."
      />
      <div className="pt-s20 pb-padding-p8 gap-s16 flex flex-col">
        <div className="px-padding-p8 gap-s6 flex flex-col">
          <Label
            checked={allAgreed}
            disabled={submitted}
            onChange={(event) => setAllAgreed(event.target.checked)}
          >
            전체 동의하기
          </Label>
          <div role="group" aria-label="약관 동의 항목" className="gap-s4 px-s4 flex flex-col">
            {TERMS_ITEMS.map(({ id, label, required, documentId }) => (
              <TermsLabel
                key={id}
                tag={required ? '[필수]' : '[선택]'}
                checked={agreed[id]}
                disabled={submitted}
                onChange={(event) => setAgreed(id, event.target.checked)}
                {...(documentId
                  ? {
                      // 저장을 시작한 뒤에는 원문으로 떠나지 않게 무시(덮개가 없어 눌릴 수 있음)
                      onViewTerms: () => {
                        if (!submitted) router.push(SIGNUP_PATHS.termsDocument(documentId));
                      },
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
