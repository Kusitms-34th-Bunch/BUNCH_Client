import { useId, type ComponentProps } from 'react';
import { cn } from '../../../utils';
import { Button } from '../../core/button';

export type InviteCardProps = Omit<
  ComponentProps<'article'>,
  'children' | 'title' | 'aria-labelledby'
> & {
  bunchName: string;
  description: string;
  /** 초대한 사람 이름 */
  senderName: string;
  /** 번치 대표 이미지 주소. 없으면 이미지 없는 빈 원으로 보인다 */
  imageSrc?: string | undefined;
  /** 이미지 설명. 비우면 장식 이미지로 숨겨진다 */
  imageAlt?: string | undefined;
  /** 「참여하기」를 눌렀을 때 호출한다. 참여 처리는 호출하는 쪽이 한다 */
  onJoin?: (() => void) | undefined;
};

/**
 * 번치 초대장 카드: 번치 이름·소개, 대표 이미지, 보낸 사람, 「참여하기」 버튼
 * 번치 이름은 `h2`라 화면 제목(`h1`) 아래에서 쓴다
 */
export const InviteCard = ({
  bunchName,
  description,
  senderName,
  imageSrc,
  imageAlt = '',
  onJoin,
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
          <p className="typography-body-1-medium text-text-secondary w-full wrap-break-word">
            {description}
          </p>
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
        <p className="typography-body-1-semi-bold text-text-tertiary gap-s1 flex items-center justify-center whitespace-nowrap">
          <span>From.</span> <span>{senderName}</span> <span>님</span>
        </p>
      </div>
      <Button className="w-full" onClick={onJoin}>
        참여하기
      </Button>
    </article>
  );
};
