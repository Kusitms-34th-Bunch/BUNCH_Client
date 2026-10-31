import type { ComponentProps } from 'react';
import { cn } from '../../../utils';
import { Radio } from '../../core/radio';
import { ProfileImage } from '../profileImage';

export type ProfileRadioCardProps = Omit<ComponentProps<'input'>, 'type' | 'children'> & {
  /** 멤버 이름(라디오 접근성 이름, 긴 이름은 한 줄 말줄임) */
  label: string;
  /** 프로필 이미지 주소. 없으면 기본 배경색 원, 이미지는 장식 */
  imageSrc?: string | undefined;
};

/**
 * 멤버 한 명을 고르는 카드(Figma `Profile Radio Card`): 프로필 이미지·이름·오른쪽 라디오
 * 그룹(`name`·`fieldset`)과 선택 값은 호출자 담당, `className`은 카드에 적용
 */
export const ProfileRadioCard = ({
  label,
  imageSrc,
  className,
  ...props
}: ProfileRadioCardProps) => (
  <label
    className={cn(
      'bg-surface-secondary rounded-r5 px-padding-p6 py-padding-p5 gap-s4 group flex w-full cursor-pointer touch-manipulation items-center',
      // 눌림은 바탕 layer로 겹쳐 글자는 그대로 유지
      'not-has-disabled:active:bg-[linear-gradient(var(--color-overlay-pressed),var(--color-overlay-pressed))]',
      'has-checked:bg-surface-brand-subtle-1 has-checked:ring-border-brand-subtle has-checked:ring-1 has-checked:ring-inset',
      'has-disabled:cursor-not-allowed has-disabled:opacity-(--semantic-opacity-disabled)',
      className,
    )}
  >
    <ProfileImage
      src={imageSrc}
      size="S"
      className={cn(
        'border-border-tertiary group-has-checked:border-border-brand-subtle border',
        'group-[:not(:has(:disabled)):active]:after:bg-overlay-pressed after:absolute after:inset-0 after:opacity-0 group-[:not(:has(:disabled)):active]:after:opacity-100',
      )}
    />
    {/* 이름이 남은 폭을 채워 라디오를 오른쪽 끝에 배치 */}
    <span
      title={label}
      className="typography-body-1-medium text-text-primary group-has-disabled:text-text-disabled min-w-0 flex-1 truncate"
    >
      {label}
    </span>
    <Radio {...props} />
  </label>
);
