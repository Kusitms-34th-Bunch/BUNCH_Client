import { ProfileImage } from '@app/design-system/web';
import { type CharacterType, defaultBunchImage } from '@/shared/lib/bunchProfile';

type BunchProfileImageProps = {
  /** 번치 대표 이미지 주소. 없으면 번치 성격별 기본 이미지 */
  imageSrc?: string | undefined;
  characterType: CharacterType;
};

/**
 * 번치 홈·다른 번치 위쪽 오른쪽의 번치 프로필 이미지(Figma `Profile Image` 90×90, 테두리 1px)
 * 성격 색 영역 위에서 24px 아래에 놓이고 흰 시트에 32px 걸침. 장식이라 대체 텍스트는 비움
 */
export function BunchProfileImage({ imageSrc, characterType }: BunchProfileImageProps) {
  return (
    <ProfileImage
      src={imageSrc ?? defaultBunchImage(characterType)}
      className="border-border-tertiary right-s8 absolute top-6 z-10 border"
    />
  );
}
