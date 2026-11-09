import { useId, type ComponentProps } from 'react';
import { FillCircleCheckLargeIcon, FillMapPinSmallIcon, LineDotsMediumIcon } from '../../../icons';
import { cn } from '../../../utils';
import { ColorBadge } from '../colorBadge';
import { PlacePickButton } from '../placePickButton';
import { ProfileImage } from '../profileImage';
import hiddenMotion from './hiddenMotion.module.css';

export type AdPhotoCardProps = Omit<ComponentProps<'article'>, 'children' | 'title'> & {
  /** 장소 이름(예: 「플로디스튜디오」) */
  title: string;
} & (
    | {
        /** 숨김 처리한 카드(Figma `State=Hidden`): 사진 대신 체크 모션과 안내 글자만 보임 */
        state: 'hidden';
        /** 숨김 안내 글자. 기본값 「장소를 숨김 처리 했어요」 */
        hiddenLabel?: string | undefined;
      }
    | {
        state?: 'default' | undefined;
        /** 배경 사진 */
        imageSrc: string;
        /** 사진 대체 글자. 기본은 빈 글자(장식) */
        imageAlt?: string | undefined;
        /** 위쪽 로고 */
        logoSrc?: string | undefined;
        /** 위쪽 배지. 기본값 「BUNCH SPOT」 */
        badge?: string | undefined;
        /** 홍보 문구(예: 「여기서 뭉쳐봐요!」) */
        tagline: string;
        /** 소개(예: 「도자기 원데이 클래스」) */
        description?: string | undefined;
        /** 위치 글자(예: 「서울숲역 도보 7분」) */
        location?: string | undefined;
        /** 아래 태그 칩(예: 「최대 4인」) */
        tags?: readonly string[] | undefined;
        /** 현재 번치의 콕한 장소에 담겨 있음 */
        picked: boolean;
        /** 「콕하기」·「콕 했어요」를 눌렀을 때 */
        onPick: () => void;
        /** 더보기(⋯)를 눌렀을 때(숨기기 메뉴) */
        onMore: () => void;
        /** 더보기 버튼 접근성 이름. 기본값 `<장소 이름> 광고 더보기` */
        moreLabel?: string | undefined;
        /** 제목 요소 태그. 기본 h3(피드 화면의 h2 아래) */
        titleAs?: 'h2' | 'h3' | 'p' | undefined;
      }
  );

// Figma 그라데이션(토큰 없음, 디자인 값 유지)
const TOP_SCRIM = 'linear-gradient(to bottom, rgba(0,0,0,0.35), rgba(0,0,0,0))';
const BOTTOM_SCRIM =
  'linear-gradient(to top, rgba(0,0,0,0.6) 27.864%, rgba(0,0,0,0.5) 51.302%, rgba(0,0,0,0.08) 85.006%, rgba(0,0,0,0) 98.116%)';

const frame = 'rounded-r10 relative aspect-4/5 w-full overflow-hidden';

/**
 * 광고(BUNCH SPOT) 사진 카드(Figma `Ad Photo Card`, `State=Default·Hidden`): 번들 사진 카드와 같은 4:5·모서리 24
 * 위쪽 로고·배지·홍보 문구·콕하기·더보기, 아래쪽 장소 이름·소개·위치·태그. 숨김이면 체크 모션과 안내 글자만
 * 기존 `Ad Card`와는 별개. 외부 링크 동작은 Figma·명세에 없어 사진은 누를 수 없음
 */
export const AdPhotoCard = (props: AdPhotoCardProps) => {
  const titleId = useId();
  if (props.state === 'hidden') {
    const { state: _, hiddenLabel = '장소를 숨김 처리 했어요', title, className, ...rest } = props;
    return (
      <article
        aria-label={`광고 ${title}`}
        // 숨기기로 더보기 버튼이 사라지면 호출자가 이 카드로 초점을 옮길 수 있게 함
        tabIndex={-1}
        className={cn(
          frame,
          'bg-surface-secondary flex flex-col items-center justify-center outline-none',
          className,
        )}
        {...rest}
      >
        {/* 기본 상태부터 같은 자리에 있던 알림 영역에 글자만 채워 낭독되게 함. 화면에서는 아이콘 아래 */}
        <p role="status" className="typography-body-2-medium text-text-quinary order-1">
          {hiddenLabel}
        </p>
        <FillCircleCheckLargeIcon
          aria-hidden
          className={cn('text-icon-quaternary size-9', hiddenMotion.pop)}
        />
      </article>
    );
  }

  const {
    state: _,
    title,
    imageSrc,
    imageAlt = '',
    logoSrc,
    badge = 'BUNCH SPOT',
    tagline,
    description,
    location,
    tags,
    picked,
    onPick,
    onMore,
    moreLabel,
    titleAs: Title = 'h3',
    className,
    ...rest
  } = props;

  return (
    <article
      aria-label={`광고 ${title}`}
      // 사진을 받기 전·실패 시에도 흰 글자가 보이게 어두운 바탕
      className={cn(frame, 'bg-surface-inversed flex flex-col', className)}
      {...rest}
    >
      {/* 숨김으로 바뀔 때 낭독되도록 미리 둔 빈 알림 영역 */}
      <p role="status" className="sr-only" />
      <img
        src={imageSrc}
        alt={imageAlt}
        decoding="async"
        className="absolute inset-0 size-full object-cover"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-28"
        style={{ backgroundImage: TOP_SCRIM }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-34"
        style={{ backgroundImage: BOTTOM_SCRIM }}
      />
      <div className="pt-padding-p8 px-padding-p8 relative flex items-center">
        <div className="gap-s4 flex min-w-0 flex-1 items-center">
          <ProfileImage
            size="XS"
            src={logoSrc}
            alt=""
            className="outline-border-tertiary outline -outline-offset-1"
          />
          <div className="gap-s2 flex min-w-0 flex-1 flex-col items-start">
            <span className="bg-primitive-white-alpha-20 rounded-r3 px-padding-p3 py-padding-p1 typography-caption-1-regular text-text-inversed">
              {badge}
            </span>
            <p className="px-padding-p2 typography-caption-1-medium text-text-inversed w-full truncate">
              {tagline}
            </p>
          </div>
        </div>
        <div className="gap-s6 flex shrink-0 items-center">
          {/* 글자가 바뀌어도 폭이 같게 88(Figma) */}
          <PlacePickButton
            picked={picked}
            onClick={onPick}
            aria-describedby={titleId}
            className="w-22"
          />
          {/* 아이콘 20px, 누르는 영역은 before로 40px */}
          <button
            type="button"
            aria-label={moreLabel ?? `${title} 광고 더보기`}
            onClick={onMore}
            className="text-icon-inversed focus-visible:outline-border-inversed relative flex shrink-0 cursor-pointer touch-manipulation rounded-full before:absolute before:-inset-2.5 focus-visible:outline-2"
          >
            <LineDotsMediumIcon aria-hidden />
          </button>
        </div>
      </div>
      <div className="px-padding-p8 pb-padding-p8 gap-s5 relative mt-auto flex flex-col">
        <Title
          id={titleId}
          className="typography-body-1-semi-bold text-text-inversed wrap-break-word"
        >
          {title}
        </Title>
        {description || location ? (
          <div className="gap-x-s3 gap-y-s2 typography-body-4-regular text-text-inversed flex flex-wrap items-center opacity-80">
            {description ? <span>{description}</span> : null}
            {location ? (
              <span className="gap-s1 flex items-end">
                <FillMapPinSmallIcon aria-hidden className="text-icon-inversed shrink-0" />
                <span>
                  <span className="sr-only">위치 </span>
                  {location}
                </span>
              </span>
            ) : null}
          </div>
        ) : null}
        {tags && tags.length > 0 ? (
          <ul className="gap-s3 flex flex-wrap">
            {tags.map((tag, index) => (
              <li key={`${tag}-${index}`}>
                <ColorBadge size="sm" color="gray">
                  {tag}
                </ColorBadge>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
};
