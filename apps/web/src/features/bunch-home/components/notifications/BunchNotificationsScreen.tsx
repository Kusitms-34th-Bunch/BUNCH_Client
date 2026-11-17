'use client';

import {
  Header,
  LineChevronLeftLargeIcon,
  LineChevronRightLargeIcon,
  TextButton,
} from '@app/design-system';
import { NotificationCard } from '@app/design-system/web';
import { useEffect, useRef, useState } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import type { BunchNotification } from '../../lib/types';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';

type BunchNotificationsScreenProps = {
  /** 지금 번치 이름(제목 낭독용). 아직 모르면 undefined */
  bunchName: string | undefined;
  /** 최신순 알림. 아직 모르면 목록을 그리지 않음 */
  notifications: readonly BunchNotification[] | undefined;
  /** 읽지 않은 알림이 있는지(서버 수 기준, 받아 온 첫 쪽 밖도 포함) */
  hasUnread: boolean;
  /** 진행 안내(알림을 여는 중). 있으면 상태 영역에 우선 실음 */
  notice?: string | undefined;
  onBack: () => void;
  /** 모두 읽음. 끝나면 결과를 낭독, 실패하면 reject(안내는 부르는 쪽) */
  onReadAll: () => Promise<unknown>;
  /** 알림을 눌렀을 때(읽음과 종류별 이동은 부르는 쪽) */
  onOpen: (_notification: BunchNotification) => void;
};

/**
 * 번치 알림 목록(기능명세 5.12, Figma 1892:36947, 화면설계서 2236:41816 3-1): 설정 안내 줄, 알림 카드, 「모두 읽음」
 */
export function BunchNotificationsScreen({
  bunchName,
  notifications,
  hasUnread,
  notice,
  onBack,
  onReadAll,
  onOpen,
}: BunchNotificationsScreenProps) {
  // 「모두 읽음」 결과 낭독(초점은 버튼에 남고 카드 이름만 바뀌어 스크린 리더가 알 수 없음)
  const [status, setStatus] = useState('');
  const frame = useRef(0);
  // 모두 읽음 요청 중 다시 눌러도 한 번만
  const reading = useRef(false);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const readAll = () => {
    // 번치를 아직 모르면(hydration 전) 읽을 목록이 없어 결과도 알리지 않음
    if (!notifications) return;
    // 같은 문구를 다시 채워도 읽히도록 비운 뒤 다음 프레임에 채움
    const announce = (message: string) => {
      setStatus('');
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => setStatus(message));
    };
    // 읽을 알림이 없으면 요청하지 않음
    if (!hasUnread) {
      announce(BUNCH_HOME_MESSAGES.nothingToRead);
      return;
    }
    if (reading.current) return;
    reading.current = true;
    onReadAll()
      .then(
        () => announce(BUNCH_HOME_MESSAGES.readAllDone),
        () => {},
      )
      .finally(() => {
        reading.current = false;
      });
  };

  return (
    <PageShell
      data-app-background="secondary"
      className="bg-surface-secondary"
      header={
        <Header
          className="bg-surface-secondary"
          leading={
            <HeaderIconButton label="뒤로 가기" tone="subtle" onClick={onBack}>
              <LineChevronLeftLargeIcon />
            </HeaderIconButton>
          }
          // Figma 「모두 읽음」(TextButton sm)
          trailing={
            <TextButton size="sm" onClick={readAll}>
              모두 읽음
            </TextButton>
          }
        />
      }
    >
      <h1 className="sr-only">{bunchName ? `${bunchName} 알림` : '알림'}</h1>
      <p role="status" className="sr-only">
        {notifications === undefined
          ? BUNCH_HOME_MESSAGES.notificationsLoading
          : (notice ??
            (status || (notifications.length === 0 ? BUNCH_HOME_MESSAGES.noNotifications : '')))}
      </p>
      {/* 헤더 아래 12, 안내 줄과 목록 사이 24, 카드 사이 8(Figma 1892:36948) */}
      <div className="gap-s12 pt-padding-p6 px-padding-p8 pb-s8 flex flex-col">
        {/* 알림 설정 화면(MY)이 생기면 그 화면으로 이동 */}
        <p className="bg-surface-tertiary rounded-r5 px-padding-p8 py-padding-p6 typography-body-3-regular text-text-tertiary gap-s4 flex items-center justify-between break-keep">
          {BUNCH_HOME_MESSAGES.notificationSettingsNudge}
          <LineChevronRightLargeIcon aria-hidden className="text-icon-quaternary shrink-0" />
        </p>
        {notifications && notifications.length > 0 ? (
          <ul className="gap-s4 flex flex-col">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <NotificationCard
                  title={notification.title}
                  description={notification.description}
                  time={notification.time}
                  unread={notification.unread}
                  onClick={() => onOpen(notification)}
                />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </PageShell>
  );
}
