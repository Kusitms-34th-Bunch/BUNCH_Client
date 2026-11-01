import { Button, LineLockSmallIcon } from '@app/design-system';
import type { BunchHomeDetail } from '../lib/types';

type BunchProfileProps = {
  bunch: BunchHomeDetail;
  /** 「가볼 곳」(화면이 아직 없어 호출 지점만 둠) */
  onPlacesClick?: (() => void) | undefined;
};

const COUNTS = [
  { key: 'followerCount', label: '팔로워' },
  { key: 'followingCount', label: '팔로잉' },
  { key: 'memberCount', label: '멤버' },
] as const;

/** 번치 이름(페이지 제목)·비공개 표시·소개, 팔로워·팔로잉·멤버 수와 「가볼 곳」 */
export function BunchProfile({ bunch, onPlacesClick }: BunchProfileProps) {
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
      <div className="gap-s4 flex flex-wrap items-center justify-between">
        <ul className="gap-s6 typography-body-2-regular text-text-tertiary flex min-w-0 items-center whitespace-nowrap">
          {COUNTS.map(({ key, label }) => (
            <li key={key} className="gap-s1 flex items-center">
              <span className="typography-body-2-medium">{bunch[key].toLocaleString('ko-KR')}</span>
              <span>{label}</span>
            </li>
          ))}
        </ul>
        {/* 좁은 폭에서 수치가 길면 flex-wrap으로 버튼이 다음 줄로 내려감 */}
        {/* Figma 깃발 아이콘은 디자인 시스템 아이콘에 없어 글자만 표시(spec 확인할 항목) */}
        <Button
          variant="tertiary"
          size="sm"
          className="text-text-tertiary shrink-0"
          onClick={onPlacesClick}
        >
          가볼 곳
        </Button>
      </div>
    </div>
  );
}
