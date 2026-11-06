import type { ComponentProps } from 'react';
import { FillMapPinMediumIcon, LineDotsMediumIcon } from '../../../icons';
import { cn } from '../../../utils';

export type LocationCardProps = Omit<ComponentProps<'div'>, 'children' | 'onClick'> & {
  /** 장소 이름(예: 「봄날카페」), 길면 한 줄 말줄임 */
  placeName: string;
  /** 주소(예: 「제주 제주시 애월읍」), 길면 한 줄 말줄임 */
  address: string;
  /** 출처 줄 앞부분. 번들에서 담았으면 번치 이름(예: 「여행가조」), 아니면 한 문구(예: 「BUNCH PICK」·「볼 수 없는 번들이에요」) */
  source: string;
  /** 출처 번들 제목(예: 「제주 3박 4일」). 있으면 「{source} | {bundleTitle}」로 잇고 길면 번들 제목만 말줄임 */
  bundleTitle?: string | undefined;
  /** 카드 누름. 있으면 카드 전체가 버튼이 되고 눌림 모양을 보임 */
  onClick?: (() => void) | undefined;
  /** 더보기 누름. 있으면 오른쪽 위에 점 아이콘 버튼 표시 */
  onMore?: (() => void) | undefined;
  /** 더보기 버튼 접근성 이름. 기본값 `<장소 이름> 더보기` */
  moreLabel?: string | undefined;
};

/**
 * 콕한 장소 한 곳의 카드(Figma `Location_Card`): 지도 핀·장소 이름·주소·출처(번치 | 번들)·더보기
 * 카드 누름과 더보기를 별도 버튼으로 두고, 카드 버튼의 누름 영역을 카드 전체로 넓힘. 목록 의미는 호출자 담당
 */
export const LocationCard = ({
  placeName,
  address,
  source,
  bundleTitle,
  onClick,
  onMore,
  moreLabel,
  className,
  ...props
}: LocationCardProps) => {
  const content = (
    <>
      {/* Figma: 핀 20px를 위아래 2px 여백 상자에 두어 이름 줄과 맞춤 */}
      <span className="py-s1 flex shrink-0">
        <FillMapPinMediumIcon aria-hidden className="text-icon-quaternary" />
      </span>
      <span className="gap-s5 flex min-w-0 flex-1 flex-col">
        <span className="gap-s1 flex min-w-0 flex-col">
          <span className="typography-body-2-medium text-text-primary truncate">{placeName}</span>
          <span className="typography-body-4-regular text-text-tertiary truncate">{address}</span>
        </span>
        <span className="text-text-quaternary flex min-w-0 items-center">
          {/* 번들 제목이 있으면 번치 이름은 그대로 두고 제목만 줄임 */}
          <span
            className={cn('typography-caption-1-medium', bundleTitle ? 'shrink-0' : 'truncate')}
          >
            {source}
          </span>
          {bundleTitle ? (
            <>
              {/* Figma 구분선 「|」 폭 12px, 읽을 때는 쉼표 역할만 하도록 숨김 */}
              <span aria-hidden className="typography-caption-1-regular w-3 shrink-0 text-center">
                |
              </span>
              <span className="sr-only">, </span>
              <span className="typography-caption-1-regular truncate">{bundleTitle}</span>
            </>
          ) : null}
        </span>
      </span>
    </>
  );

  return (
    <div
      {...props}
      className={cn(
        // Figma 테두리는 안쪽 선이라 크기에 넣지 않도록 outline으로 그림(343×96 유지)
        'bg-surface-primary outline-border-tertiary rounded-r4 px-padding-p8 py-padding-p7 gap-s4 relative isolate flex items-start outline -outline-offset-1',
        className,
      )}
    >
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className={cn(
            'gap-s5 flex min-w-0 flex-1 cursor-pointer touch-manipulation items-start text-left',
            // 누름 영역과 눌림 겹침을 카드 전체로 넓힘(Figma Status2: 검정 10% 겹침)
            'before:bg-overlay-hover before:rounded-r4 before:absolute before:inset-0 before:-z-10 before:opacity-0',
            'before:transition-opacity before:duration-75 before:ease-out active:before:opacity-100 motion-reduce:before:transition-none',
            'focus-visible:before:outline-border-brand focus-visible:outline-none focus-visible:before:outline-2 focus-visible:before:-outline-offset-2',
          )}
        >
          {content}
        </button>
      ) : (
        <div className="gap-s5 flex min-w-0 flex-1 items-start">{content}</div>
      )}
      {onMore ? (
        // 아이콘 20px·누르는 영역 40px, 음수 margin으로 Figma 배치 유지. 카드 버튼 위에 오도록 relative
        <button
          type="button"
          aria-label={moreLabel ?? `${placeName} 더보기`}
          onClick={onMore}
          className={cn(
            'text-icon-quaternary -m-s5 p-s5 relative inline-flex shrink-0 cursor-pointer touch-manipulation rounded-full',
            'before:bg-overlay-pressed before:inset-s5 before:absolute before:rounded-full before:opacity-0',
            'before:transition-opacity before:duration-75 before:ease-out active:before:opacity-100 motion-reduce:before:transition-none',
            'focus-visible:outline-border-brand focus-visible:outline-2',
          )}
        >
          <LineDotsMediumIcon aria-hidden />
        </button>
      ) : null}
    </div>
  );
};
