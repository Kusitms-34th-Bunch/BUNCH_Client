import type { ComponentProps } from 'react';
import { cn } from '../../../utils';
import { ProfileImage } from '../profileImage';

export type BundleParticipant = { name: string; imageSrc?: string | undefined };

export type BundleParticipantsProps = Omit<ComponentProps<'button'>, 'children' | 'type'> & {
  /** 참여 멤버(순서대로 앞의 3명 얼굴을 보여 줌) */
  members: BundleParticipant[];
  /** 화면 낭독용 이름. 기본값 「참여 멤버 N명」 */
  label?: string | undefined;
};

const VISIBLE = 3;

/**
 * 번들 참여 멤버 묶음(Figma `Bundle Author Info`·`Bundle Engagement`의 참여자): 얼굴 3개를 4px씩 겹치고 넘는 인원은 「외 N명」
 * 누르면 참여 멤버 시트를 여는 버튼. 멤버가 없으면 그리지 않음
 */
export const BundleParticipants = ({
  members,
  label,
  className,
  ...props
}: BundleParticipantsProps) => {
  if (members.length === 0) return null;
  const rest = members.length - VISIBLE;
  const content = (
    <>
      <span aria-hidden="true" className="isolate flex items-center">
        {members.slice(0, VISIBLE).map((member, index) => (
          <ProfileImage
            key={`${member.name}-${index}`}
            size="XXS"
            src={member.imageSrc}
            alt=""
            // 앞의 얼굴이 위에 놓임(Figma z-3·2·1)
            style={{ zIndex: VISIBLE - index }}
            className="outline-border-tertiary outline -outline-offset-1 not-last:-mr-1"
          />
        ))}
      </span>
      {rest > 0 ? <span aria-hidden="true">외 {rest}명</span> : null}
    </>
  );
  // 보이는 「외 N명」을 이름에 포함(음성 제어로 부를 수 있게)
  const name = label ?? `참여 멤버 ${members.length}명${rest > 0 ? `, 외 ${rest}명` : ''}`;
  const base =
    'gap-s2 typography-body-4-regular text-text-tertiary inline-flex shrink-0 items-center';

  if (!props.onClick)
    return (
      // 나머지 속성(id·aria-*·data-* 등)을 그대로 넘김. 버튼 전용 속성은 걸러지지 않음
      <span {...props} role="img" aria-label={name} className={cn(base, className)}>
        {content}
      </span>
    );

  return (
    <button
      type="button"
      aria-label={name}
      className={cn(
        base,
        'focus-visible:outline-border-brand relative cursor-pointer touch-manipulation rounded-full focus-visible:outline-2',
        // 얼굴 24px, 누르는 영역은 위아래 8px 넓혀 40px
        'before:absolute before:-inset-x-1 before:-inset-y-2',
        className,
      )}
      {...props}
    >
      {content}
    </button>
  );
};
