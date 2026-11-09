'use client';

import { Button, cn } from '@app/design-system';
import { PageHeader } from '@app/design-system/web';
import Image, { type StaticImageData } from 'next/image';
import { useRouter } from 'next/navigation';
import mood1 from '@/shared/assets/images/bunch-mood/type-1.svg';
import mood2 from '@/shared/assets/images/bunch-mood/type-2.svg';
import mood3 from '@/shared/assets/images/bunch-mood/type-3.svg';
import mood4 from '@/shared/assets/images/bunch-mood/type-4.svg';
import { PageShell } from '@/shared/components/layout/PageShell';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { useCreateBunchDraft, type Mood } from '../../contexts/createBunchDraftContext';
import { useCreateBunchGuard } from '../../hooks/useCreateBunchGuard';

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
          {/* 생성 API 연결 전 완료 화면으로만 이동하며, replace로 중복 생성 방지 */}
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
