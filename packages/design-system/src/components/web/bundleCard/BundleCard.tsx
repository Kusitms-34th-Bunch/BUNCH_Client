import type { ComponentProps } from 'react';
import { LineTrashcanSmallIcon } from '../../../icons';
import { cn } from '../../../utils';
import { BundleParticipants } from '../bundleParticipants';

export type BundleCardMember = {
  /** 멤버 이름(목록 key와 숨은 인원 수 계산에 사용) */
  name: string;
  /** 프로필 이미지 주소. 없으면 기본 배경색 원 */
  imageSrc?: string | undefined;
};

export type BundleCardProps = Omit<ComponentProps<'div'>, 'children' | 'title'> & {
  /** 번들 이름(카드 버튼의 접근성 이름, 길면 한 줄 말줄임) */
  title: string;
  /** 번들 대표 사진 주소 */
  imageSrc: string;
  /** 참여 멤버. 앞의 3명 얼굴과 넘는 인원 「외 N명」 표시 */
  members: BundleCardMember[];
  /** 카드를 눌렀을 때(번들 열기) */
  onCardClick: () => void;
  /** 삭제 버튼을 눌렀을 때. 없으면 삭제 버튼 숨김 */
  onDelete?: (() => void) | undefined;
  /** 삭제 버튼 접근성 이름. 기본값 `<번들 이름> 삭제` */
  deleteLabel?: string | undefined;
};

/**
 * 번들 목록 카드(Figma `Bundle_Card_List`): 대표 사진·번들 이름·참여자 얼굴·삭제 버튼
 * 카드 버튼과 삭제 버튼은 서로 다른 버튼(중첩 없이 형제), `className`은 카드에 적용
 */
export const BundleCard = ({
  title,
  imageSrc,
  members,
  onCardClick,
  onDelete,
  deleteLabel,
  className,
  ...props
}: BundleCardProps) => {
  return (
    <div
      {...props}
      className={cn(
        'gap-s3 rounded-r2 relative isolate flex w-full items-stretch',
        // 눌림은 카드 위에 겹쳐 사진·얼굴까지 함께 어두워지게 처리
        'before:rounded-r2 before:bg-overlay-hover before:pointer-events-none before:absolute before:inset-0 before:z-20 before:opacity-0',
        'has-[[data-card-button]:active]:before:opacity-100',
        'has-[[data-card-button]:focus-visible]:outline-border-brand has-[[data-card-button]:focus-visible]:outline-2 has-[[data-card-button]:focus-visible]:outline-offset-2',
        className,
      )}
    >
      <img
        src={imageSrc}
        alt=""
        decoding="async"
        className="rounded-r2 h-20 w-32 shrink-0 object-cover"
      />
      <div className="gap-s2 flex min-w-0 flex-1 flex-col">
        <div className="flex h-6 justify-end">
          {onDelete ? (
            <button
              type="button"
              aria-label={deleteLabel || `${title} 삭제`}
              onClick={onDelete}
              className={cn(
                'bg-surface-secondary text-icon-tertiary relative z-10 flex size-6 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-full',
                // 보이는 크기는 24px로 두고 터치 영역만 32px로 넓힘(Small 아이콘 기준)
                "before:absolute before:-inset-1 before:content-['']",
                'active:bg-[linear-gradient(var(--color-overlay-pressed),var(--color-overlay-pressed))]',
                'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:outline-offset-2',
              )}
            >
              <LineTrashcanSmallIcon />
            </button>
          ) : null}
        </div>
        <button
          type="button"
          data-card-button=""
          onClick={onCardClick}
          className={cn(
            'typography-body-3-regular text-text-secondary min-w-0 cursor-pointer touch-manipulation text-left outline-none',
            // 버튼을 카드 전체로 넓혀 어디를 눌러도 카드가 눌리게 처리
            "after:absolute after:inset-0 after:content-['']",
          )}
        >
          <span className="block truncate">{title}</span>
          {members.length > 0 ? <span className="sr-only">, 참여자 {members.length}명</span> : null}
        </button>
        {/* 인원 수는 카드 버튼의 숨은 글자로 전달해 장식으로 숨김(Figma `Member Avatar Group`) */}
        <div aria-hidden="true" className="flex">
          <BundleParticipants members={members} />
        </div>
      </div>
    </div>
  );
};
