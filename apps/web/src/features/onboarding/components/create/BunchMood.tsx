'use client';

import { Button } from '@app/design-system';
import { PageHeader } from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import { PageShell } from '@/shared/components/layout/PageShell';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { useCreateBunchDraft, type Mood } from '../../contexts/createBunchDraftContext';
import { useCreateBunchGuard } from '../../hooks/useCreateBunchGuard';

// 이름·그래픽이 아직 없어(설계서 "그래픽 추후 전달") 임시 이름. 확정되면 교체
const MOODS: { value: Mood; label: string }[] = [
  { value: 'mood-1', label: '분위기 1' },
  { value: 'mood-2', label: '분위기 2' },
  { value: 'mood-3', label: '분위기 3' },
  { value: 'mood-4', label: '분위기 4' },
];

/** 번치 만들기 3단계: 번치 분위기를 하나 고르는 화면 */
export function BunchMood() {
  const router = useRouter();
  const { mood, setMood } = useCreateBunchDraft();
  const ready = useCreateBunchGuard(2);
  if (!ready) return null;

  return (
    <PageShell
      bottom={
        <div className="gap-s5 pt-s5 px-padding-p8 flex">
          <Button variant="secondary" className="w-22 shrink-0" onClick={() => router.back()}>
            이전
          </Button>
          {/* 생성 요청은 API가 없어 연결 전이라 완료 화면으로 이동만 함(spec 확인할 항목). 뒤로 가기로 이 단계에 돌아와 다시 만들지 못하게 replace */}
          <Button
            className="flex-1"
            disabled={mood === null}
            onClick={() => router.replace(ONBOARDING_PATHS.createBunchComplete)}
          >
            번치 만들기
          </Button>
        </div>
      }
    >
      <div className="flex min-h-full flex-col">
        <PageHeader title="우리 번치는 어떤 분위기인가요?" className="pt-s13" />
        {/* fieldset은 flex 정렬이 브라우저마다 달라 바깥 div가 가운데 정렬을 맡음 */}
        <div className="px-padding-p8 pb-padding-p18 flex flex-1 flex-col justify-center">
          <fieldset className="min-w-0">
            <legend className="sr-only">우리 번치는 어떤 분위기인가요?</legend>
            <div className="gap-s6 grid grid-cols-2">
              {MOODS.map((item) => (
                <label
                  key={item.value}
                  className="bg-surface-tertiary has-focus-visible:outline-border-brand relative block h-48 cursor-pointer has-checked:bg-[linear-gradient(var(--color-overlay-pressed),var(--color-overlay-pressed))] has-focus-visible:outline-2 has-focus-visible:outline-offset-2"
                >
                  <input
                    type="radio"
                    name="mood"
                    value={item.value}
                    checked={mood === item.value}
                    onChange={() => setMood(item.value)}
                    className="sr-only"
                  />
                  <span className="sr-only">{item.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </div>
    </PageShell>
  );
}
