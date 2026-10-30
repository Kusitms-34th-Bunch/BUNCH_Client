import type { ReactNode } from 'react';
import { LineBellMediumIcon, LineCameraMediumIcon, LinePhotoMediumIcon } from '@app/design-system';

// 사진·카메라·알림은 선택 권한(위치 미요청), 요청 순서대로 나열
const PERMISSIONS: { icon: ReactNode; name: string; description: string }[] = [
  {
    icon: <LinePhotoMediumIcon />,
    name: '사진 접근',
    description: '앨범에서 사진을 불러올 때 사용해요.',
  },
  {
    icon: <LineCameraMediumIcon />,
    name: '카메라',
    description: '사진을 바로 찍어 올릴 때 사용해요.',
  },
  { icon: <LineBellMediumIcon />, name: '알림', description: '번치 소식과 코멘트 요청을 받아요.' },
];

/** 가입 뒤 요청할 앱 접근 권한 안내(누르는 요소 없음) */
export function PermissionGuide() {
  return (
    <section className="gap-s10 flex flex-col">
      <h2 className="typography-heading-2-semibold text-text-primary">앱 접근 권한 안내</h2>
      <ul className="gap-s5 px-padding-p4 flex flex-col">
        {PERMISSIONS.map(({ icon, name, description }) => (
          <li key={name} className="gap-s1 flex flex-col">
            <div className="gap-s2 flex items-center">
              <span aria-hidden="true" className="text-icon-primary flex shrink-0">
                {icon}
              </span>
              <span className="typography-body-1-medium text-text-primary">{name}</span>
            </div>
            <p className="typography-caption-1-regular text-text-tertiary">{description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
