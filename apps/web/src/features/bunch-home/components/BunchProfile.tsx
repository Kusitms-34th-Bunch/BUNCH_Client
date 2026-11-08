import { Button, FillFlagSmallIcon, LineLockSmallIcon } from '@app/design-system';
import Link from 'next/link';
import type { BunchHomeDetail } from '../lib/types';

type BunchProfileProps = {
  bunch: Pick<
    BunchHomeDetail,
    'name' | 'description' | 'isPrivate' | 'followerCount' | 'followingCount' | 'memberCount'
  >;
  /** 「콕한 장소」 버튼 누름(콕한 장소 화면으로 이동, 번치 홈이 연결) */
  onPlacesClick?: (() => void) | undefined;
  /** 「콕한 장소」 표시(다른 번치 프로필은 Figma 3086:68423에 없어 숨김) */
  showPlaces?: boolean | undefined;
  /** 수를 누르면 갈 목록(팔로워·팔로잉 5.11, 멤버 화면설계서 2500:71333 4번). 없는 수는 글자만 */
  countHrefs?: Partial<Record<(typeof COUNTS)[number]['key'], string>> | undefined;
};

const COUNTS = [
  { key: 'followerCount', label: '팔로워' },
  { key: 'followingCount', label: '팔로잉' },
  { key: 'memberCount', label: '멤버' },
] as const;

/** 번치 이름(페이지 제목)·비공개 표시·소개, 팔로워·팔로잉·멤버 수와 「콕한 장소」 */
export function BunchProfile({
  bunch,
  onPlacesClick,
  showPlaces = true,
  countHrefs,
}: BunchProfileProps) {
  return (
    <div className="gap-s8 px-s8 flex flex-col">
      <div className="gap-s2 flex flex-col">
        <div className="gap-s3 flex min-w-0 items-center">
          <h1 className="typography-title-1-semi-bold text-text-primary min-w-0 truncate">
            {bunch.name}
          </h1>
          {bunch.isPrivate ? (
            <span className="bg-surface-secondary rounded-r10 text-icon-primary flex size-6 shrink-0 items-center justify-center">
              <LineLockSmallIcon />
              <span className="sr-only">비공개 번치</span>
            </span>
          ) : null}
        </div>
        <p className="typography-body-3-regular text-text-tertiary wrap-break-word whitespace-pre-line">
          {bunch.description}
        </p>
      </div>
      <div className="gap-s4 flex min-h-8 flex-wrap items-center justify-between">
        <ul className="gap-s6 typography-body-2-regular text-text-tertiary flex min-w-0 flex-wrap items-center whitespace-nowrap">
          {COUNTS.map(({ key, label }) => {
            const count = (
              <>
                <span className="typography-body-2-medium">
                  {bunch[key].toLocaleString('ko-KR')}
                </span>
                <span>{label}</span>
              </>
            );
            const href = countHrefs?.[key];
            return (
              <li key={key}>
                {href ? (
                  <Link
                    href={href}
                    className="gap-s1 focus-visible:outline-border-brand relative flex items-center rounded-sm before:absolute before:-inset-2 focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    {count}
                  </Link>
                ) : (
                  <span className="gap-s1 flex items-center">{count}</span>
                )}
              </li>
            );
          })}
        </ul>
        {/* 좁은 폭에서 수치가 길면 flex-wrap으로 버튼이 다음 줄로 내려감. 버튼이 없어도 줄 높이 32(Figma 3086:68423) */}
        {showPlaces ? (
          <Button
            variant="tertiary"
            size="sm"
            className="text-text-tertiary shrink-0"
            leftIcon={<FillFlagSmallIcon />}
            onClick={onPlacesClick}
          >
            콕한 장소
          </Button>
        ) : null}
      </div>
    </div>
  );
}
