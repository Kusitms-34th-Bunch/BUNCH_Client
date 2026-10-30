import type { ComponentProps } from 'react';
import { LineMapPinSmallIcon } from '../../../icons';
import { cn } from '../../../utils';
import { ProfileImage } from '../profileImage';

/** 제목 옆에 겹쳐 보이는 멤버 아바타의 최대 개수(Figma `showAvatar1~8`) */
export const BUNDLE_TITLE_MAX_AVATARS = 8;

export type BundleTitleMember = {
  /** 멤버 이름(아바타의 대체 텍스트) */
  name: string;
  /** 프로필 이미지 주소(없으면 배경색 원) */
  src?: string | undefined;
};

export type BundleTitleProps = Omit<ComponentProps<'div'>, 'children' | 'title'> & {
  /** 제목 글자(예: "사진") */
  title: string;
  /** 제목 글자 요소의 id(입력창 등이 `aria-labelledby`로 이 제목을 가리킬 때) */
  titleId?: string | undefined;
  /** 제목 앞 위치 핀 아이콘을 보일지(기본 `true`) */
  icon?: boolean | undefined;
  /** 필수 입력 표시(제목 뒤 별표) */
  required?: boolean | undefined;
  /** 필수 표시를 읽어 주는 글자(기본 "필수") */
  requiredLabel?: string | undefined;
  /** 제목 오른쪽에 겹쳐 놓을 멤버 아바타(앞에서부터 최대 8명만 보임) */
  members?: readonly BundleTitleMember[] | undefined;
  /** 아바타 목록의 접근성 이름(기본 "멤버") */
  membersLabel?: string | undefined;
};

/**
 * 번들 항목의 제목 줄(Figma `BundleTitle`): 위치 핀·제목·필수 별표와 오른쪽에 겹친 멤버 아바타
 * 입력 필드 위의 이름표로 쓰이며 `className`은 줄에 적용
 */
export const BundleTitle = ({
  title,
  titleId,
  icon = true,
  required = false,
  requiredLabel = '필수',
  members,
  membersLabel = '멤버',
  className,
  ...props
}: BundleTitleProps) => {
  const avatars = members?.slice(0, BUNDLE_TITLE_MAX_AVATARS) ?? [];

  return (
    <div className={cn('gap-s4 flex h-6.25 items-center', className)} {...props}>
      <div className="gap-s2 text-icon-primary flex min-w-0 items-center">
        {icon && <LineMapPinSmallIcon aria-hidden="true" className="shrink-0" />}
        <div className="gap-s1 flex min-w-0 items-center">
          <span id={titleId} className="typography-body-3-semi-bold text-text-secondary truncate">
            {title}
          </span>
          {required && (
            <>
              <span
                aria-hidden="true"
                className="typography-body-1-semi-bold text-icon-brand shrink-0"
              >
                *
              </span>
              <span className="sr-only">{requiredLabel}</span>
            </>
          )}
        </div>
      </div>
      {avatars.length > 0 && (
        <ul aria-label={membersLabel} className="flex shrink-0 items-center">
          {avatars.map((member, index) => (
            <li key={`${member.name}-${index}`} className={cn(index > 0 && '-ml-2')}>
              <ProfileImage
                src={member.src}
                alt={member.name}
                className="border-border-tertiary size-6 border"
              />
              {/* 사진이 없으면 ProfileImage가 img를 그리지 않아 이름이 사라지므로 글자로 대신 전달 */}
              {!member.src && <span className="sr-only">{member.name}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
