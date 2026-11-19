import { describe, expect, it } from 'vitest';
import { PUSH_PREFERENCE_CATEGORIES } from '@/mocks/db/seed';
import {
  NOTIFICATION_CATEGORY_KEYS,
  applyPreferencePatch,
  pushPatch,
  toNotificationSettings,
  typePatch,
  type PushPreferences,
} from './notificationPreferences';
import { NOTIFICATION_TYPES } from './types';

/** 서버가 주는 4개 카테고리를 모두 같은 값으로 채운 설정 */
const allCategories = (value: boolean): Record<string, boolean> =>
  Object.fromEntries(PUSH_PREFERENCE_CATEGORIES.map((key) => [key, value]));

describe('NOTIFICATION_CATEGORY_KEYS', () => {
  it('토글 4개가 서버 카테고리 4개와 하나씩 짝을 이룬다(서버에 카테고리가 늘면 알 수 있음)', () => {
    expect(Object.values(NOTIFICATION_CATEGORY_KEYS).sort()).toEqual(
      [...PUSH_PREFERENCE_CATEGORIES].sort(),
    );
  });
});

describe('toNotificationSettings', () => {
  it('카테고리 값을 그 토글의 값으로 쓴다', () => {
    const types = { ...allCategories(true), BUNDLE_NEWS: false, REACTION: false };

    expect(toNotificationSettings({ enabled: true, types })).toEqual({
      push: true,
      types: { bundle: false, member: true, follow: true, reaction: false },
    });
  });

  it('앱 푸시 전체는 서버 enabled를 그대로 쓴다', () => {
    expect(toNotificationSettings({ enabled: false, types: allCategories(true) }).push).toBe(false);
  });

  it('서버가 키를 주지 않으면 기본값인 켜짐으로 본다', () => {
    expect(toNotificationSettings({ enabled: true, types: {} }).types).toEqual({
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
    '%s 토글 변경은 그 카테고리만 보내고 전체는 보내지 않는다',
    (type) => {
      expect(typePatch(type, false)).toEqual({
        types: { [NOTIFICATION_CATEGORY_KEYS[type]]: false },
      });
    },
  );
});

describe('applyPreferencePatch', () => {
  const current: PushPreferences = { enabled: true, types: allCategories(true) };

  it('보낸 값만 바꾸고 나머지는 지금 값을 유지한다', () => {
    const next = applyPreferencePatch(current, typePatch('follow', false));

    expect(next.enabled).toBe(true);
    expect(next.types.FOLLOW).toBe(false);
    expect(next.types.BUNDLE_NEWS).toBe(true);
    // 원본은 바꾸지 않음
    expect(current.types.FOLLOW).toBe(true);
  });

  it('전체 수신만 바꾸면 카테고리는 그대로 둔다', () => {
    const next = applyPreferencePatch(current, pushPatch(false));

    expect(next.enabled).toBe(false);
    expect(next.types).toEqual(current.types);
  });
});
