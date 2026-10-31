import type { ComponentProps } from 'react';
import { cn } from '../../../utils';
import { DeleteButton } from '../deleteButton';
import { ProfileImage } from '../profileImage';
import { RoleBadge, type RoleBadgeRole } from '../roleBadge';

export type MemberCardProps = Omit<ComponentProps<'div'>, 'children' | 'title'> & {
  /** 멤버 이름 */
  name: string;
  /** 프로필 이미지 주소(없으면 배경색 원만 표시) */
  src?: string | undefined;
  /** 역할 배지(번치장·공동 번치장·초안 작성자), 없으면 배지를 그리지 않음 */
  memberRole?: RoleBadgeRole | undefined;
  /** 역할 이름(예: "번치장"), 주면 배지가 이미지로 읽히고 없으면 장식으로 숨김 */
  roleLabel?: string | undefined;
  /** 오른쪽 위 삭제 버튼을 눌렀을 때(주면 삭제 버튼이 나타남, Figma `Delete=True`) */
  onDelete?: (() => void) | undefined;
  /** 삭제 버튼의 접근성 이름(기본 "{이름} 삭제") */
  deleteLabel?: string | undefined;
};

/**
 * 멤버 카드(Figma `Member Card`, `Variant=default`): 76px 폭에 프로필 사진·역할 배지·이름
 * 삭제 버튼은 `onDelete`를 줄 때만 오른쪽 위에 겹치며 `className`은 카드에 적용
 */
export const MemberCard = ({
  name,
  src,
  memberRole,
  roleLabel,
  onDelete,
  deleteLabel,
  className,
  ...props
}: MemberCardProps) => (
  <div
    className={cn(
      'bg-surface-secondary px-padding-p7 py-s4 gap-s5 rounded-r4 relative flex w-19 shrink-0 flex-col items-center',
      className,
    )}
    {...props}
  >
    <ProfileImage src={src} size="S" className="border-border-tertiary border" />
    <div className="gap-s1 flex max-w-full items-center">
      {memberRole !== undefined && (
        <RoleBadge
          memberRole={memberRole}
          size="sm"
          className="shrink-0"
          {...(roleLabel && { label: roleLabel })}
        />
      )}
      <span className="typography-body-3-regular text-text-secondary min-w-0 truncate">{name}</span>
    </div>
    {onDelete !== undefined && (
      <DeleteButton
        label={deleteLabel ?? `${name} 삭제`}
        onClick={onDelete}
        className="absolute -top-0.75 -right-0.75"
      />
    )}
  </div>
);
