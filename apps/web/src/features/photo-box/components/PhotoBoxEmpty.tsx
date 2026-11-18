import Image, { type StaticImageData } from 'next/image';
import photoEmpty from '@/shared/assets/images/empty/photo-empty.svg';

type PhotoBoxEmptyProps = {
  /** `bunch`는 번치에 사진이 하나도 없을 때, `member`는 선택한 멤버의 사진이 없을 때 */
  reason: 'bunch' | 'member';
};

const MESSAGES = {
  bunch: '첫 번째 사진을 공유해 보세요',
  member: '첫 사진을 기다리고 있어요!',
} as const;

/** 사진 없음 빈 상태(Figma 5991:162448·5878:79966): 일러스트 72×72와 문구, 간격은 두 경우 모두 16(s8, 선택한 멤버 빈 상태도 번치 빈 상태와 같게 맞춤) */
export function PhotoBoxEmpty({ reason }: PhotoBoxEmptyProps) {
  return (
    <div className="gap-s8 flex flex-1 flex-col items-center justify-center">
      {/* SVG import 타입이 any라 정적 이미지로 명시, 테스트(vitest)에선 문자열이라 크기는 직접 넘김 */}
      <Image src={photoEmpty as StaticImageData} alt="" width={72} height={72} />
      <p className="typography-body-2-regular text-text-tertiary">{MESSAGES[reason]}</p>
    </div>
  );
}
