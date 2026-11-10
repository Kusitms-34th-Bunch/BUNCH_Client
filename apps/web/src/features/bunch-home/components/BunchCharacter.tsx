import { cn } from '@app/design-system';
import Image from 'next/image';
import type { CharacterType } from '@/shared/lib/bunchProfile';
import { bunchCharacter } from '../lib/bunchCharacter';

type BunchCharacterProps = {
  characterType: CharacterType;
  /** 서버 stage(1~4) */
  stage: number;
};

/**
 * 번치 홈·다른 번치 위쪽의 캐릭터(Figma Character Wrapper 120×120, 오른쪽 위)
 * 번치 성격(characterType)별 색, 성장 단계(stage)별 모양이며 흰 시트에 32px 걸침
 */
export function BunchCharacter({ characterType, stage }: BunchCharacterProps) {
  const character = bunchCharacter(characterType, stage);
  return (
    <div
      aria-hidden="true"
      // 상자(120px)보다 넓은 캐릭터는 오른쪽 끝을 맞춰 왼쪽으로만 넓어지게 해 화면 밖으로 넘치지 않게 함
      className={cn(
        'right-s8 absolute top-7.5 z-10 flex size-30 items-end',
        character.width > 120 ? 'justify-end' : 'justify-center',
      )}
      // 단계마다 상자 아래 여백이 조금씩 달라 Figma 값을 그대로 줌
      style={{ paddingBottom: character.bottom }}
    >
      <Image
        src={character.image}
        alt=""
        width={character.width}
        height={character.height}
        className="max-w-none shrink-0"
        priority
      />
    </div>
  );
}
