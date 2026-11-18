import type { ReactNode } from 'react';
import { LineBellSmallIcon, LineCameraSmallIcon, LinePhotoSmallIcon } from '@app/design-system';

// 사진·카메라·알림은 선택 권한(위치 미요청), 요청 순서대로 나열
const PERMISSIONS: { icon: ReactNode; name: string; description: string }[] = [
  {
    icon: <LinePhotoSmallIcon />,
    name: '사진 접근',
    description: '앨범에서 사진을 불러올 때 사용해요.',
  },
  {
    icon: <LineCameraSmallIcon />,
    name: '카메라',
    description: '사진을 바로 찍어 올릴 때 사용해요.',
  },
  { icon: <LineBellSmallIcon />, name: '알림', description: '번치 소식과 코멘트 요청을 받아요.' },
];

/** 앱 접근 권한 안내(누르는 요소 없음, Figma 5878:77188). 아이콘 오른쪽에 이름과 설명 */
export function PermissionGuide() {
  return (
    <section className="gap-s8 flex flex-col">
      <h2 className="typography-heading-2-medium text-text-primary">앱 접근 권한 안내</h2>
      <ul className="gap-s8 px-padding-p6 flex flex-col">
        {PERMISSIONS.map(({ icon, name, description }) => (
          <li key={name} className="gap-s2 flex items-start">
            {/* 16px 아이콘을 22px 칸 가운데(이름 줄 높이와 맞춤) */}
            <span
              aria-hidden="true"
              className="text-icon-primary flex size-5.5 shrink-0 items-center justify-center"
            >
              {icon}
            </span>
            <div className="gap-s2 flex flex-col">
              <span className="typography-body-2-medium text-text-secondary">{name}</span>
              <p className="typography-caption-1-regular text-text-tertiary">{description}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
