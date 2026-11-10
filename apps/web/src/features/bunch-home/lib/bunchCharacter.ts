import type { StaticImageData } from 'next/image';
import type { CharacterType } from '@/shared/lib/bunchProfile';
import type1Stage1 from '@/shared/assets/images/bunch-character/type-1/stage-1.svg';
import type1Stage2 from '@/shared/assets/images/bunch-character/type-1/stage-2.svg';
import type1Stage3 from '@/shared/assets/images/bunch-character/type-1/stage-3.svg';
import type1Stage4 from '@/shared/assets/images/bunch-character/type-1/stage-4.svg';
import type2Stage1 from '@/shared/assets/images/bunch-character/type-2/stage-1.svg';
import type2Stage2 from '@/shared/assets/images/bunch-character/type-2/stage-2.svg';
import type2Stage3 from '@/shared/assets/images/bunch-character/type-2/stage-3.svg';
import type2Stage4 from '@/shared/assets/images/bunch-character/type-2/stage-4.svg';
import type3Stage1 from '@/shared/assets/images/bunch-character/type-3/stage-1.svg';
import type3Stage2 from '@/shared/assets/images/bunch-character/type-3/stage-2.svg';
import type3Stage3 from '@/shared/assets/images/bunch-character/type-3/stage-3.svg';
import type3Stage4 from '@/shared/assets/images/bunch-character/type-3/stage-4.svg';
import type4Stage1 from '@/shared/assets/images/bunch-character/type-4/stage-1.svg';
import type4Stage2 from '@/shared/assets/images/bunch-character/type-4/stage-2.svg';
import type4Stage3 from '@/shared/assets/images/bunch-character/type-4/stage-3.svg';
import type4Stage4 from '@/shared/assets/images/bunch-character/type-4/stage-4.svg';

/** 번치 성장 단계(서버 `stage`, 발행본 0~1개=1, 2~5개=2, 6~9개=3, 10개 이상=4) */
export const BUNCH_STAGES = [1, 2, 3, 4] as const;
export type BunchStage = (typeof BUNCH_STAGES)[number];

/**
 * 캐릭터 에셋 인덱스(`bunch-character/type-N/stage-M.svg`)
 *
 * | characterType | 폴더   | 색                  | 성격(번치 만들기)  |
 * | ------------- | ------ | ------------------- | ------------------ |
 * | TYPE_1        | type-1 | 보라(Bunch Main)    | 개성 넘치는 모임   |
 * | TYPE_2        | type-2 | 주황                | 활발한 모임        |
 * | TYPE_3        | type-3 | 분홍                | 낭만적인 모임      |
 * | TYPE_4        | type-4 | 초록                | 차분한 모임        |
 *
 * | stage | 파일        | 발행본    | 크기(px) |
 * | ----- | ----------- | --------- | -------- |
 * | 1     | stage-1.svg | 0~1개     | 92×65    |
 * | 2     | stage-2.svg | 2~5개     | 102×74(원본 124×91) |
 * | 3     | stage-3.svg | 6~9개     | 112×80(원본 172×124) |
 * | 4     | stage-4.svg | 10개 이상 | 112×106(원본 212×200, 디자인 확인 필요) |
 */
// SVG import 타입이 any라 정적 이미지로 명시, 테스트(vitest)에선 문자열이라 크기는 직접 넘김
const CHARACTERS: Readonly<Record<CharacterType, Readonly<Record<BunchStage, StaticImageData>>>> = {
  TYPE_1: {
    1: type1Stage1 as StaticImageData,
    2: type1Stage2 as StaticImageData,
    3: type1Stage3 as StaticImageData,
    4: type1Stage4 as StaticImageData,
  },
  TYPE_2: {
    1: type2Stage1 as StaticImageData,
    2: type2Stage2 as StaticImageData,
    3: type2Stage3 as StaticImageData,
    4: type2Stage4 as StaticImageData,
  },
  TYPE_3: {
    1: type3Stage1 as StaticImageData,
    2: type3Stage2 as StaticImageData,
    3: type3Stage3 as StaticImageData,
    4: type3Stage4 as StaticImageData,
  },
  TYPE_4: {
    1: type4Stage1 as StaticImageData,
    2: type4Stage2 as StaticImageData,
    3: type4Stage3 as StaticImageData,
    4: type4Stage4 as StaticImageData,
  },
};

/**
 * 단계별 화면 크기와 120px 상자 아래 여백(가로는 모두 가운데)
 * 1단계 Figma 4713:86293(92×65, 아래 12), 2단계 4713:86365(102×74, 원본 124×91, 아래 13),
 * 3단계 4746:63456(112×80.09, 아래 15.9), 4단계는 Figma에 홈 크기가 없어 3단계와 같은 폭 112에 맞춰 줄임(원본 212×200, 디자인 확인 필요)
 */
const CHARACTER_SIZES: Readonly<
  Record<BunchStage, { width: number; height: number; bottom: number }>
> = {
  1: { width: 92, height: 65, bottom: 12 },
  2: { width: 102, height: 74, bottom: 13 },
  3: { width: 112, height: 80, bottom: 16 },
  4: { width: 112, height: 106, bottom: 12 },
};

/** 서버 stage를 1~4로 맞춤(0이나 범위 밖 값은 가장 가까운 단계, 숫자가 아니면 1단계) */
export const toBunchStage = (stage: number): BunchStage =>
  Number.isFinite(stage) ? (Math.min(4, Math.max(1, Math.trunc(stage))) as BunchStage) : 1;

/** 번치 성격(characterType)과 단계(stage)에 맞는 홈 캐릭터 이미지와 크기 */
export const bunchCharacter = (type: CharacterType, stage: number) => {
  const key = toBunchStage(stage);
  return { image: CHARACTERS[type][key], ...CHARACTER_SIZES[key] };
};
