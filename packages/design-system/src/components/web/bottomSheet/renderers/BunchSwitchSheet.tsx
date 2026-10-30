'use client';

import { LineAddIcon } from '../../../../icons';
import { Button } from '../../../core/button';
import { BunchListItem, type BunchListItemStatus } from '../../bunchListItem';
import { ColorBadge } from '../../colorBadge';
import { BottomSheet, type BottomSheetRootProps } from '../BottomSheet';

export type BunchSwitchItem = {
  id: string;
  name: string;
  imageSrc?: string | undefined;
  /** 읽지 않은 알림 수. 1 이상이면 「알림 N개」 표시 */
  notificationCount?: number | undefined;
  status?: BunchListItemStatus | undefined;
};

export type BunchSwitchSheetProps = Omit<
  BottomSheetRootProps,
  'children' | 'disablePointerDismissal'
> & {
  bunches: BunchSwitchItem[];
  onSelect: (_id: string) => void;
  onAdd: () => void;
};

/**
 * 번치 전환 시트(Figma Bottom Sheet 04, `2487:46353`): 번치 목록 + 「새로운 번치 추가하기」
 * 현재 번치·접근 불가 번치는 흐림·선택 불가(`BunchListItem` status)
 */
export const BunchSwitchSheet = ({
  bunches,
  onSelect,
  onAdd,
  ...rootProps
}: BunchSwitchSheetProps) => (
  <BottomSheet.Root {...rootProps}>
    <BottomSheet.Content>
      <BottomSheet.Header>
        <BottomSheet.Title>번치 전환하기</BottomSheet.Title>
        <BottomSheet.Close />
      </BottomSheet.Header>
      {/* Figma 제목·목록 간격 24px(기본 16px + 8px) */}
      <BottomSheet.Body className="mt-s4 gap-s3 flex flex-col">
        {bunches.map(({ id, name, imageSrc, notificationCount, status = 'default' }) => (
          <BunchListItem
            key={id}
            name={name}
            imageSrc={imageSrc}
            status={status}
            className="shrink-0"
            onClick={() => onSelect(id)}
            badge={
              status === 'unavailable' ? (
                <ColorBadge color="gray" size="md">
                  접근 불가
                </ColorBadge>
              ) : status === 'default' && notificationCount ? (
                <ColorBadge color="pink" size="md">
                  알림 {notificationCount}개
                </ColorBadge>
              ) : undefined
            }
          />
        ))}
      </BottomSheet.Body>
      <BottomSheet.Footer>
        <Button variant="tertiary" leftIcon={<LineAddIcon size="lg" />} onClick={onAdd}>
          새로운 번치 추가하기
        </Button>
      </BottomSheet.Footer>
    </BottomSheet.Content>
  </BottomSheet.Root>
);
