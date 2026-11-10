import { useId, type ComponentProps } from 'react';
import { cn } from '../../../utils';
import { Button } from '../../core/button';

export type InviteCardProps = Omit<
  ComponentProps<'article'>,
  'children' | 'title' | 'aria-labelledby'
> & {
  bunchName: string;
  /** 번치 소개. 없거나 비어 있으면 소개 줄을 그리지 않음 */
  description?: string | undefined;
  /** 초대한 사람 이름. 없거나 비어 있으면 「From. 이름 님」 줄을 그리지 않음 */
  senderName?: string | undefined;
  /** 번치 대표 이미지 주소. 없으면 이미지 없는 빈 원으로 표시 */
  imageSrc?: string | undefined;
  /** 이미지 설명. 비우면 장식 이미지로 숨김 처리 */
  imageAlt?: string | undefined;
  /** 「참여하기」를 눌렀을 때 호출. 참여 처리는 호출하는 쪽 담당 */
  onJoin?: (() => void) | undefined;
  /** 참여할 수 없는 초대면 「참여하기」를 비활성으로 둠(이유는 호출하는 쪽이 알림) */
  joinDisabled?: boolean | undefined;
};

/**
 * 번치 초대장 카드: 번치 이름·소개, 대표 이미지, 보낸 사람, 「참여하기」 버튼
 * 번치 이름은 `h2`라 화면 제목(`h1`) 아래에서 사용
 */
export const InviteCard = ({
  bunchName,
  description,
  senderName,
  imageSrc,
  imageAlt = '',
  onJoin,
  joinDisabled,
  className,
  id,
  ...props
}: InviteCardProps) => {
  const generatedId = useId();
  const nameId = `${id ?? generatedId}-name`;

  return (
    <article
      aria-labelledby={nameId}
      id={id}
      // Figma 간격 26px(padding-p13)·이미지 167px·그림자 0 2 5 4%는 토큰에 없어 기본 scale·임의 값 적용
      className={cn(
        'px-s8 pt-s16 pb-s8 rounded-r8 bg-surface-primary flex w-full flex-col items-center gap-6.5 shadow-[0_2px_5px_rgba(0,0,0,0.04)]',
        className,
      )}
      {...props}
    >
      <div className="gap-s14 flex w-full flex-col items-center">
        <div className="gap-s2 flex w-full flex-col items-center text-center">
          <h2
            id={nameId}
            className="typography-title-1-semi-bold text-text-primary w-full wrap-break-word"
          >
            {bunchName}
          </h2>
          {description ? (
            <p className="typography-body-1-medium text-text-secondary line-clamp-2 w-full wrap-break-word">
              {description}
            </p>
          ) : null}
        </div>
        <div className="bg-surface-secondary relative size-41.75 shrink-0 rounded-full">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={imageAlt}
              className="absolute inset-0 size-full rounded-full object-cover object-bottom"
            />
          ) : null}
        </div>
        {senderName ? (
          <p className="typography-body-1-semi-bold text-text-tertiary gap-s1 flex items-center justify-center whitespace-nowrap">
            <span>From.</span> <span>{senderName}</span> <span>님</span>
          </p>
        ) : null}
      </div>
      <Button className="w-full" disabled={joinDisabled} onClick={onJoin}>
        참여하기
      </Button>
    </article>
  );
};
