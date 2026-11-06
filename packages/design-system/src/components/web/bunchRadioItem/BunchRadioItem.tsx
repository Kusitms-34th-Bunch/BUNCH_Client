import type { ComponentProps } from 'react';
import { FillCircleCheckLargeIcon } from '../../../icons';
import { cn } from '../../../utils';
import { ColorBadge } from '../colorBadge';
import { ProfileImage } from '../profileImage';

export type BunchRadioItemProps = Omit<ComponentProps<'input'>, 'type' | 'children'> & {
  /** 번치 이름(라디오 접근성 이름, 긴 이름은 한 줄 말줄임) */
  label: string;
  /** 번치 대표 이미지 주소. 없으면 기본 배경색 원, 이미지는 장식 */
  imageSrc?: string | undefined;
  /** 이름 옆 「알림 N개」 칩. 0 이하이거나 없으면 숨김 */
  alertCount?: number | undefined;
};

/**
 * 번치 하나를 고르는 라디오 행(Figma `Profile - Label`): 대표 이미지·이름·알림 칩·선택 체크
 * Figma `Pressed`(회색 바탕 + 체크)를 선택됨으로 사용, 그룹(`name`·`fieldset`)과 선택 값은 호출자 담당
 */
export const BunchRadioItem = ({
  label,
  imageSrc,
  alertCount,
  className,
  ...props
}: BunchRadioItemProps) => (
  <label
    className={cn(
      'rounded-r4 px-padding-p5 py-padding-p3 gap-s4 group relative flex w-full cursor-pointer touch-manipulation items-center justify-between',
      // 선택됨·누르는 중: 바탕 overlay-hover(10%)
      'has-checked:bg-overlay-hover not-has-disabled:active:bg-overlay-hover',
      'has-disabled:cursor-not-allowed has-disabled:opacity-(--semantic-opacity-disabled)',
      'has-focus-visible:outline-border-brand has-focus-visible:outline-2 has-focus-visible:outline-offset-2',
      className,
    )}
  >
    <input {...props} type="radio" className="sr-only" />
    <span className="gap-s5 flex min-w-0 items-center">
      <ProfileImage
        src={imageSrc}
        size="S"
        className={cn(
          'border-border-tertiary border',
          // Figma Pressed: 이미지 위 overlay-pressed(20%)
          'after:bg-overlay-pressed after:absolute after:inset-0 after:opacity-0 group-has-checked:after:opacity-100',
        )}
      />
      <span className="gap-s3 flex min-w-0 items-center">
        <span
          title={label}
          className="typography-body-1-medium text-text-primary group-has-disabled:text-text-disabled truncate"
        >
          {label}
        </span>
        {alertCount && alertCount > 0 ? (
          <ColorBadge
            color="pink"
            size="md"
            // 좁은 행: 이름이 먼저 말줄임, 칩은 max-w-full 해제로 글자 유지
            className="px-padding-p2 py-padding-p1 rounded-r2 gap-s1 max-w-none group-has-checked:bg-[linear-gradient(var(--color-overlay-hover),var(--color-overlay-hover))]"
          >
            <span className="sr-only">, </span>
            <span>알림</span>
            {/* 접근성 이름이 「알림 N개」로 띄어 읽히도록 공백 유지(화면 간격은 gap) */}{' '}
            <span>
              <span className="typography-caption-1-medium">{alertCount}</span>개
            </span>
          </ColorBadge>
        ) : null}
      </span>
    </span>
    {/* 선택 여부는 라디오 checked로 전달, 체크 아이콘은 장식 */}
    <FillCircleCheckLargeIcon className="text-icon-quaternary invisible shrink-0 group-has-checked:visible" />
  </label>
);
