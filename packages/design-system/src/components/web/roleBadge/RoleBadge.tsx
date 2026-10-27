import type { ComponentProps } from 'react';
import {
  GraphicRoleCoOwnerSmallIcon,
  GraphicRoleCoOwnerMediumIcon,
  GraphicRoleDraftAuthorSmallIcon,
  GraphicRoleDraftAuthorMediumIcon,
  GraphicRoleOwnerSmallIcon,
  GraphicRoleOwnerMediumIcon,
} from '../../../icons';

const ROLE_ICONS = {
  owner: { sm: GraphicRoleOwnerSmallIcon, md: GraphicRoleOwnerMediumIcon },
  coOwner: { sm: GraphicRoleCoOwnerSmallIcon, md: GraphicRoleCoOwnerMediumIcon },
  draftAuthor: { sm: GraphicRoleDraftAuthorSmallIcon, md: GraphicRoleDraftAuthorMediumIcon },
} as const;

export type RoleBadgeRole = keyof typeof ROLE_ICONS;
export type RoleBadgeSize = 'sm' | 'md';

export type RoleBadgeProps = Omit<
  ComponentProps<'svg'>,
  'children' | 'role' | 'size' | 'aria-label' | 'aria-hidden' | 'aria-labelledby' | 'tabIndex'
> & {
  memberRole?: RoleBadgeRole;
  size?: RoleBadgeSize;
  /** 역할 이름(예: "번치장"), 있으면 이미지로 노출·없으면 장식(aria-hidden) 처리 */
  label?: string;
};

/**
 * 멤버 역할 표시 원형 배지(Figma `Role Badge`): 번치장·공동 번치장은 왕관, 초안 작성자는 연필
 * 배경색·글리프가 원본 SVG에 포함된 컬러 그래픽 아이콘. 역할 이름 문구는 `label`로 전달(i18n)
 */
export const RoleBadge = ({
  memberRole = 'owner',
  size = 'sm',
  label,
  ...props
}: RoleBadgeProps) => {
  const Icon = ROLE_ICONS[memberRole][size];
  return <Icon aria-label={label} {...props} />;
};
