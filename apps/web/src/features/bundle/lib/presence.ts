import type { ApiContract } from '@app/api-core';
import type { components } from '@app/api-core/generated';
import { z } from 'zod';
import { toDomainId } from '@/shared/api/client/ids';
import type { DraftEditing } from './types';

/**
 * 번들 실시간 presence(API 명세 v5 「번들 실시간 공동 편집·이벤트」): 누가 화면을 보는지(members),
 * 어떤 작업을 하는지(editing), 제목·본인 코멘트에 실제로 입력 중인지(typing)
 * 받은 값은 세 배열을 통째로 교체하고(누적 병합 없음), 각 expiresAt이 지나면 서버 방송을 기다리지 않고 화면에서 뺌
 */
const memberId = z.number().int().positive();

export const presenceDataSchema = z.object({
  members: z.array(z.object({ memberId, expiresAt: z.string() })),
  typing: z.array(
    z.object({ memberId, target: z.string(), text: z.string(), expiresAt: z.string() }),
  ),
  editing: z.array(z.object({ memberId, target: z.string(), expiresAt: z.string() })),
}) satisfies z.ZodType<ApiContract<components['schemas']['BundlePresenceData']>>;

export type PresenceData = z.infer<typeof presenceDataSchema>;

/** topic·activity queue로 오는 PRESENCE 이벤트(revision·requestId는 null) */
export const presenceEventSchema = z.object({
  type: z.literal('PRESENCE'),
  data: presenceDataSchema,
});

export const EMPTY_PRESENCE: PresenceData = { members: [], typing: [], editing: [] };

const expiryOf = (expiresAt: string) => Date.parse(expiresAt);

/** 만료되지 않은 항목만 남김(정확히 expiresAt에 도달하면 만료, 시각을 읽지 못하면 버림) */
export const activePresence = (data: PresenceData, nowMs: number): PresenceData => ({
  members: data.members.filter((item) => expiryOf(item.expiresAt) > nowMs),
  typing: data.typing.filter((item) => expiryOf(item.expiresAt) > nowMs),
  editing: data.editing.filter((item) => expiryOf(item.expiresAt) > nowMs),
});

/** 가장 먼저 만료되는 시각(ms), 항목이 없으면 undefined */
export const nextExpiry = (data: PresenceData): number | undefined => {
  const times = [...data.members, ...data.typing, ...data.editing]
    .map((item) => expiryOf(item.expiresAt))
    .filter((time) => !Number.isNaN(time));
  return times.length === 0 ? undefined : Math.min(...times);
};

const unique = (ids: readonly string[]) => [...new Set(ids)];

/** `PHOTO:901`·`LOCATION:301`처럼 항목 id가 붙은 target에서 id를 읽음(형식이 다르면 undefined) */
const ITEM_PATTERN = { PHOTO: /^PHOTO:([1-9][0-9]*)$/, LOCATION: /^LOCATION:([1-9][0-9]*)$/ };
const itemId = (target: string, kind: 'PHOTO' | 'LOCATION'): string | undefined =>
  ITEM_PATTERN[kind].exec(target)?.[1];

export type DraftPresence = {
  /** 지금 이 초안에 들어와 있는 멤버(멤버 카드의 초록 점) */
  viewingMemberIds: readonly string[];
  editing: DraftEditing;
};

/**
 * 서버 presence를 화면 모델로 바꿈. 제목·코멘트는 실제 입력(typing)만 보이고, 사진은 열린 화면과 진행 작업을 한곳에 모음
 * 픽·공개 범위·참여자 작업은 표시하지 않음. 모든 표시는 편집을 잠그지 않음(기능 spec 4.3.13)
 */
export const toDraftPresence = (data: PresenceData): DraftPresence => {
  const typing = (target: 'TITLE' | 'COMMENT') =>
    unique(
      data.typing.filter((item) => item.target === target).map((item) => toDomainId(item.memberId)),
    );
  const editing = (match: (_target: string) => boolean) =>
    unique(
      data.editing.filter((item) => match(item.target)).map((item) => toDomainId(item.memberId)),
    );

  const locationEditors: Record<string, string[]> = {};
  for (const item of data.editing) {
    const id = itemId(item.target, 'LOCATION');
    if (id === undefined) continue;
    locationEditors[id] = unique([...(locationEditors[id] ?? []), toDomainId(item.memberId)]);
  }
  const commentTexts: Record<string, string> = {};
  for (const item of data.typing) {
    if (item.target === 'COMMENT') commentTexts[toDomainId(item.memberId)] = item.text;
  }

  return {
    viewingMemberIds: unique(data.members.map((item) => toDomainId(item.memberId))),
    editing: {
      titleMemberIds: typing('TITLE'),
      commentMemberIds: typing('COMMENT'),
      commentTexts,
      photoMemberIds: editing(
        (target) => target === 'PHOTOS' || itemId(target, 'PHOTO') !== undefined,
      ),
      locationAddMemberIds: editing((target) => target === 'LOCATION'),
      locationEditors,
      dateMemberIds: editing((target) => target === 'DATE'),
    },
  };
};
