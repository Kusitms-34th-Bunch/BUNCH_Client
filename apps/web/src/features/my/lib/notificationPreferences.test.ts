import { describe, expect, it } from 'vitest';
import { PUSH_NOTIFICATION_TYPES } from '@/mocks/db/seed';
import {
  NOTIFICATION_TYPE_KEYS,
  applyPreferencePatch,
  pushPatch,
  toNotificationSettings,
  typePatch,
  type PushPreferences,
} from './notificationPreferences';
import { NOTIFICATION_TYPES } from './types';

/** 서버가 주는 21개 키를 모두 같은 값으로 채운 설정 */
const allKeys = (value: boolean): Record<string, boolean> => {
  const keys: string[] = [
    ...Object.values(NOTIFICATION_TYPE_KEYS).flat(),
    'CHARACTER_GROWN',
    'MEMBER_REMOVED',
    'BUNCH_DELETED',
    'BUNCH_VISIBILITY_CHANGED',
  ];
  return Object.fromEntries(keys.map((key) => [key, value]));
};

describe('NOTIFICATION_TYPE_KEYS', () => {
  it('토글 4개에 서버 알림 종류 17개를 겹치지 않게 묶고, 토글이 없는 9·14~16번은 묶지 않는다', () => {
    const keys = Object.values(NOTIFICATION_TYPE_KEYS).flat();

    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toHaveLength(17);
    for (const alwaysSent of [
      'CHARACTER_GROWN',
      'MEMBER_REMOVED',
      'BUNCH_DELETED',
      'BUNCH_VISIBILITY_CHANGED',
    ]) {
      expect(keys).not.toContain(alwaysSent);
    }
  });
});

describe('서버 알림 종류 전체', () => {
  it('토글에 묶은 키와 토글이 없는 4개를 합치면 서버가 주는 21개 키와 같다(서버에 키가 늘면 알 수 있음)', () => {
    const covered = [
      ...Object.values(NOTIFICATION_TYPE_KEYS).flat(),
      'CHARACTER_GROWN',
      'MEMBER_REMOVED',
      'BUNCH_DELETED',
      'BUNCH_VISIBILITY_CHANGED',
    ];

    expect([...covered].sort()).toEqual([...PUSH_NOTIFICATION_TYPES].sort());
  });
});

describe('toNotificationSettings', () => {
  it('묶인 알림이 모두 켜져 있을 때만 그 토글을 켜짐으로 본다', () => {
    const types = { ...allKeys(true), BUNDLE_LIKED: false, DRAFT_ACTIVITY: false };

    expect(toNotificationSettings({ enabled: true, types })).toEqual({
      push: true,
      types: { bundle: false, member: true, follow: true, reaction: false },
    });
  });

  it('앱 푸시 전체는 서버 enabled를 그대로 쓴다', () => {
    expect(toNotificationSettings({ enabled: false, types: allKeys(true) }).push).toBe(false);
  });

  it('서버가 키를 주지 않으면 기본값인 켜짐으로 본다', () => {
    expect(toNotificationSettings({ enabled: true, types: {} }).types).toEqual({
      bundle: true,
      member: true,
      follow: true,
      reaction: true,
    });
  });

  it('토글이 없는 알림(9·14~16번)이 꺼져 있어도 토글에는 영향이 없다', () => {
    const types = { ...allKeys(true), MEMBER_REMOVED: false, BUNCH_DELETED: false };

    expect(toNotificationSettings({ enabled: true, types }).types).toEqual({
      bundle: true,
      member: true,
      follow: true,
      reaction: true,
    });
  });
});

describe('patch 만들기', () => {
  it('앱 푸시 전체 변경은 enabled만 보낸다', () => {
    expect(pushPatch(false)).toEqual({ enabled: false });
  });

  it.each(NOTIFICATION_TYPES)(
    '%s 토글 변경은 묶인 키를 모두 같은 값으로 보내고 전체는 보내지 않는다',
    (type) => {
      const patch = typePatch(type, false);

      expect(patch.enabled).toBeUndefined();
      expect(Object.keys(patch.types ?? {})).toEqual([...NOTIFICATION_TYPE_KEYS[type]]);
      expect(Object.values(patch.types ?? {}).every((value) => value === false)).toBe(true);
    },
  );
});

describe('applyPreferencePatch', () => {
  const current: PushPreferences = { enabled: true, types: allKeys(true) };

  it('보낸 값만 바꾸고 나머지는 지금 값을 유지한다', () => {
    const next = applyPreferencePatch(current, typePatch('follow', false));

    expect(next.enabled).toBe(true);
    expect(next.types.BUNCH_FOLLOWED).toBe(false);
    expect(next.types.DRAFT_ACTIVITY).toBe(true);
    // 원본은 바꾸지 않음
    expect(current.types.BUNCH_FOLLOWED).toBe(true);
  });

  it('전체 수신만 바꾸면 알림 종류는 그대로 둔다', () => {
    const next = applyPreferencePatch(current, pushPatch(false));

    expect(next.enabled).toBe(false);
    expect(next.types).toEqual(current.types);
  });
});
