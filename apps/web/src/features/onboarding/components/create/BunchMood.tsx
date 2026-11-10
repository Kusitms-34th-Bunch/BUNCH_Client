'use client';

import { isApiError } from '@app/api-core';
import { Button, cn, toast } from '@app/design-system';
import { PageHeader } from '@app/design-system/web';
import Image, { type StaticImageData } from 'next/image';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import mood1 from '@/shared/assets/images/bunch-mood/type-1.svg';
import mood2 from '@/shared/assets/images/bunch-mood/type-2.svg';
import mood3 from '@/shared/assets/images/bunch-mood/type-3.svg';
import mood4 from '@/shared/assets/images/bunch-mood/type-4.svg';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { BUNCH_ERROR_CODES, ONBOARDING_MESSAGES } from '../../constants/messages';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { useCreateBunchDraft, type Mood } from '../../contexts/createBunchDraftContext';
import { useCreateBunchGuard } from '../../hooks/useCreateBunchGuard';
import { useCreateBunchMutation } from '../../queries/bunches';

const TITLE = '우리 번치는 어떤 성격의 모임인가요?';

// Figma 카드(4746:64657) 순서 01~04 = 서버 캐릭터 타입 TYPE_1~4. 배경은 모두 같고 타입은 가운데 패턴 색으로 구분
// SVG import 타입이 any라 정적 이미지로 명시, 테스트(vitest)에선 문자열이라 크기는 직접 넘김
const MOODS: { value: Mood; label: string; image: StaticImageData }[] = [
  { value: 'TYPE_1', label: '개성 넘치는 모임', image: mood1 as StaticImageData },
  { value: 'TYPE_2', label: '활발한 모임', image: mood2 as StaticImageData },
  { value: 'TYPE_3', label: '낭만적인 모임', image: mood3 as StaticImageData },
  { value: 'TYPE_4', label: '차분한 모임', image: mood4 as StaticImageData },
];

export function BunchMood() {
  const router = useRouter();
  const draft = useCreateBunchDraft();
  const { mood, setMood } = draft;
  const ready = useCreateBunchGuard(2);
  const create = useCreateBunchMutation();
  // 같은 틱에 연달아 눌러도 한 번만 보내도록 ref로 막음(state 갱신 전에는 isPending이 아직 false)
  const submitted = useRef(false);
  if (!ready) return null;

  const submit = () => {
    const { name, visibility, description } = draft;
    if (submitted.current || visibility === null || mood === null) return;
    submitted.current = true;
    const input = { name, visibility, introduction: description, characterType: mood };
    // 같은 입력의 재시도는 같은 멱등 키를 써서 응답이 유실돼도 번치가 하나만 만들어지게 함
    // 앞뒤 공백만 다른 입력은 같은 요청이라 정규화한 값으로 구분
    const idempotencyKey = draft.idempotencyKeyFor(
      JSON.stringify({
        ...input,
        name: name.normalize('NFC').trim(),
        introduction: description.trim(),
      }),
    );
    create.mutate(
      { input, idempotencyKey },
      {
        onSuccess: (created) => {
          // 완료 기록을 남기고 입력값을 비워 뒤로 가기로 중복 생성하지 않게 함. 성공은 이동이 끝날 때까지 중복 요청을 막음
          draft.finish(created);
          // replace로 이동해 뒤로 가기에 만들기 단계가 남지 않음
          router.replace(ONBOARDING_PATHS.createBunchComplete);
        },
        onError: (error) => {
          submitted.current = false;
          const code = isApiError(error) ? error.code : undefined;
          // 서버가 요청을 거절한 경우(4xx)는 같은 키로 다시 보내면 거절이 재생될 수 있어 키를 버림
          // 408·429는 서버가 이미 처리했을 수 있어 같은 키로 다시 보내 중복 생성을 막음
          if (
            isApiError(error) &&
            error.status !== undefined &&
            error.status < 500 &&
            error.status !== 408 &&
            error.status !== 429
          ) {
            draft.discardIdempotencyKey();
          }
          if (code === BUNCH_ERROR_CODES.nameTaken) {
            // 중복 확인 뒤 그 사이 다른 번치가 같은 이름을 씀: 1단계에서 다시 이름을 고르게 함
            draft.markNameTaken(name.normalize('NFC').trim());
            router.push(ONBOARDING_PATHS.createBunch);
          } else if (code === BUNCH_ERROR_CODES.limitExceeded) {
            toast(ONBOARDING_MESSAGES.bunchLimit);
          } else {
            toast(ONBOARDING_MESSAGES.temporaryFailure);
          }
        },
      },
    );
  };

  return (
    <PageShell
      bottom={
        <div className="gap-s5 pt-s5 px-padding-p8 flex">
          <Button variant="secondary" className="w-22 shrink-0" onClick={() => router.back()}>
            이전
          </Button>
          <Button
            className="flex-1"
            disabled={mood === null || create.isPending}
            aria-busy={create.isPending || undefined}
            onClick={submit}
          >
            번치 만들기
          </Button>
        </div>
      }
    >
      {/* 저장 중 상태를 스크린 리더에 알림(화면에는 숨김) */}
      <p role="status" className="sr-only">
        {create.isPending ? '번치를 만드는 중이에요' : ''}
      </p>
      {create.isPending || create.isSuccess ? <PageLoading /> : null}
      <div className="flex min-h-full flex-col">
        <PageHeader
          title={TITLE}
          className="pt-s13 animate-step-title-in motion-reduce:animate-none"
        />
        {/* 브라우저별 fieldset flex 정렬 차이로 바깥 div에서 가운데 정렬 */}
        <div className="px-padding-p8 pb-padding-p18 flex flex-1 flex-col justify-center">
          <fieldset className="min-w-0">
            <legend className="sr-only">{TITLE}</legend>
            <div className="gap-s6 grid grid-cols-2">
              {MOODS.map((item) => (
                <label
                  key={item.value}
                  className={cn(
                    // 선택 테두리 1px는 안쪽 선(outline)이라 카드 크기가 변하지 않음. 눌림은 카드 전체 검정 10% 겹침
                    'rounded-r4 p-padding-p6 gap-s4 bg-surface-secondary has-checked:outline-border-primary relative flex h-48 cursor-pointer touch-manipulation flex-col items-center justify-center overflow-hidden outline -outline-offset-1 outline-transparent',
                    'after:bg-overlay-hover after:pointer-events-none after:absolute after:inset-0 after:opacity-0 active:after:opacity-100',
                    // 선택 테두리 색보다 포커스 색이 우선
                    'has-focus-visible:outline-border-brand! has-focus-visible:outline-2 has-focus-visible:outline-offset-2',
                  )}
                >
                  <input
                    type="radio"
                    name="mood"
                    value={item.value}
                    checked={mood === item.value}
                    onChange={() => setMood(item.value)}
                    className="sr-only"
                  />
                  <Image src={item.image} alt="" width={108} height={108} />
                  <span className="typography-body-4-semi-bold text-text-secondary">
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </div>
    </PageShell>
  );
}
