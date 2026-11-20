import { Skeleton } from '@app/design-system';
import { MY_MESSAGES } from '../../constants/messages';
import { NOTIFICATION_TYPES } from '../../lib/types';

const text = MY_MESSAGES.notifications;

/** 토글 행(ToggleListItem과 같은 여백): 제목·설명은 고정 문구라 실제로 쓰고 켜짐 여부만 회색 */
function ToggleRowSkeleton({ title, description }: { title: string; description: string }) {
  return (
    <div className="gap-s6 px-padding-p4 py-padding-p3 flex items-center">
      <span className="gap-s2 flex min-w-0 flex-1 flex-col">
        <span className="typography-body-2-medium text-text-secondary">{title}</span>
        <span className="typography-caption-1-regular text-text-tertiary">{description}</span>
      </span>
      {/* Toggle과 같은 크기 */}
      <Skeleton shape="round" className="h-s13 w-s19" />
    </div>
  );
}

/**
 * 알림 설정 본문의 받는 중 자리(NotificationSettingsScreen과 같은 배치, Figma에 없는 상태)
 * 서버에서 오는 것은 토글 켜짐 여부뿐이라 토글만 회색으로 둠. 받기 전이라 누를 수 없음
 */
export function NotificationSettingsSkeleton() {
  return (
    <div aria-hidden="true" className="px-padding-p8 pt-padding-p6 gap-s14 flex flex-col">
      <ToggleRowSkeleton title={text.push.title} description={text.push.description} />
      <div className="gap-s3 flex flex-col">
        <span className="typography-caption-1-medium text-text-tertiary px-padding-p3">
          {text.typesLabel}
        </span>
        <div className="gap-s2 flex flex-col">
          {NOTIFICATION_TYPES.map((type) => (
            <ToggleRowSkeleton
              key={type}
              title={text.types[type].title}
              description={text.types[type].description}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
