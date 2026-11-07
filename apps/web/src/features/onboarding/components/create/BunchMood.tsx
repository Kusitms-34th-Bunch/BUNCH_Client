'use client';

import { Button, cn } from '@app/design-system';
import { PageHeader } from '@app/design-system/web';
import Image, { type StaticImageData } from 'next/image';
import { useRouter } from 'next/navigation';
import character1 from '@/shared/assets/images/bunch-character/type-1.svg';
import character2 from '@/shared/assets/images/bunch-character/type-2.svg';
import character3 from '@/shared/assets/images/bunch-character/type-3.svg';
import character4 from '@/shared/assets/images/bunch-character/type-4.svg';
import { PageShell } from '@/shared/components/layout/PageShell';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { useCreateBunchDraft, type Mood } from '../../contexts/createBunchDraftContext';
import { useCreateBunchGuard } from '../../hooks/useCreateBunchGuard';

const TITLE = '우리 번치는 어떤 성격의 모임인가요?';

// Figma 카드(4746:64657) 순서 01~04 = 서버 캐릭터 타입 TYPE_1~4. 선택 테두리는 같은 색의 300
// SVG import 타입이 any라 정적 이미지로 명시, 테스트(vitest)에선 문자열이라 크기는 직접 넘김
const MOODS: { value: Mood; label: string; image: StaticImageData; width: number; card: string }[] =
  [
    {
      value: 'TYPE_1',
      label: '개성 넘치는 모임',
      image: character1 as StaticImageData,
      width: 106,
      card: 'bg-primitive-bunch-50 has-checked:outline-primitive-bunch-300',
    },
    {
      value: 'TYPE_2',
      label: '활발한 모임',
      image: character2 as StaticImageData,
      width: 108,
      card: 'bg-primitive-orange-50 has-checked:outline-primitive-orange-300',
    },
    {
      value: 'TYPE_3',
      label: '낭만적인 모임',
      image: character3 as StaticImageData,
      width: 92,
      card: 'bg-primitive-pink-50 has-checked:outline-primitive-pink-300',
    },
    {
      value: 'TYPE_4',
      label: '차분한 모임',
      image: character4 as StaticImageData,
      width: 101,
      card: 'bg-primitive-green-50 has-checked:outline-primitive-green-300',
    },
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
        <PageHeader title={TITLE} className="pt-s13" />
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
                    'rounded-r4 p-padding-p6 gap-s9 relative flex h-48 cursor-pointer touch-manipulation flex-col items-center justify-center overflow-hidden outline -outline-offset-1 outline-transparent',
                    'after:bg-overlay-hover after:pointer-events-none after:absolute after:inset-0 after:opacity-0 active:after:opacity-100',
                    // 선택 테두리 색보다 포커스 색이 우선
                    'has-focus-visible:outline-border-brand! has-focus-visible:outline-2 has-focus-visible:outline-offset-2',
                    item.card,
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
                  <span className="flex h-23 w-32.5 items-center justify-center">
                    <Image src={item.image} alt="" width={item.width} height={90} />
                  </span>
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
